import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { devisLineUpdateSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ForbiddenError, ownershipErrorToStatus } from "@/lib/ownership";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.devisLine.findUnique({
      where: { id: params.id },
      include: { devis: true },
    });
    if (!existing || existing.devis.businessId !== businessId) {
      throw new ForbiddenError("Ressource introuvable ou non autorisée");
    }

    const body = await req.json();
    const parsed = devisLineUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const line = await prisma.devisLine.update({
      where: { id: params.id, devis: { businessId } },
      data: parsed.data,
    });
    return NextResponse.json({ line });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.devisLine.findUnique({
      where: { id: params.id },
      include: { devis: true },
    });
    if (!existing || existing.devis.businessId !== businessId) {
      throw new ForbiddenError("Ressource introuvable ou non autorisée");
    }

    await prisma.devisLine.delete({ where: { id: params.id, devis: { businessId } } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
