import { prisma } from "./prisma";

/**
 * Registre d'activité (anciennement "VCN — Valeur Créée Nova").
 *
 * Règle non négociable, issue de la relecture critique du concept : NOVA
 * constate des faits traçables, il ne s'attribue jamais le mérite d'une
 * valeur qu'il ne peut pas prouver avoir causée. Pas de composante "temps
 * gagné" mêlée au total par défaut — elle reste une estimation séparée et
 * explicitement labellisée comme telle.
 */

export type RegistreActivite = {
  devisTotal: number;
  devisAcceptes: number;
  caFacture: number; // somme des devis au statut "accepte", fait vérifiable
  tachesTraiteesATemps: number;
  tachesEnAttente: number;
  // Composante séparée, jamais additionnée au reste sans le label explicite :
  tempsEstime: { heures: number; tauxHoraire: number; estimationEuros: number };
};

export async function computeRegistreActivite(businessId: string): Promise<RegistreActivite> {
  const [business, devisList, tasks] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId } }),
    prisma.devis.findMany({ where: { businessId } }),
    prisma.task.findMany({ where: { businessId } }),
  ]);

  const devisAcceptes = devisList.filter((d: { status: string }) => d.status === "accepte");
  const caFacture = devisAcceptes.reduce((acc: number, d: { amount: number | null }) => acc + (d.amount || 0), 0);
  const tachesTraiteesATemps = tasks.filter((t: { done: boolean }) => t.done).length;
  const tachesEnAttente = tasks.filter((t: { done: boolean }) => !t.done).length;

  // Estimation de temps gagné : nombre de documents/devis générés par
  // l'agent IA × durée moyenne estimée gagnée par génération. Affiché
  // séparément, jamais comme un fait — c'est une hypothèse, pas une mesure.
  const documentsGeneres = await prisma.document.count({ where: { businessId } });
  const heures = (documentsGeneres + devisList.length) * 0.25; // 15 min/document, hypothèse déclarée
  const tauxHoraire = business?.tauxHoraire || 40;

  return {
    devisTotal: devisList.length,
    devisAcceptes: devisAcceptes.length,
    caFacture,
    tachesTraiteesATemps,
    tachesEnAttente,
    tempsEstime: { heures, tauxHoraire, estimationEuros: heures * tauxHoraire },
  };
}
