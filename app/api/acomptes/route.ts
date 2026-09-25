import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const acomptes = await prisma.acompte.findMany({
      where: { businessId },
      select: { id: true, devisId: true, pourcentage: true, montantHT: true, statut: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ acomptes });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
