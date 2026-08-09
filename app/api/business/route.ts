import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { businessSchema } from "@/lib/validation";
import { requireSession, ownershipErrorToStatus } from "@/lib/ownership";

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
    const business = await prisma.business.upsert({
      where: { userId },
      update: parsed.data,
      create: { ...parsed.data, userId },
    });

    return NextResponse.json({ business });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
