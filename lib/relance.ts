/**
 * Compteur de relance sur les devis envoyés — pertinent uniquement pour un
 * devis au statut "envoye", basé sur updatedAt (date du dernier changement
 * de statut, plus fiable que createdAt pour savoir depuis quand il attend
 * une réponse).
 */

export function daysSinceSent(updatedAt: string): number {
  const ms = Date.now() - new Date(updatedAt).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export type RelanceLevel = "none" | "orange" | "danger";

export function relanceLevel(status: string, updatedAt: string): { days: number; level: RelanceLevel } {
  if (status !== "envoye") return { days: 0, level: "none" };
  const days = daysSinceSent(updatedAt);
  if (days > 14) return { days, level: "danger" };
  if (days >= 7) return { days, level: "orange" };
  return { days, level: "none" };
}

export const PAYMENT_TERMS_DAYS = 30;

/** Jours de retard au-delà du délai de paiement (0 si la facture est encore dans les temps). */
export function joursRetardPaiement(updatedAt: string): number {
  return Math.max(0, daysSinceSent(updatedAt) - PAYMENT_TERMS_DAYS);
}

/**
 * Une facture (devis accepté) est en retard si elle n'est pas payée ET que
 * le délai de paiement de 30 jours est dépassé — calculé depuis updatedAt
 * (date d'acceptation), jamais depuis un champ paymentStatus="en_retard"
 * littéral : ce statut n'est positionné par aucun processus automatique
 * dans l'application, seulement modifiable à la main, donc quasiment
 * toujours absent en pratique même sur des factures réellement en retard.
 */
export function isPaiementEnRetard(paymentStatus: string, updatedAt: string): boolean {
  return paymentStatus !== "payee" && joursRetardPaiement(updatedAt) > 0;
}
