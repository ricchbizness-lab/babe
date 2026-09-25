import { prisma } from "@/lib/prisma";
import { computeDevisTotals } from "@/lib/devisTotals";

/**
 * Données exposées publiquement par le portail client — jamais de données
 * financières internes (marge, achats), jamais d'information sur un autre
 * client ou un autre chantier. Utilisé à la fois par la route
 * GET /api/portal/[token] et par la page app/portail/[token] pour qu'il
 * n'existe qu'un seul endroit qui décide ce qui est public.
 *
 * Le devis rattaché est le dernier devis accepté du client du chantier — le
 * modèle Devis n'a pas de lien direct vers Project, seulement vers Client,
 * donc si un même client a plusieurs chantiers avec chacun un devis accepté,
 * seul le plus récent est montré ici.
 */
export async function getPortalData(token: string) {
  const project = await prisma.project.findUnique({
    where: { portalToken: token },
    select: {
      name: true,
      status: true,
      clientId: true,
      business: {
        select: { name: true, logoBase64: true, user: { select: { email: true } } },
      },
      tasks: {
        select: { id: true, text: true, done: true, dueDate: true },
        orderBy: { createdAt: "desc" },
      },
      voiceReports: {
        select: { id: true, authorLabel: true, summary: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      photos: {
        select: { id: true, imageBase64: true, caption: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!project) return null;

  const acceptedDevis = project.clientId
    ? await prisma.devis.findFirst({
        where: { clientId: project.clientId, status: "accepte" },
        orderBy: { updatedAt: "desc" },
        include: { lines: true, acomptes: { orderBy: { createdAt: "asc" } } },
      })
    : null;

  const devis = acceptedDevis
    ? {
        id: acceptedDevis.id,
        label: acceptedDevis.label,
        paymentStatus: acceptedDevis.paymentStatus,
        // Même convention que le reste de la facturation : montant TTC
        // recalculé depuis les lignes détaillées si elles existent, sinon
        // approximation forfaitaire à 20% de TVA sur le montant global.
        montantTTC:
          acceptedDevis.lines.length > 0
            ? computeDevisTotals(acceptedDevis.lines, acceptedDevis.remise || 0).totalTTC
            : (acceptedDevis.amount || 0) * 1.2,
        acomptes: acceptedDevis.acomptes.map((a) => ({
          id: a.id,
          pourcentage: a.pourcentage,
          montantHT: a.montantHT,
          statut: a.statut,
        })),
      }
    : null;

  return {
    name: project.name,
    status: project.status,
    business: {
      name: project.business.name,
      logoBase64: project.business.logoBase64,
      email: project.business.user.email,
    },
    tasks: project.tasks,
    voiceReports: project.voiceReports,
    photos: project.photos,
    devis,
  };
}

export type PortalData = NonNullable<Awaited<ReturnType<typeof getPortalData>>>;

/**
 * Données du devis accepté rattaché au client, pour l'aperçu imprimable
 * public du portail (/portail/[token]/devis) — séparé de getPortalData()
 * car il porte des champs (lignes détaillées, coordonnées légales de
 * l'entreprise) qu'on ne veut pas renvoyer dans le payload JSON général du
 * portail.
 */
export async function getPortalDevisPrintData(token: string) {
  const project = await prisma.project.findUnique({
    where: { portalToken: token },
    select: {
      clientId: true,
      business: {
        select: { name: true, siret: true, address: true, logoBase64: true, conditionsPaiement: true },
      },
    },
  });
  if (!project?.clientId) return null;

  const devis = await prisma.devis.findFirst({
    where: { clientId: project.clientId, status: "accepte" },
    orderBy: { updatedAt: "desc" },
    include: {
      lines: true,
      client: { select: { name: true, email: true, phone: true, address: true } },
    },
  });
  if (!devis) return null;

  return { devis, business: project.business };
}
