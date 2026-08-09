import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { devisUpdateSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.devis.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    const body = await req.json();
    const parsed = devisUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const devis = await prisma.devis.update({
      where: { id: params.id, businessId },
      data: parsed.data,
    });
    return NextResponse.json({ devis });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.devis.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    await prisma.devis.delete({ where: { id: params.id, businessId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
