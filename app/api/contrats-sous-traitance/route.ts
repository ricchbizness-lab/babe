import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contratSousTraitanceSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);
    const contrats = await prisma.contratSousTraitance.findMany({
      where: { businessId },
      include: {
        sousTraitant: { select: { id: true, name: true, specialty: true } },
        project: { select: { id: true, name: true } },
        devis: { select: { id: true, label: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ contrats });
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
    const parsed = contratSousTraitanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const sousTraitant = await prisma.sousTraitant.findUnique({ where: { id: parsed.data.sousTraitantId } });
    if (!sousTraitant || sousTraitant.businessId !== businessId) {
      return NextResponse.json({ error: "Sous-traitant invalide" }, { status: 400 });
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

    const contrat = await prisma.contratSousTraitance.create({
      data: {
        sousTraitantId: parsed.data.sousTraitantId,
        projectId: parsed.data.projectId,
        devisId: parsed.data.devisId,
        description: parsed.data.description,
        montantHT: parsed.data.montantHT,
        statut: parsed.data.statut,
        dateDebut: parsed.data.dateDebut ? new Date(parsed.data.dateDebut) : undefined,
        dateFin: parsed.data.dateFin ? new Date(parsed.data.dateFin) : undefined,
        businessId,
      },
      include: {
        sousTraitant: { select: { id: true, name: true, specialty: true } },
        project: { select: { id: true, name: true } },
        devis: { select: { id: true, label: true } },
      },
    });
    return NextResponse.json({ contrat }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
