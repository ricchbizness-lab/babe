import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { purchaseUpdateSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.purchase.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    const body = await req.json();
    const parsed = purchaseUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    if (parsed.data.supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: parsed.data.supplierId } });
      if (!supplier || supplier.businessId !== businessId) {
        return NextResponse.json({ error: "Fournisseur invalide" }, { status: 400 });
      }
    }
    if (parsed.data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
      if (!project || project.businessId !== businessId) {
        return NextResponse.json({ error: "Chantier invalide" }, { status: 400 });
      }
    }

    const purchase = await prisma.purchase.update({
      where: { id: params.id, businessId },
      data: {
        ...parsed.data,
        orderDate: parsed.data.orderDate ? new Date(parsed.data.orderDate) : undefined,
        expectedDate: parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : undefined,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ purchase });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.purchase.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    await prisma.purchase.delete({ where: { id: params.id, businessId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
