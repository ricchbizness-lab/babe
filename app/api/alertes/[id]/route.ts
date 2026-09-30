import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { alerteUpdateSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.alerte.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    const body = await req.json();
    const parsed = alerteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const alerte = await prisma.alerte.update({ where: { id: params.id, businessId }, data: parsed.data });
    return NextResponse.json({ alerte });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
