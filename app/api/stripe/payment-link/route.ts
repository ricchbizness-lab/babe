import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";
import { computeDevisTotals } from "@/lib/devisTotals";

const paymentLinkSchema = z.object({
  devisId: z.string(),
  acompteId: z.string().optional(),
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

    if (devis.status !== "accepte") {
      return NextResponse.json({ error: "Ce devis n'est pas éligible au paiement." }, { status: 400 });
    }

    let amountToCharge: number;
    let productName: string;

    if (parsed.data.acompteId) {
      const acompte = await assertOwnedByBusiness(
        await prisma.acompte.findUnique({ where: { id: parsed.data.acompteId } }),
        businessId
      );
      if (acompte.devisId !== devis.id) {
        return NextResponse.json({ error: "Cet acompte n'appartient pas à ce devis." }, { status: 400 });
      }
      if (acompte.statut !== "en_attente") {
        return NextResponse.json({ error: "Cet acompte n'est plus en attente de paiement." }, { status: 400 });
      }
      amountToCharge = acompte.montantHT;
      productName = `Acompte ${acompte.pourcentage}% — ${devis.label}`;
    } else {
      if (devis.amount == null) {
        return NextResponse.json({ error: "Ce devis n'est pas éligible au paiement." }, { status: 400 });
      }
      // Le montant TTC facturé reprend les lignes détaillées si elles existent
      // (remise + TVA par ligne déjà appliquées), sinon le montant saisi tel
      // quel — jamais recalculé.
      amountToCharge = devis.lines.length > 0 ? computeDevisTotals(devis.lines, devis.remise || 0).totalTTC : devis.amount;
      productName = devis.label;
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: productName },
            unit_amount: Math.round(amountToCharge * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard/devis/${devis.id}?payment=success${
        parsed.data.acompteId ? `&acompteId=${parsed.data.acompteId}` : ""
      }`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/devis/${devis.id}?payment=cancel`,
      metadata: { devisId: devis.id, businessId, ...(parsed.data.acompteId ? { acompteId: parsed.data.acompteId } : {}) },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
