import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignmentSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

// Assignment n'a pas de businessId direct (voir schema.prisma) — le
// périmètre entreprise passe systématiquement par teamMember.businessId.

export async function GET(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = { teamMember: { businessId } };
    if (projectId) where.projectId = projectId;
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      where.date = { gte: start, lt: end };
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        teamMember: { select: { id: true, name: true, role: true } },
        project: { select: { id: true, name: true, status: true } },
      },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ assignments });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);
    const body = await req.json();
    const parsed = assignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const teamMember = await prisma.teamMember.findUnique({ where: { id: parsed.data.teamMemberId } });
    if (!teamMember || teamMember.businessId !== businessId) {
      return NextResponse.json({ error: "Collaborateur invalide" }, { status: 400 });
    }

    if (parsed.data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
      if (!project || project.businessId !== businessId) {
        return NextResponse.json({ error: "Chantier invalide" }, { status: 400 });
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        teamMemberId: parsed.data.teamMemberId,
        projectId: parsed.data.projectId,
        date: new Date(parsed.data.date),
        note: parsed.data.note,
      },
      include: {
        teamMember: { select: { id: true, name: true, role: true } },
        project: { select: { id: true, name: true, status: true } },
      },
    });
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
