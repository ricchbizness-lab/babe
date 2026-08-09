import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";
import { z } from "zod";

// Seule transition possible via cette route : "brouillon" -> "en_relecture".
// Passer à "envoye" nécessite reviewedBy renseigné — volontairement non
// exposé ici en self-service : cette transition doit rester une action
// consciente, pas un bouton client comme les autres. À implémenter dans un
// futur back-office interne une fois un vrai comptable partenaire en place,
// jamais côté client.
const patchSchema = z.object({ status: z.literal("en_relecture") });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.strategicReport.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Transition non autorisée depuis cette route" }, { status: 400 });
    }

    const report = await prisma.strategicReport.update({
      where: { id: params.id, businessId },
      data: { status: "en_relecture" },
    });
    return NextResponse.json({ report });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * Envoi effectif du rapport — la SEULE route qui peut faire passer un
 * rapport au statut "envoye". Impossible sans renseigner `reviewedBy` :
 * c'est un garde-fou technique, pas une convention qu'on pourrait oublier
 * d'appliquer. Si `reviewedBy` est vide, la requête échoue, point.
 */
const sendSchema = z.object({
  reviewedBy: z.string().min(1, "Le nom du relecteur est obligatoire pour envoyer ce rapport."),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.strategicReport.findUnique({ where: { id: params.id } });
    const report = await assertOwnedByBusiness(existing, businessId);

    const body = await req.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const recipients = [user?.email, business?.accountantEmail].filter(
      (e): e is string => Boolean(e)
    );
    if (recipients.length === 0) {
      return NextResponse.json({ error: "Aucun destinataire disponible (email utilisateur ou comptable manquant)" }, { status: 400 });
    }

    try {
      await sendEmail(
        recipients,
        `Rapport de synthèse — ${business?.name} — ${report.period}`,
        `<div style="font-family:sans-serif; white-space:pre-wrap;">${report.content}</div>
         <p style="color:#888; font-size:12px;">Relu par : ${parsed.data.reviewedBy}</p>`
      );
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Échec de l'envoi" },
        { status: 502 }
      );
    }

    const updated = await prisma.strategicReport.update({
      where: { id: params.id, businessId },
      data: { status: "envoye", reviewedBy: parsed.data.reviewedBy, reviewedAt: new Date() },
    });

    return NextResponse.json({ report: updated });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
