import type { ComptabiliteData } from "./comptabiliteData";

/**
 * Mise en forme des exports comptables (sprint 2, point 4) — fonctions pures,
 * sans dépendance serveur, réutilisables côté client (bouton "Exporter") à
 * partir des données déjà chargées par GET /api/comptabilite.
 *
 * Le FEC ci-dessous suit les 11 colonnes demandées, un sous-ensemble du FEC
 * légal complet (qui en compte 18, dont CompAuxNum/CompAuxLib, EcritureLet...
 * absents ici faute de données correspondantes dans le modèle actuel) — à
 * usage de pré-comptabilisation, pas un FEC de contrôle fiscal complet. Plan
 * comptable simplifié utilisé : 411000 Clients, 706000 Prestations de
 * services, 445711 TVA collectée, 401000 Fournisseurs, 607000 Achats de
 * marchandises.
 */

export const FEC_COLUMNS = [
  "JournalCode",
  "JournalLib",
  "EcritureNum",
  "EcritureDate",
  "CompteNum",
  "CompteLib",
  "PieceRef",
  "PieceDate",
  "EcritureLib",
  "Debit",
  "Credit",
] as const;

export type FecRow = Record<(typeof FEC_COLUMNS)[number], string>;

function dateFec(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, ""); // AAAAMMJJ, format FEC
}

function amount(n: number): string {
  return n.toFixed(2);
}

export function buildFecRows(data: ComptabiliteData): FecRow[] {
  const rows: FecRow[] = [];
  let ecritureNum = 1;

  for (const v of data.ventes) {
    const num = String(ecritureNum++);
    const date = dateFec(v.date);
    const base = { JournalCode: "VE", JournalLib: "Journal des ventes", EcritureNum: num, EcritureDate: date, PieceRef: v.reference, PieceDate: date, EcritureLib: `${v.label} — ${v.clientName}` };
    rows.push({ ...base, CompteNum: "411000", CompteLib: "Clients", Debit: amount(v.montantTTC), Credit: amount(0) });
    rows.push({ ...base, CompteNum: "706000", CompteLib: "Prestations de services", Debit: amount(0), Credit: amount(v.montantHT) });
    if (v.montantTVA > 0) {
      rows.push({ ...base, CompteNum: "445711", CompteLib: "TVA collectée", Debit: amount(0), Credit: amount(v.montantTVA) });
    }
  }

  for (const a of data.achats) {
    const num = String(ecritureNum++);
    const date = dateFec(a.date);
    const base = { JournalCode: "AC", JournalLib: "Journal des achats", EcritureNum: num, EcritureDate: date, PieceRef: a.purchaseId, PieceDate: date, EcritureLib: `${a.description} — ${a.supplierName}` };
    rows.push({ ...base, CompteNum: "607000", CompteLib: "Achats de marchandises", Debit: amount(a.montant), Credit: amount(0) });
    rows.push({ ...base, CompteNum: "401000", CompteLib: "Fournisseurs", Debit: amount(0), Credit: amount(a.montant) });
  }

  return rows;
}

export const SIMPLIFIED_COLUMNS = ["Date", "Référence", "Description", "Client", "Montant HT", "TVA", "TTC", "Statut"] as const;

const PAYMENT_STATUS_LABEL: Record<string, string> = { en_attente: "En attente", payee: "Payée", en_retard: "En retard" };

export function buildSimplifiedRows(data: ComptabiliteData): (string | number)[][] {
  return data.ventes.map((v) => [
    v.date.slice(0, 10),
    v.reference,
    v.label,
    v.clientName,
    Number(v.montantHT.toFixed(2)),
    Number(v.montantTVA.toFixed(2)),
    Number(v.montantTTC.toFixed(2)),
    PAYMENT_STATUS_LABEL[v.paymentStatus] || v.paymentStatus,
  ]);
}
