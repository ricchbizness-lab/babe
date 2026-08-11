import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireBusinessId, ForbiddenError, ownershipErrorToStatus } from "@/lib/ownership";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.assignment.findUnique({
      where: { id: params.id },
      include: { teamMember: true },
    });
    if (!existing || existing.teamMember.businessId !== businessId) {
      throw new ForbiddenError("Ressource introuvable ou non autorisée");
    }

    await prisma.assignment.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
