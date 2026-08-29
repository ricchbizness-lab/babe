import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { purchaseSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);
    const purchases = await prisma.purchase.findMany({
      where: { businessId },
      include: {
        supplier: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { orderDate: "desc" },
    });
    return NextResponse.json({ purchases });
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
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: parsed.data.supplierId } });
    if (!supplier || supplier.businessId !== businessId) {
      return NextResponse.json({ error: "Fournisseur invalide" }, { status: 400 });
    }

    if (parsed.data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
      if (!project || project.businessId !== businessId) {
        return NextResponse.json({ error: "Chantier invalide" }, { status: 400 });
      }
    }

    const purchase = await prisma.purchase.create({
      data: {
        supplierId: parsed.data.supplierId,
        projectId: parsed.data.projectId,
        description: parsed.data.description,
        amount: parsed.data.amount,
        status: parsed.data.status,
        orderDate: parsed.data.orderDate ? new Date(parsed.data.orderDate) : undefined,
        expectedDate: parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : undefined,
        businessId,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ purchase }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
