import { prisma } from "./prisma";
import type { PeriodRange } from "./dates";
import { computeDevisTotals } from "./devisTotals";
import { sortByAcceptedDate, invoiceNumber } from "./facturation";

/**
 * Données comptables réelles pour l'export FEC / CSV simplifié / Excel
 * (sprint 2, point 4). Deux sources, aucune donnée inventée :
 * - Ventes : devis acceptés dont la date d'acceptation (updatedAt, même
 *   convention que lib/facturation.ts) tombe dans la période.
 * - Achats : commandes fournisseurs dont orderDate tombe dans la période.
 * Le module actuel n'a pas de TVA sur les achats (Purchase.amount est un
 * montant unique, pas de ventilation HT/TVA) — montantTVA vaut toujours 0
 * côté achats plutôt que d'être estimé.
 */
export type VenteEntry = {
  devisId: string;
  date: string;
  reference: string;
  label: string;
  clientName: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  paymentStatus: string;
};

export type AchatEntry = {
  purchaseId: string;
  date: string;
  description: string;
  supplierName: string;
  montant: number;
  status: string;
};

export type ComptabiliteData = {
  periode: { label: string; debut: string; fin: string };
  ventes: VenteEntry[];
  achats: AchatEntry[];
};

export async function computeComptabiliteData(businessId: string, range: PeriodRange): Promise<ComptabiliteData> {
  const { start, end } = range;

  const [devisAcceptes, purchases] = await Promise.all([
    prisma.devis.findMany({
      where: { businessId, status: "accepte", updatedAt: { gte: start, lt: end } },
      include: { client: true, lines: true },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.purchase.findMany({
      where: { businessId, orderDate: { gte: start, lt: end } },
      include: { supplier: true },
      orderBy: { orderDate: "asc" },
    }),
  ]);

  // Même numérotation de facture que /dashboard/facturation : recalculée à
  // la volée depuis la position chronologique parmi TOUS les devis acceptés
  // de l'entreprise, pas seulement ceux de la période, pour rester cohérente
  // avec le numéro affiché ailleurs dans l'app.
  const tousDevisAcceptes = await prisma.devis.findMany({
    where: { businessId, status: "accepte" },
    select: { id: true, updatedAt: true },
  });
  const chronological = sortByAcceptedDate(tousDevisAcceptes.map((d) => ({ ...d, updatedAt: d.updatedAt.toISOString() })));
  const numeroById = new Map(chronological.map((d, i) => [d.id, invoiceNumber(i, d.updatedAt)]));

  const ventes: VenteEntry[] = devisAcceptes.map((d) => {
    const hasLines = d.lines.length > 0;
    const totals = hasLines
      ? computeDevisTotals(d.lines, d.remise || 0)
      : (() => {
          const ht = d.amount || 0;
          const tva = ht * 0.2;
          return { totalHT: ht, totalTVA: tva, totalTTC: ht + tva };
        })();
    return {
      devisId: d.id,
      date: d.updatedAt.toISOString(),
      reference: numeroById.get(d.id) || d.label,
      label: d.label,
      clientName: d.client?.name || "—",
      montantHT: totals.totalHT,
      montantTVA: totals.totalTVA,
      montantTTC: totals.totalTTC,
      paymentStatus: d.paymentStatus,
    };
  });

  const achats: AchatEntry[] = purchases.map((p) => ({
    purchaseId: p.id,
    date: p.orderDate.toISOString(),
    description: p.description,
    supplierName: p.supplier?.name || "—",
    montant: p.amount,
    status: p.status,
  }));

  return {
    periode: { label: range.label, debut: start.toISOString().slice(0, 10), fin: new Date(end.getTime() - 1).toISOString().slice(0, 10) },
    ventes,
    achats,
  };
}
