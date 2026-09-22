import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ouvrageTypeSchema } from "@/lib/validation";
import { OUVRAGES_SEED } from "@/lib/ouvragesSeed";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(_req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const count = await prisma.ouvrageType.count({ where: { businessId } });
    if (count === 0) {
      // Premier accès à la bibliothèque pour cette entreprise — on la
      // pré-remplit avec un catalogue d'ouvrages BTP courants plutôt que de
      // laisser une page blanche (règle CLAUDE.md).
      await prisma.ouvrageType.createMany({
        data: OUVRAGES_SEED.map((o) => ({ ...o, businessId })),
      });
    }

    const ouvrages = await prisma.ouvrageType.findMany({
      where: { businessId },
      orderBy: { label: "asc" },
    });
    return NextResponse.json({ ouvrages });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const body = await req.json();
    const parsed = ouvrageTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const ouvrage = await prisma.ouvrageType.create({
      data: { ...parsed.data, businessId },
    });
    return NextResponse.json({ ouvrage }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
