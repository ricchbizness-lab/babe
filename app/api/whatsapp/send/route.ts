import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whatsappSendSchema } from "@/lib/validation";
import { sendWhatsappMessage, isInternationalPhone } from "@/lib/whatsapp";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function POST(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const body = await req.json();
    const parsed = whatsappSendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    if (!isInternationalPhone(parsed.data.to)) {
      return NextResponse.json({ error: "Numéro de téléphone invalide — format international attendu (ex. +33612345678)." }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { whatsappPhoneId: true, whatsappToken: true },
    });
    if (!business?.whatsappPhoneId || !business.whatsappToken) {
      return NextResponse.json(
        { error: "WhatsApp Business n'est pas configuré — renseignez vos identifiants dans Paramètres > Intégrations." },
        { status: 400 }
      );
    }

    const result = await sendWhatsappMessage(business.whatsappPhoneId, business.whatsappToken, parsed.data.to, parsed.data.message);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
