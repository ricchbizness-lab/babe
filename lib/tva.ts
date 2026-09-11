/**
 * Règles de TVA multi-taux BTP — obligation légale, un mauvais taux expose
 * l'artisan à un redressement fiscal. Barème appliqué :
 * 20% travaux neufs, professionnels ou collectivités ; 10% rénovation d'un
 * logement particulier de plus de 2 ans ; 5.5% amélioration énergétique
 * chez un particulier. Ces taux sont toujours des suggestions — le
 * dirigeant reste libre de corriger le taux ligne par ligne.
 */

export const TYPE_TRAVAUX_TVA_LABEL: Record<string, string> = {
  neuf: "Neuf",
  renovation: "Rénovation",
  energie: "Amélioration énergétique",
  entretien: "Entretien / dépannage",
};

export const CLIENT_TYPE_TVA_LABEL: Record<string, string> = {
  particulier: "Particulier",
  professionnel: "Professionnel",
  collectivite: "Collectivité",
};

export const TVA_RATES = [5.5, 10, 20] as const;

export function suggestedTvaRate(typeTravauxTVA: string, clientTypeTVA: string): number {
  if (clientTypeTVA !== "particulier") return 20;
  if (typeTravauxTVA === "energie") return 5.5;
  if (typeTravauxTVA === "renovation" || typeTravauxTVA === "entretien") return 10;
  return 20;
}

export const TVA_MENTION_LEGALE: Record<string, string> = {
  "10": "TVA à taux réduit — travaux de rénovation dans un logement achevé depuis plus de 2 ans (art. 279-0 bis du CGI)",
  "5.5": "TVA à taux réduit — travaux d'amélioration énergétique (art. 278-0 bis du CGI)",
};
