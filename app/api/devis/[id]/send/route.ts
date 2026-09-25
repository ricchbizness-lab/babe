import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

const sendDevisSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

/** Envoi explicite et éditable du devis au client — distinct de "Marquer comme envoyé" (statut seul, email automatique non modifiable). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    await assertOwnedByBusiness(await prisma.devis.findUnique({ where: { id: params.id } }), businessId);

    const body = await req.json();
    const parsed = sendDevisSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Resend n'est pas configuré." }, { status: 503 });
    }

    await sendEmail(
      [parsed.data.to],
      parsed.data.subject,
      `<div style="font-family:sans-serif; white-space:pre-wrap;">${parsed.data.message}</div>`
    );

    const devis = await prisma.devis.update({
      where: { id: params.id, businessId },
      data: { status: "envoye" },
      include: { client: true, lines: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({ devis });
  } catch (err) {
    console.error("Erreur /api/devis/[id]/send:", err);
    const { status, message } = ownershipErrorToStatus(err);
    if (status !== 500) return NextResponse.json({ error: message }, { status });
    return NextResponse.json({ error: "Erreur lors de l'envoi du devis" }, { status: 500 });
  }
}
