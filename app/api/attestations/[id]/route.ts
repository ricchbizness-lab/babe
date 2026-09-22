import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attestationTvaSignSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const attestation = await prisma.attestationTVA.findUnique({
      where: { id: params.id },
      include: {
        client: { select: { id: true, name: true, address: true } },
        devis: { select: { id: true, label: true } },
        business: { select: { name: true, siret: true, address: true, logoBase64: true } },
      },
    });
    await assertOwnedByBusiness(attestation, businessId);
    return NextResponse.json({ attestation });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.attestationTVA.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    const body = await req.json();
    const parsed = attestationTvaSignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const attestation = await prisma.attestationTVA.update({
      where: { id: params.id, businessId },
      data: { signedAt: parsed.data.signed ? new Date() : null },
      include: { client: { select: { id: true, name: true } }, devis: { select: { id: true, label: true } } },
    });
    return NextResponse.json({ attestation });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.attestationTVA.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    await prisma.attestationTVA.delete({ where: { id: params.id, businessId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
