import { prisma } from "@/lib/prisma";

/**
 * Données exposées publiquement par le portail client — jamais de données
 * financières (devis, montants), jamais le transcript brut d'un rapport
 * vocal, jamais d'information sur un autre chantier. Utilisé à la fois par
 * la route GET /api/portal/[token] et par la page app/portail/[token] pour
 * qu'il n'existe qu'un seul endroit qui décide ce qui est public.
 */
export async function getPortalData(token: string) {
  const project = await prisma.project.findUnique({
    where: { portalToken: token },
    select: {
      name: true,
      status: true,
      business: { select: { name: true } },
      tasks: {
        select: { id: true, text: true, done: true },
        orderBy: { createdAt: "desc" },
      },
      voiceReports: {
        select: { id: true, authorLabel: true, summary: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return project;
}

export type PortalData = NonNullable<Awaited<ReturnType<typeof getPortalData>>>;
