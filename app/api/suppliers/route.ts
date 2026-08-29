import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);
    const suppliers = await prisma.supplier.findMany({
      where: { businessId },
      include: { purchases: { select: { amount: true, status: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ suppliers });
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
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: { ...parsed.data, businessId },
    });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
