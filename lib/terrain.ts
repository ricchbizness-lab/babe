import { prisma } from "@/lib/prisma";

/**
 * Données du portail terrain public (/terrain/[teamMemberId]/[token]) — le
 * collaborateur n'a pas de compte NOVA, l'accès est protégé uniquement par
 * la possession du lien (même principe que le portail client). On ne
 * renvoie que les affectations du jour du collaborateur concerné, jamais
 * celles d'un autre.
 */
export async function getTerrainData(teamMemberId: string, token: string) {
  const member = await prisma.teamMember.findUnique({
    where: { id: teamMemberId },
    select: { id: true, name: true, terrainToken: true, businessId: true },
  });
  if (!member || !member.terrainToken || member.terrainToken !== token) return null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const assignments = await prisma.assignment.findMany({
    where: { teamMemberId, date: { gte: todayStart, lte: todayEnd } },
    include: { project: { select: { id: true, name: true, address: true } } },
    orderBy: { date: "asc" },
  });

  const pointages = assignments.length
    ? await prisma.pointage.findMany({
        where: { assignmentId: { in: assignments.map((a) => a.id) } },
        orderBy: { timestamp: "asc" },
      })
    : [];

  return {
    member: { id: member.id, name: member.name },
    assignments,
    pointages,
  };
}

export type TerrainData = NonNullable<Awaited<ReturnType<typeof getTerrainData>>>;
