import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateAgentText } from "@/lib/agent";
import { sendEmail } from "@/lib/email";
import { computeInvoiceAmounts } from "@/lib/facturation";
import { daysSinceSent } from "@/lib/relance";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";
import { checkRateLimit, getRequestKey } from "@/lib/rateLimit";

const relanceSendSchema = z.object({ devisId: z.string() });

const PAYMENT_TERMS_DAYS = 30;

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Génération IA non configurée pour le moment — clé Anthropic manquante." },
        { status: 503 }
      );
    }

    const { userId } = await requireSession();

    const key = `relance:${getRequestKey(req)}:${userId}`;
    if (!checkRateLimit(key, 10, 60_000)) {
      return NextResponse.json({ error: "Trop de requêtes, réessayez dans un instant." }, { status: 429 });
    }

    const businessId = await requireBusinessId(userId);

    const body = await req.json();
    const parsed = relanceSendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const devis = await assertOwnedByBusiness(
      await prisma.devis.findUnique({ where: { id: parsed.data.devisId }, include: { client: true } }),
      businessId
    );

    if (!devis.client?.email) {
      return NextResponse.json({ error: "Ce client n'a pas d'adresse email renseignée." }, { status: 400 });
    }

    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription || subscription.status !== "active") {
      return NextResponse.json({ error: "Abonnement inactif" }, { status: 402 });
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return NextResponse.json({ error: "Profil entreprise introuvable" }, { status: 404 });
    }

    const isFacture = devis.status === "accepte";
    const module = isFacture ? "relance" : "relance_devis";
    const amounts = computeInvoiceAmounts(devis.amount);

    const input = isFacture
      ? {
          client: devis.client.name,
          montant: amounts ? `${amounts.ttc.toLocaleString("fr-FR")} €` : "",
          joursRetard: Math.max(0, daysSinceSent(devis.updatedAt.toISOString()) - PAYMENT_TERMS_DAYS),
        }
      : {
          client: devis.client.name,
          devis: devis.label,
          montant: devis.amount != null ? `${devis.amount.toLocaleString("fr-FR")} €` : "",
          joursDepuisEnvoi: daysSinceSent(devis.updatedAt.toISOString()),
        };

    const text = await generateAgentText(business, module, input);

    await sendEmail(
      [devis.client.email],
      isFacture ? `Rappel de paiement — ${devis.label}` : `Relance — ${devis.label}`,
      `<div style="font-family:sans-serif; white-space:pre-wrap;">${text}</div>`
    );

    return NextResponse.json({ sent: true, message: text });
  } catch (err) {
    console.error("Erreur /api/relances:", err);
    const { status, message } = ownershipErrorToStatus(err);
    if (status !== 500) return NextResponse.json({ error: message }, { status });
    return NextResponse.json({ error: "Erreur lors de l'envoi de la relance" }, { status: 500 });
  }
}
