import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectStepSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const project = await assertOwnedByBusiness(await prisma.project.findUnique({ where: { id: params.id } }), businessId);

    const steps = await prisma.projectStep.findMany({ where: { projectId: project.id }, orderBy: { order: "asc" } });
    return NextResponse.json({ steps });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const project = await assertOwnedByBusiness(await prisma.project.findUnique({ where: { id: params.id } }), businessId);

    const body = await req.json();
    const parsed = projectStepSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // Nouvelle étape ajoutée en fin de liste par défaut si aucun ordre fourni.
    let order = parsed.data.order;
    if (order === undefined) {
      const last = await prisma.projectStep.findFirst({ where: { projectId: project.id }, orderBy: { order: "desc" } });
      order = last ? last.order + 1 : 0;
    }

    const step = await prisma.projectStep.create({
      data: { title: parsed.data.title, status: parsed.data.status, order, projectId: project.id },
    });
    return NextResponse.json({ step }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
