import { OUVRAGES_SEED, type OuvrageSeed } from "./ouvragesSeed";

/**
 * Catalogues d'ouvrages courants par métier (sprint 1, point 3) — utilisés
 * pour pré-remplir automatiquement la bibliothèque d'un nouvel utilisateur
 * selon le métier choisi à l'onboarding. Prix moyens marché français 2026,
 * fourniture et pose HT comprises. Seuls les 4 métiers listés dans la
 * demande ont un catalogue dédié ; les autres métiers utilisent le
 * catalogue générique (OUVRAGES_SEED, module B4) au premier accès à la
 * bibliothèque.
 */
export const OUVRAGES_BY_METIER: Partial<Record<string, OuvrageSeed[]>> = {
  plomberie: [
    { label: "Pose mitigeur thermostatique", type: "plomberie", unite: "unité", prixUnitaireHT: 180 },
    { label: "Installation WC suspendu", type: "plomberie", unite: "unité", prixUnitaireHT: 650 },
    { label: "Pose douche à l'italienne", type: "plomberie", unite: "forfait", prixUnitaireHT: 1800 },
    { label: "Remplacement chauffe-eau", type: "plomberie", unite: "unité", prixUnitaireHT: 450 },
    { label: "Débouchage canalisation", type: "plomberie", unite: "forfait", prixUnitaireHT: 120 },
    { label: "Installation lave-mains", type: "plomberie", unite: "unité", prixUnitaireHT: 220 },
    { label: "Pose robinet cuisine", type: "plomberie", unite: "unité", prixUnitaireHT: 140 },
    { label: "Réparation fuite", type: "plomberie", unite: "forfait", prixUnitaireHT: 90 },
    { label: "Pose baignoire", type: "plomberie", unite: "unité", prixUnitaireHT: 550 },
    { label: "Installation VMC", type: "plomberie", unite: "forfait", prixUnitaireHT: 480 },
    { label: "Remplacement radiateur", type: "plomberie", unite: "unité", prixUnitaireHT: 280 },
    { label: "Pose siphon", type: "plomberie", unite: "unité", prixUnitaireHT: 60 },
    { label: "Installation compteur eau", type: "plomberie", unite: "unité", prixUnitaireHT: 180 },
    { label: "Pose colonne douche", type: "plomberie", unite: "unité", prixUnitaireHT: 320 },
    { label: "Réfection salle de bain complète", type: "plomberie", unite: "forfait", prixUnitaireHT: 6500 },
  ],
  electricite: [
    { label: "Pose tableau électrique", type: "electricite", unite: "unité", prixUnitaireHT: 650 },
    { label: "Installation prise électrique", type: "electricite", unite: "unité", prixUnitaireHT: 65 },
    { label: "Pose interrupteur", type: "electricite", unite: "unité", prixUnitaireHT: 55 },
    { label: "Installation luminaire", type: "electricite", unite: "unité", prixUnitaireHT: 90 },
    { label: "Câblage électrique", type: "electricite", unite: "ml", prixUnitaireHT: 12 },
    { label: "Mise aux normes tableau", type: "electricite", unite: "forfait", prixUnitaireHT: 800 },
    { label: "Pose VMC électrique", type: "electricite", unite: "forfait", prixUnitaireHT: 450 },
    { label: "Installation borne recharge véhicule", type: "electricite", unite: "unité", prixUnitaireHT: 1200 },
    { label: "Installation alarme", type: "electricite", unite: "forfait", prixUnitaireHT: 900 },
    { label: "Pose détecteur fumée", type: "electricite", unite: "unité", prixUnitaireHT: 45 },
    { label: "Domotique installation", type: "electricite", unite: "forfait", prixUnitaireHT: 1500 },
    { label: "Pose volet roulant électrique", type: "electricite", unite: "unité", prixUnitaireHT: 480 },
    { label: "Remplacement disjoncteur", type: "electricite", unite: "unité", prixUnitaireHT: 120 },
    { label: "Tirage câble", type: "electricite", unite: "ml", prixUnitaireHT: 8 },
    { label: "Mise en conformité électrique", type: "electricite", unite: "forfait", prixUnitaireHT: 1200 },
  ],
  maconnerie: [
    { label: "Coulage dalle béton", type: "maconnerie", unite: "m²", prixUnitaireHT: 60 },
    { label: "Montage mur parpaing", type: "maconnerie", unite: "m²", prixUnitaireHT: 90 },
    { label: "Enduit façade", type: "maconnerie", unite: "m²", prixUnitaireHT: 35 },
    { label: "Création ouverture mur", type: "maconnerie", unite: "forfait", prixUnitaireHT: 800 },
    { label: "Reprise fondations", type: "maconnerie", unite: "forfait", prixUnitaireHT: 3500 },
    { label: "Pose linteau", type: "maconnerie", unite: "unité", prixUnitaireHT: 350 },
    { label: "Démolition cloison", type: "maconnerie", unite: "forfait", prixUnitaireHT: 400 },
    { label: "Création cloison", type: "maconnerie", unite: "m²", prixUnitaireHT: 55 },
    { label: "Chape liquide", type: "maconnerie", unite: "m²", prixUnitaireHT: 22 },
    { label: "Ragréage sol", type: "maconnerie", unite: "m²", prixUnitaireHT: 15 },
    { label: "Imperméabilisation cave", type: "maconnerie", unite: "m²", prixUnitaireHT: 40 },
    { label: "Réfection escalier", type: "maconnerie", unite: "forfait", prixUnitaireHT: 1800 },
    { label: "Pose dallage extérieur", type: "maconnerie", unite: "m²", prixUnitaireHT: 65 },
    { label: "Création terrasse", type: "maconnerie", unite: "m²", prixUnitaireHT: 120 },
    { label: "Réfection mur pierre", type: "maconnerie", unite: "m²", prixUnitaireHT: 180 },
  ],
  peinture: [
    { label: "Peinture murs 2 couches", type: "peinture", unite: "m²", prixUnitaireHT: 25 },
    { label: "Peinture plafond", type: "peinture", unite: "m²", prixUnitaireHT: 22 },
    { label: "Peinture façade", type: "peinture", unite: "m²", prixUnitaireHT: 30 },
    { label: "Impression avant peinture", type: "peinture", unite: "m²", prixUnitaireHT: 8 },
    { label: "Ponçage parquet", type: "peinture", unite: "m²", prixUnitaireHT: 18 },
    { label: "Vitrification parquet", type: "peinture", unite: "m²", prixUnitaireHT: 15 },
    { label: "Pose papier peint", type: "peinture", unite: "m²", prixUnitaireHT: 20 },
    { label: "Ravalement façade", type: "peinture", unite: "m²", prixUnitaireHT: 45 },
    { label: "Enduit de lissage", type: "peinture", unite: "m²", prixUnitaireHT: 12 },
    { label: "Peinture boiseries", type: "peinture", unite: "ml", prixUnitaireHT: 15 },
    { label: "Protection sol avant travaux", type: "peinture", unite: "forfait", prixUnitaireHT: 80 },
    { label: "Décapage peinture", type: "peinture", unite: "m²", prixUnitaireHT: 25 },
    { label: "Lasure bois extérieur", type: "peinture", unite: "m²", prixUnitaireHT: 20 },
    { label: "Peinture sol", type: "peinture", unite: "m²", prixUnitaireHT: 28 },
    { label: "Traitement moisissures", type: "peinture", unite: "m²", prixUnitaireHT: 35 },
  ],
};

/** Catalogue à utiliser pour un métier donné — celui dédié s'il existe, sinon le catalogue générique B4. */
export function getOuvragesForMetier(metier?: string | null): OuvrageSeed[] {
  return (metier && OUVRAGES_BY_METIER[metier]) || OUVRAGES_SEED;
}
