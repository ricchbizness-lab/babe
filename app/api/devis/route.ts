import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { devisSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);
    const search = new URL(req.url).searchParams.get("search")?.trim();
    const devis = await prisma.devis.findMany({
      where: search
        ? { businessId, label: { contains: search, mode: "insensitive" } }
        : { businessId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: search ? 8 : 100, // pagination simple — évite un payload illimité qui grossit avec l'usage
    });
    return NextResponse.json({ devis });
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
    const parsed = devisSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    if (parsed.data.clientId) {
      const client = await prisma.client.findUnique({ where: { id: parsed.data.clientId } });
      if (!client || client.businessId !== businessId) {
        return NextResponse.json({ error: "Client invalide" }, { status: 400 });
      }
    }

    // Le contenu texte du devis (via l'agent IA, module "devis") est généré
    // séparément par /api/agent — ici on enregistre la structure de base.
    const devis = await prisma.devis.create({
      data: {
        label: parsed.data.label,
        clientId: parsed.data.clientId,
        description: parsed.data.description,
        amount: parsed.data.amount,
        content: parsed.data.content || "",
        remise: parsed.data.remise,
        notesDevis: parsed.data.notesDevis,
        businessId,
        lines: parsed.data.lines ? { create: parsed.data.lines } : undefined,
      },
      include: { lines: true },
    });
    return NextResponse.json({ devis }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
