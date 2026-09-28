import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { signatureSubmitSchema } from "@/lib/validation";

/**
 * Route publique — volontairement AUCUN requireSession ici, même principe
 * que /api/portal/[token] : le client final signe sans compte NOVA.
 */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = signatureSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const signatureRequest = await prisma.signatureRequest.findUnique({
    where: { token: params.token },
    include: {
      devis: { select: { id: true, label: true, client: { select: { name: true } } } },
      business: { select: { user: { select: { email: true } } } },
    },
  });
  if (!signatureRequest) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }
  if (signatureRequest.signedAt) {
    return NextResponse.json({ error: "Ce devis a déjà été signé." }, { status: 400 });
  }

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const signedAt = new Date();

  await prisma.$transaction([
    prisma.signatureRequest.update({
      where: { token: params.token },
      data: { signedAt, signatureData: parsed.data.signatureData, ipAddress },
    }),
    prisma.devis.update({ where: { id: signatureRequest.devis.id }, data: { status: "accepte" } }),
  ]);

  // La confirmation par email est une bonne pratique, pas une condition de
  // succès de la signature elle-même — un échec d'envoi (Resend non
  // configuré, panne...) ne doit jamais faire échouer la signature déjà
  // enregistrée en base.
  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmail(
        [signatureRequest.business.user.email],
        `Devis « ${signatureRequest.devis.label} » signé`,
        `<div style="font-family:sans-serif;">
          <p>Le devis <strong>${signatureRequest.devis.label}</strong> a été signé électroniquement par
          ${signatureRequest.devis.client?.name || "le client"} le ${signedAt.toLocaleString("fr-FR")}.</p>
        </div>`
      );
    } catch (err) {
      console.error("Erreur envoi email de confirmation de signature:", err);
    }
  }

  return NextResponse.json({ success: true });
}
