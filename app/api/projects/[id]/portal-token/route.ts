import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.project.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    const token = crypto.randomUUID();
    await prisma.project.update({
      where: { id: params.id, businessId },
      data: { portalToken: token },
    });

    const url = `${new URL(req.url).origin}/portail/${token}`;
    return NextResponse.json({ token, url });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
