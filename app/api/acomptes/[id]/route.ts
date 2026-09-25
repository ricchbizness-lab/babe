import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { acompteUpdateSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    await assertOwnedByBusiness(await prisma.acompte.findUnique({ where: { id: params.id } }), businessId);

    const body = await req.json();
    const parsed = acompteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const acompte = await prisma.acompte.update({
      where: { id: params.id, businessId },
      data: parsed.data,
    });
    return NextResponse.json({ acompte });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    await assertOwnedByBusiness(await prisma.acompte.findUnique({ where: { id: params.id } }), businessId);

    await prisma.acompte.delete({ where: { id: params.id, businessId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
