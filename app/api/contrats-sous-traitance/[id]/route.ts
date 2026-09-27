import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contratSousTraitanceUpdateSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.contratSousTraitance.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    const body = await req.json();
    const parsed = contratSousTraitanceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    if (parsed.data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
      if (!project || project.businessId !== businessId) {
        return NextResponse.json({ error: "Chantier invalide" }, { status: 400 });
      }
    }
    if (parsed.data.devisId) {
      const devis = await prisma.devis.findUnique({ where: { id: parsed.data.devisId } });
      if (!devis || devis.businessId !== businessId) {
        return NextResponse.json({ error: "Devis invalide" }, { status: 400 });
      }
    }

    const contrat = await prisma.contratSousTraitance.update({
      where: { id: params.id, businessId },
      data: {
        ...parsed.data,
        dateDebut: parsed.data.dateDebut ? new Date(parsed.data.dateDebut) : undefined,
        dateFin: parsed.data.dateFin ? new Date(parsed.data.dateFin) : undefined,
      },
      include: {
        sousTraitant: { select: { id: true, name: true, specialty: true } },
        project: { select: { id: true, name: true } },
        devis: { select: { id: true, label: true } },
      },
    });
    return NextResponse.json({ contrat });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.contratSousTraitance.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    await prisma.contratSousTraitance.delete({ where: { id: params.id, businessId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
