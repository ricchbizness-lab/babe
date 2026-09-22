import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attestationTvaSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);
    const attestations = await prisma.attestationTVA.findMany({
      where: { businessId },
      include: { client: { select: { id: true, name: true } }, devis: { select: { id: true, label: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ attestations });
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
    const parsed = attestationTvaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: parsed.data.clientId }, select: { businessId: true } });
    if (!client || client.businessId !== businessId) {
      return NextResponse.json({ error: "Client introuvable ou non autorisé" }, { status: 403 });
    }
    if (parsed.data.devisId) {
      const devis = await prisma.devis.findUnique({ where: { id: parsed.data.devisId }, select: { businessId: true } });
      if (!devis || devis.businessId !== businessId) {
        return NextResponse.json({ error: "Devis introuvable ou non autorisé" }, { status: 403 });
      }
    }

    const attestation = await prisma.attestationTVA.create({
      data: { ...parsed.data, businessId },
      include: { client: { select: { id: true, name: true } }, devis: { select: { id: true, label: true } } },
    });
    return NextResponse.json({ attestation }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
