import { prisma } from "./prisma";
import { isPaiementEnRetard } from "./relance";
import type { PeriodRange } from "./dates";

/**
 * Données structurées injectées dans le prompt IA du rapport stratégique
 * (sprint 2, point 1). Toutes les métriques viennent de vraies requêtes
 * Prisma — jamais de valeur inventée. Quand une donnée n'est pas mesurable
 * avec le modèle actuel (ex. délai de paiement, faute de date de paiement
 * dédiée sur Devis), le champ est `null` et une note explique pourquoi,
 * plutôt que d'afficher un chiffre approximatif comme s'il était exact.
 */
export type StrategicReportData = {
  periode: { label: string; debut: string; fin: string };
  resumePeriode: {
    caFacture: number;
    devisCrees: number;
    devisAcceptes: number;
    devisRefuses: number;
    tauxConversionPct: number | null; // devisAcceptes / devisCrees sur la période
    chantiersDemarres: number;
    chantiersTermines: number;
  };
  analyseFinanciere: {
    margeMoyenneParChantier: number | null; // budgetPrevu - achats de la période, moyenne sur les chantiers avec les deux données
    nombreChantiersAvecMarge: number;
    facturesEnRetard: number; // snapshot à la date de génération, pas borné à la période
    montantFacturesEnRetard: number;
    delaiMoyenPaiementJours: number | null;
    delaiMoyenPaiementNote: string | null;
  };
  activiteEquipe: {
    affectations: number;
    rapportsVocaux: number;
    tachesTraitees: number;
  };
};

export async function computeStrategicReportData(businessId: string, range: PeriodRange): Promise<StrategicReportData> {
  const { start, end } = range;

  const [
    devisCreesPeriode,
    devisAcceptesPeriode,
    devisRefusesPeriode,
    chantiersDemarres,
    chantiersTerminesPeriode,
    devisAcceptesTous, // pour retard + délai de paiement, indépendant de la période
    projetsAvecAchats,
    affectations,
    rapportsVocaux,
    tachesTraitees,
  ] = await Promise.all([
    prisma.devis.count({ where: { businessId, createdAt: { gte: start, lt: end } } }),
    prisma.devis.findMany({
      where: { businessId, status: "accepte", updatedAt: { gte: start, lt: end } },
      select: { amount: true },
    }),
    prisma.devis.count({ where: { businessId, status: "refuse", updatedAt: { gte: start, lt: end } } }),
    prisma.project.count({ where: { businessId, startDate: { gte: start, lt: end } } }),
    prisma.project.count({ where: { businessId, status: "termine", updatedAt: { gte: start, lt: end } } }),
    prisma.devis.findMany({
      where: { businessId, status: "accepte" },
      select: { amount: true, paymentStatus: true, updatedAt: true, createdAt: true },
    }),
    prisma.project.findMany({
      where: { businessId, budgetPrevu: { not: null }, purchases: { some: { orderDate: { gte: start, lt: end } } } },
      select: { budgetPrevu: true, purchases: { where: { orderDate: { gte: start, lt: end } }, select: { amount: true } } },
    }),
    prisma.assignment.count({ where: { teamMember: { businessId }, date: { gte: start, lt: end } } }),
    prisma.voiceReport.count({ where: { businessId, createdAt: { gte: start, lt: end } } }),
    prisma.task.count({ where: { businessId, done: true, updatedAt: { gte: start, lt: end } } }),
  ]);

  const caFacture = devisAcceptesPeriode.reduce((sum, d) => sum + (d.amount || 0), 0);
  const devisAcceptesCount = devisAcceptesPeriode.length;
  const tauxConversionPct = devisCreesPeriode > 0 ? Math.round((devisAcceptesCount / devisCreesPeriode) * 1000) / 10 : null;

  const facturesEnRetardList = devisAcceptesTous.filter((d) =>
    isPaiementEnRetard(d.paymentStatus, d.updatedAt.toISOString())
  );
  const montantFacturesEnRetard = facturesEnRetardList.reduce((sum, d) => sum + (d.amount || 0), 0);

  // Délai de paiement : approximation, pas une mesure exacte — voir note ci-dessous.
  const devisPayesPeriode = devisAcceptesTous.filter(
    (d) => d.paymentStatus === "payee" && d.updatedAt >= start && d.updatedAt < end
  );
  let delaiMoyenPaiementJours: number | null = null;
  let delaiMoyenPaiementNote: string | null = null;
  if (devisPayesPeriode.length > 0) {
    const totalJours = devisPayesPeriode.reduce((sum, d) => {
      const jours = (d.updatedAt.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return sum + Math.max(0, jours);
    }, 0);
    delaiMoyenPaiementJours = Math.round(totalJours / devisPayesPeriode.length);
    delaiMoyenPaiementNote =
      "Estimation entre la création du devis et son dernier changement de statut (paiement) — l'application ne distingue pas encore une date de paiement dédiée, donc ce délai inclut aussi le temps de négociation avant acceptation.";
  }

  const margesParChantier = projetsAvecAchats
    .filter((p) => p.budgetPrevu != null)
    .map((p) => {
      const achats = p.purchases.reduce((sum, a) => sum + a.amount, 0);
      return (p.budgetPrevu as number) - achats;
    });
  const margeMoyenneParChantier =
    margesParChantier.length > 0 ? margesParChantier.reduce((sum, m) => sum + m, 0) / margesParChantier.length : null;

  return {
    periode: { label: range.label, debut: start.toISOString().slice(0, 10), fin: new Date(end.getTime() - 1).toISOString().slice(0, 10) },
    resumePeriode: {
      caFacture,
      devisCrees: devisCreesPeriode,
      devisAcceptes: devisAcceptesCount,
      devisRefuses: devisRefusesPeriode,
      tauxConversionPct,
      chantiersDemarres,
      chantiersTermines: chantiersTerminesPeriode,
    },
    analyseFinanciere: {
      margeMoyenneParChantier,
      nombreChantiersAvecMarge: margesParChantier.length,
      facturesEnRetard: facturesEnRetardList.length,
      montantFacturesEnRetard,
      delaiMoyenPaiementJours,
      delaiMoyenPaiementNote,
    },
    activiteEquipe: {
      affectations,
      rapportsVocaux,
      tachesTraitees,
    },
  };
}
