import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireBusinessId, ForbiddenError, ownershipErrorToStatus } from "@/lib/ownership";
import { assignmentUpdateSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

    const body = await req.json();
    const parsed = assignmentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // Si un projectId est fourni, vérifier qu'il appartient bien à la même entreprise
    // (sinon on pourrait rattacher l'affectation au chantier de quelqu'un d'autre).
    if (parsed.data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
      if (!project || project.businessId !== businessId) {
        return NextResponse.json({ error: "Chantier invalide" }, { status: 400 });
      }
    }

    const assignment = await prisma.assignment.update({
      where: { id: params.id, teamMember: { businessId } },
      data: {
        ...parsed.data,
        date: parsed.data.date ? new Date(parsed.data.date) : undefined,
      },
      include: { teamMember: true, project: true },
    });
    return NextResponse.json({ assignment });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

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
