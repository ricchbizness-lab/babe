import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);
    const search = new URL(req.url).searchParams.get("search")?.trim();
    const projects = await prisma.project.findMany({
      where: search
        ? { businessId, name: { contains: search, mode: "insensitive" } }
        : { businessId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: search ? 8 : undefined,
    });
    return NextResponse.json({ projects });
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
    const parsed = projectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // Si un clientId est fourni, vérifier qu'il appartient bien à la même entreprise
    // (sinon on pourrait rattacher un chantier au client de quelqu'un d'autre).
    if (parsed.data.clientId) {
      const client = await prisma.client.findUnique({ where: { id: parsed.data.clientId } });
      if (!client || client.businessId !== businessId) {
        return NextResponse.json({ error: "Client invalide" }, { status: 400 });
      }
    }

    const project = await prisma.project.create({
      data: {
        ...parsed.data,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        businessId,
      },
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
