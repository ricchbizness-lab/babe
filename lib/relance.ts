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
