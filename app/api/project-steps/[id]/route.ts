import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectStepUpdateSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ForbiddenError, ownershipErrorToStatus } from "@/lib/ownership";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.projectStep.findUnique({ where: { id: params.id }, include: { project: true } });
    if (!existing || existing.project.businessId !== businessId) {
      throw new ForbiddenError("Ressource introuvable ou non autorisée");
    }

    const body = await req.json();
    const parsed = projectStepUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const step = await prisma.projectStep.update({
      where: { id: params.id, project: { businessId } },
      data: parsed.data,
    });
    return NextResponse.json({ step });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.projectStep.findUnique({ where: { id: params.id }, include: { project: true } });
    if (!existing || existing.project.businessId !== businessId) {
      throw new ForbiddenError("Ressource introuvable ou non autorisée");
    }

    await prisma.projectStep.delete({ where: { id: params.id, project: { businessId } } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
