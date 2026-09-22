import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { situationFactureSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const devis = await prisma.devis.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(devis, businessId);

    const situations = await prisma.situationFacture.findMany({
      where: { devisId: params.id },
      orderBy: { numero: "asc" },
    });
    return NextResponse.json({ situations });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const devis = await assertOwnedByBusiness(await prisma.devis.findUnique({ where: { id: params.id } }), businessId);

    if (devis.status !== "accepte") {
      return NextResponse.json(
        { error: "La facturation de situation n'est disponible que pour un devis accepté." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = situationFactureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const count = await prisma.situationFacture.count({ where: { devisId: params.id } });

    const situation = await prisma.situationFacture.create({
      data: {
        devisId: params.id,
        businessId,
        numero: count + 1,
        pourcentageAvancement: parsed.data.pourcentageAvancement,
        montantHT: parsed.data.montantHT,
      },
    });
    return NextResponse.json({ situation }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
