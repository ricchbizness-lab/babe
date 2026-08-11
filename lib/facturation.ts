/**
 * Facturation MVP : pas de modèle Facture séparé — un devis au statut
 * "accepte" EST la facture. Le numéro est recalculé à la volée à partir de
 * la position du devis dans la liste des devis acceptés triée par date
 * d'acceptation, jamais stocké. `updatedAt` sert de date d'acceptation :
 * il n'existe pas de champ dédié, et c'est la dernière écriture connue au
 * moment où le statut passe à "accepte" (PATCH /api/devis/[id]).
 */

export type AcceptedDevisLike = { id: string; updatedAt: string };

export function sortByAcceptedDate<T extends AcceptedDevisLike>(devis: T[]): T[] {
  return [...devis].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
}

export function invoiceNumber(positionZeroBased: number, acceptedAt: string): string {
  const year = new Date(acceptedAt).getFullYear();
  return `F-${year}-${String(positionZeroBased + 1).padStart(3, "0")}`;
}

const TVA_RATE = 0.2;

export function computeInvoiceAmounts(montantHT: number | null) {
  if (montantHT == null) return null;
  const tva = montantHT * TVA_RATE;
  return { ht: montantHT, tva, ttc: montantHT + tva };
}
