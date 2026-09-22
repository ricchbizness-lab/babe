import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, PLAN_PRICE_IDS } from "@/lib/stripe";
import { requireSession, ownershipErrorToStatus } from "@/lib/ownership";
import { z } from "zod";

const checkoutSchema = z.object({
  plan: z.enum(["essentiel", "pro", "premium"]),
});

export async function POST(req: Request) {
  try {
    const { userId, session } = await requireSession();
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Palier invalide" }, { status: 400 });
    }

    const priceId = PLAN_PRICE_IDS[parsed.data.plan];
    if (!priceId) {
      return NextResponse.json({ error: "Palier non configuré côté serveur" }, { status: 500 });
    }

    const email = session?.user?.email || undefined;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard?checkout=cancel`,
      metadata: { userId, plan: parsed.data.plan },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
