import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    // Pagination simple par curseur — évite de charger un historique illimité.
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || undefined;

    const documents = await prisma.document.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 20,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    return NextResponse.json({ documents, nextCursor: documents.at(-1)?.id ?? null });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
