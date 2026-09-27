import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

/** Génère (ou régénère) le lien terrain d'un collaborateur — même principe que /api/projects/[id]/portal-token pour le portail client. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const existing = await prisma.teamMember.findUnique({ where: { id: params.id } });
    await assertOwnedByBusiness(existing, businessId);

    const token = crypto.randomUUID();
    await prisma.teamMember.update({
      where: { id: params.id, businessId },
      data: { terrainToken: token },
    });

    const url = `${new URL(req.url).origin}/terrain/${params.id}/${token}`;
    return NextResponse.json({ token, url });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
