import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.attachment.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    await prisma.attachment.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
