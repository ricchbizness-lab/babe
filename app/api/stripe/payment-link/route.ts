import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";
import { computeDevisTotals } from "@/lib/devisTotals";

const paymentLinkSchema = z.object({
  devisId: z.string(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const body = await req.json();
    const parsed = paymentLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const devis = await assertOwnedByBusiness(
      await prisma.devis.findUnique({ where: { id: parsed.data.devisId }, include: { lines: true } }),
      businessId
    );

    if (devis.status !== "accepte" || devis.amount == null) {
      return NextResponse.json({ error: "Ce devis n'est pas éligible au paiement." }, { status: 400 });
    }

    // Le montant TTC facturé reprend les lignes détaillées si elles existent
    // (remise + TVA par ligne déjà appliquées), sinon le montant saisi tel
    // quel — jamais recalculé.
    const montantTTC =
      devis.lines.length > 0 ? computeDevisTotals(devis.lines, devis.remise || 0).totalTTC : devis.amount;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: devis.label },
            unit_amount: Math.round(montantTTC * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard/devis/${devis.id}?payment=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/devis/${devis.id}?payment=cancel`,
      metadata: { devisId: devis.id, businessId },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
