import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateAgentText } from "@/lib/agent";
import { sendEmail } from "@/lib/email";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";
import { checkRateLimit, getRequestKey } from "@/lib/rateLimit";

const bodySchema = z
  .object({
    achatId: z.string(),
    supplierIds: z.array(z.string()).min(1).max(5),
    send: z.boolean().optional().default(false),
    message: z.string().min(1).max(5000).optional(),
  })
  .refine((d) => !d.send || d.message, { message: "Le message à envoyer est requis." });

export async function POST(req: Request) {
  try {
    const { userId } = await requireSession();

    const key = `mise-en-concurrence:${getRequestKey(req)}:${userId}`;
    if (!checkRateLimit(key, 10, 60_000)) {
      return NextResponse.json({ error: "Trop de requêtes, réessayez dans un instant." }, { status: 429 });
    }

    const businessId = await requireBusinessId(userId);

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const achat = await assertOwnedByBusiness(
      await prisma.purchase.findUnique({ where: { id: parsed.data.achatId }, include: { supplier: true } }),
      businessId
    );

    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: parsed.data.supplierIds }, businessId },
    });
    if (suppliers.length !== parsed.data.supplierIds.length) {
      return NextResponse.json({ error: "Un ou plusieurs fournisseurs sont invalides." }, { status: 400 });
    }

    // Envoi d'un message déjà généré et relu — pas de nouvel appel IA.
    if (parsed.data.send) {
      const recipients = suppliers.filter((s) => s.email);
      if (recipients.length === 0) {
        return NextResponse.json({ error: "Aucun des fournisseurs sélectionnés n'a d'email renseigné." }, { status: 400 });
      }
      const sent: string[] = [];
      const failed: string[] = [];
      for (const s of recipients) {
        try {
          await sendEmail(
            [s.email as string],
            `Demande de devis — ${achat.description}`,
            `<div style="font-family:sans-serif; white-space:pre-wrap;">${parsed.data.message}</div>`
          );
          sent.push(s.id);
        } catch (err) {
          console.error(`Échec envoi email mise en concurrence à ${s.email}:`, err);
          failed.push(s.id);
        }
      }
      return NextResponse.json({ sent, failed });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Génération IA non configurée pour le moment — clé Anthropic manquante." },
        { status: 503 }
      );
    }

    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription || subscription.status !== "active") {
      return NextResponse.json({ error: "Abonnement inactif" }, { status: 402 });
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return NextResponse.json({ error: "Profil entreprise introuvable" }, { status: 404 });
    }

    const message = await generateAgentText(business, "mise_en_concurrence", {
      description: achat.description,
      categorie: achat.supplier.category || "non précisée",
      budget: achat.amount ? `${achat.amount.toLocaleString("fr-FR")} €` : undefined,
    });

    return NextResponse.json({ message });
  } catch (err) {
    console.error("Erreur /api/achats/mise-en-concurrence:", err);
    const { status, message } = ownershipErrorToStatus(err);
    if (status !== 500) return NextResponse.json({ error: message }, { status });
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}
