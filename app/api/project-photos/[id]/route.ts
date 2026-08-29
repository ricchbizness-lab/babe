import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireBusinessId, ForbiddenError, ownershipErrorToStatus } from "@/lib/ownership";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.projectPhoto.findUnique({ where: { id: params.id }, include: { project: true } });
    if (!existing || existing.project.businessId !== businessId) {
      throw new ForbiddenError("Ressource introuvable ou non autorisée");
    }

    await prisma.projectPhoto.delete({ where: { id: params.id, project: { businessId } } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
