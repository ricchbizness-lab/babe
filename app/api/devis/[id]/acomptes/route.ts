import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { acompteSchema } from "@/lib/validation";
import { computeDevisTotals } from "@/lib/devisTotals";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    await assertOwnedByBusiness(await prisma.devis.findUnique({ where: { id: params.id } }), businessId);

    const acomptes = await prisma.acompte.findMany({
      where: { devisId: params.id, businessId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ acomptes });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const devis = await assertOwnedByBusiness(
      await prisma.devis.findUnique({ where: { id: params.id }, include: { lines: true } }),
      businessId
    );

    if (devis.status !== "accepte") {
      return NextResponse.json({ error: "Ce devis n'est pas accepté — impossible de demander un acompte." }, { status: 400 });
    }

    const body = await req.json();
    const parsed = acompteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const totalHT = devis.lines.length > 0 ? computeDevisTotals(devis.lines, devis.remise || 0).totalHT : devis.amount || 0;
    const montantHT = totalHT * (parsed.data.pourcentage / 100);

    const acompte = await prisma.acompte.create({
      data: { devisId: devis.id, businessId, pourcentage: parsed.data.pourcentage, montantHT },
    });
    return NextResponse.json({ acompte }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
