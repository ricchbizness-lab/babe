import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const luParam = new URL(req.url).searchParams.get("lu");
    const where: { businessId: string; lu?: boolean } = { businessId };
    if (luParam === "true") where.lu = true;
    if (luParam === "false") where.lu = false;

    const alertes = await prisma.alerte.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ alertes });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
