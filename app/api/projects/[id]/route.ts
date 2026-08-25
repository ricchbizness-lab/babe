import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        tasks: { orderBy: { createdAt: "desc" } },
        voiceReports: { orderBy: { createdAt: "desc" } },
        assignments: { include: { teamMember: true }, orderBy: { date: "desc" } },
      },
    });
    await assertOwnedByBusiness(project, businessId);

    return NextResponse.json({ project });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.project.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    const body = await req.json();
    const parsed = projectSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // Un chantier terminé ou annulé entraîne la mise à jour automatique des
    // tâches (et, pour une annulation, des devis du client) rattachés — le
    // tout dans une seule transaction pour garder projet/tâches/devis
    // cohérents entre eux.
    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id: params.id, businessId },
        data: {
          ...parsed.data,
          startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
          endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        },
      });

      let tasksUpdated = 0;
      let devisUpdated = 0;

      if (parsed.data.status === "termine" || parsed.data.status === "annule") {
        const tasksResult = await tx.task.updateMany({
          where: { projectId: params.id, done: false },
          data: { done: true },
        });
        tasksUpdated = tasksResult.count;
      }

      if (parsed.data.status === "annule" && project.clientId) {
        const devisResult = await tx.devis.updateMany({
          where: { clientId: project.clientId, status: { in: ["brouillon", "envoye"] } },
          data: { status: "refuse" },
        });
        devisUpdated = devisResult.count;
      }

      return { project, tasksUpdated, devisUpdated };
    });

    return NextResponse.json({
      project: result.project,
      tasksUpdated: result.tasksUpdated,
      devisUpdated: result.devisUpdated,
    });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.project.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    await prisma.project.delete({ where: { id: params.id, businessId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
