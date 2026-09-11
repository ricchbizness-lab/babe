/**
 * Calcul des totaux d'un devis à partir de ses lignes détaillées — partagé
 * entre l'interface (affichage) et l'API (lien de paiement Stripe) pour
 * éviter toute divergence entre le montant affiché et le montant facturé.
 * La remise s'applique proportionnellement à chaque ligne avant le calcul
 * de sa TVA, pour rester correct même avec des lignes à taux différents.
 */

export type DevisLineLike = {
  quantite: number;
  prixUnitaire: number;
  tva: number;
};

export function lineTotalHT(line: DevisLineLike): number {
  return line.quantite * line.prixUnitaire;
}

export function computeDevisTotals(lines: DevisLineLike[], remisePct: number) {
  const sousTotalHT = lines.reduce((sum, l) => sum + lineTotalHT(l), 0);
  const remiseMontant = sousTotalHT * (remisePct / 100);
  const totalHT = sousTotalHT - remiseMontant;
  const totalTVA = lines.reduce((sum, l) => {
    const ligneHTApresRemise = lineTotalHT(l) * (1 - remisePct / 100);
    return sum + ligneHTApresRemise * (l.tva / 100);
  }, 0);
  const totalTTC = totalHT + totalTVA;
  return { sousTotalHT, remiseMontant, totalHT, totalTVA, totalTTC };
}

export type TvaBucket = { rate: number; base: number; tva: number };

/** Regroupe la TVA par taux appliqué — un devis BTP mêle souvent plusieurs taux sur les mêmes lignes (module B1). */
export function tvaByRate(lines: DevisLineLike[], remisePct: number): TvaBucket[] {
  const map = new Map<number, TvaBucket>();
  for (const l of lines) {
    const base = lineTotalHT(l) * (1 - remisePct / 100);
    const tva = base * (l.tva / 100);
    const entry = map.get(l.tva) || { rate: l.tva, base: 0, tva: 0 };
    entry.base += base;
    entry.tva += tva;
    map.set(l.tva, entry);
  }
  return Array.from(map.values()).sort((a, b) => a.rate - b.rate);
}
