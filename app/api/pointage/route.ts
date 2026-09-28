import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pointageSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

/**
 * POST est public — volontairement AUCUN requireSession, même principe que
 * /api/portal/[token] et /api/signature/[token] : le collaborateur pointe
 * depuis son téléphone sans compte NOVA, le lien (teamMemberId + token) fait
 * office d'autorisation.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = pointageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const member = await prisma.teamMember.findUnique({ where: { id: parsed.data.teamMemberId } });
  if (!member || !member.terrainToken || member.terrainToken !== parsed.data.token) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }

  const assignment = await prisma.assignment.findUnique({ where: { id: parsed.data.assignmentId } });
  if (!assignment || assignment.teamMemberId !== member.id) {
    return NextResponse.json({ error: "Affectation invalide" }, { status: 400 });
  }

  const pointage = await prisma.pointage.create({
    data: {
      teamMemberId: member.id,
      businessId: member.businessId,
      assignmentId: assignment.id,
      type: parsed.data.type,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      timestamp: new Date(),
    },
  });
  return NextResponse.json({ pointage }, { status: 201 });
}

/** GET est protégé (dashboard) — pointages du jour de toute l'équipe, pour /dashboard/planning/dispatch. */
export async function GET() {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const pointages = await prisma.pointage.findMany({
      where: { businessId, timestamp: { gte: todayStart, lte: todayEnd } },
      include: { assignment: { include: { project: { select: { id: true, name: true } } } } },
      orderBy: { timestamp: "asc" },
    });
    return NextResponse.json({ pointages });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
