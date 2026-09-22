import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushSubscriptionSchema } from "@/lib/validation";
import { requireSession, ownershipErrorToStatus } from "@/lib/ownership";

export async function POST(req: Request) {
  try {
    const { userId } = await requireSession();

    const body = await req.json();
    const parsed = pushSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // upsert sur endpoint : un même navigateur qui se réabonne (ex. après
    // nettoyage du storage) ne doit pas créer de doublon.
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      update: { userId, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth },
      create: {
        userId,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
    });

    return NextResponse.json({ subscription: { id: subscription.id } }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
