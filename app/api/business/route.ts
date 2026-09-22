import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { businessOnboardingSchema, businessSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";
import { getOuvragesForMetier } from "@/lib/ouvragesByMetier";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const business = await prisma.business.findUnique({ where: { userId } });
    return NextResponse.json({ business });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireSession();
    const body = await req.json();
    const parsed = businessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // upsert scopé sur userId : impossible de créer/modifier le profil
    // entreprise d'un autre utilisateur, par construction.
    const existing = await prisma.business.findUnique({ where: { userId }, select: { id: true, metier: true } });

    const business = await prisma.business.upsert({
      where: { userId },
      update: parsed.data,
      create: { ...parsed.data, userId },
    });

    // Lors de la sélection (ou du changement) du métier, pré-remplit la
    // bibliothèque d'ouvrages si elle est vide — jamais si elle contient déjà
    // des ouvrages, pour ne rien écraser (voir aussi POST /api/ouvrages/apply-metier
    // pour la mise à jour explicite depuis les paramètres).
    if (parsed.data.metier && parsed.data.metier !== existing?.metier) {
      const count = await prisma.ouvrageType.count({ where: { businessId: business.id } });
      if (count === 0) {
        await prisma.ouvrageType.createMany({
          data: getOuvragesForMetier(parsed.data.metier).map((o) => ({ ...o, businessId: business.id })),
        });
      }
    }

    return NextResponse.json({ business });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const body = await req.json();
    const parsed = businessOnboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const business = await prisma.business.update({
      where: { id: businessId },
      data: parsed.data,
    });
    return NextResponse.json({ business });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
