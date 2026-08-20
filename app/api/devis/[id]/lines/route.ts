import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { devisLineSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const devis = await prisma.devis.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(devis, businessId);

    const body = await req.json();
    const parsed = devisLineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const line = await prisma.devisLine.create({
      data: { ...parsed.data, devisId: params.id },
    });
    return NextResponse.json({ line }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
