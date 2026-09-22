import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whatsappTestSchema } from "@/lib/validation";
import { testWhatsappConnection } from "@/lib/whatsapp";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

/**
 * Teste la connexion WhatsApp Business avec les identifiants fournis dans le
 * body (formulaire pas encore enregistré) — ou, à défaut, ceux déjà
 * enregistrés sur l'entreprise. Lecture seule côté Meta, aucun message
 * envoyé.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const body = await req.json().catch(() => ({}));
    const parsed = whatsappTestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    let phoneId = parsed.data.phoneId;
    let token = parsed.data.token;
    if (!phoneId || !token) {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { whatsappPhoneId: true, whatsappToken: true },
      });
      phoneId = phoneId || business?.whatsappPhoneId || undefined;
      token = token || business?.whatsappToken || undefined;
    }
    if (!phoneId || !token) {
      return NextResponse.json({ error: "Renseignez le Phone Number ID et l'access token avant de tester." }, { status: 400 });
    }

    const result = await testWhatsappConnection(phoneId, token);
    if (!result.ok) {
      return NextResponse.json({ connected: false, error: result.error });
    }
    return NextResponse.json({ connected: true, displayName: result.displayName });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
