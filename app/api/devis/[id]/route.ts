import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { devisUpdateSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";
import { sendEmail } from "@/lib/email";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const devis = await prisma.devis.findUnique({
      where: { id: params.id },
      include: { client: true, lines: { orderBy: { createdAt: "asc" } } },
    });
    await assertOwnedByBusiness(devis, businessId);

    return NextResponse.json({ devis });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await assertOwnedByBusiness(await prisma.devis.findUnique({ where: { id: params.id } }), businessId);

    const body = await req.json();
    const parsed = devisUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const devis = await prisma.devis.update({
      where: { id: params.id, businessId },
      data: parsed.data,
      include: { client: true, lines: { orderBy: { createdAt: "asc" } } },
    });

    // Envoi de l'email au client jamais bloquant : un échec Resend ne doit
    // pas empêcher la mise à jour du statut (déjà commitée ci-dessus),
    // seulement être loggé — et signalé au client via un header dédié pour
    // qu'il puisse afficher un avertissement sans dépendre des logs serveur.
    let emailError = false;
    if (parsed.data.status === "envoye" && existing.status !== "envoye" && devis.client?.email) {
      const business = await prisma.business.findUnique({ where: { id: businessId } });
      const businessName = business?.name || "votre artisan";
      try {
        await sendEmail(
          [devis.client.email],
          `Devis ${devis.label} — ${businessName}`,
          `<div style="font-family:sans-serif; white-space:pre-wrap;">
            <p>Bonjour ${devis.client.name},</p>
            <p>Voici le devis « ${devis.label} » établi par ${businessName}.</p>
            <div style="margin:16px 0; padding:16px; background:#f5f5f5; border-radius:8px;">${devis.content}</div>
            <p>N'hésitez pas à nous contacter pour toute question.</p>
          </div>`
        );
      } catch (err) {
        console.error(`Échec de l'envoi de l'email pour le devis ${devis.id}:`, err);
        emailError = true;
      }
    }

    const response = NextResponse.json({ devis });
    if (emailError) response.headers.set("X-Email-Error", "true");
    return response;
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.devis.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    await prisma.devis.delete({ where: { id: params.id, businessId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
