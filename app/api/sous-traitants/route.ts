import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sousTraitantSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);
    const sousTraitants = await prisma.sousTraitant.findMany({
      where: { businessId },
      include: { contrats: { select: { id: true, statut: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ sousTraitants });
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
    const parsed = sousTraitantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const sousTraitant = await prisma.sousTraitant.create({
      data: { ...parsed.data, businessId },
    });
    return NextResponse.json({ sousTraitant }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
