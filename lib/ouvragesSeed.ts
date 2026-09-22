/**
 * Catalogue de 20 ouvrages BTP courants, pré-rempli automatiquement dans la
 * bibliothèque d'une entreprise lors de son premier accès si elle est
 * vide — évite de partir d'une page blanche. Prix moyens marché français
 * 2026, fourniture et pose HT comprises ; le dirigeant reste libre de les
 * ajuster à ses propres tarifs.
 */

export type OuvrageSeed = {
  label: string;
  type: "plomberie" | "electricite" | "maconnerie" | "peinture" | "sol" | "menuiserie" | "autre";
  unite: string;
  prixUnitaireHT: number;
};

export const OUVRAGES_SEED: OuvrageSeed[] = [
  { label: "Pose mitigeur thermostatique", type: "plomberie", unite: "unité", prixUnitaireHT: 180 },
  { label: "Dépose revêtement sol", type: "sol", unite: "m²", prixUnitaireHT: 8 },
  { label: "Ragréage sol", type: "sol", unite: "m²", prixUnitaireHT: 15 },
  { label: "Peinture murs 2 couches", type: "peinture", unite: "m²", prixUnitaireHT: 25 },
  { label: "Installation tableau électrique", type: "electricite", unite: "forfait", prixUnitaireHT: 650 },
  { label: "Pose carrelage", type: "sol", unite: "m²", prixUnitaireHT: 45 },
  { label: "Pose parquet flottant", type: "sol", unite: "m²", prixUnitaireHT: 30 },
  { label: "Isolation combles", type: "autre", unite: "m²", prixUnitaireHT: 35 },
  { label: "Pose fenêtre PVC", type: "menuiserie", unite: "unité", prixUnitaireHT: 550 },
  { label: "Installation chauffe-eau électrique", type: "plomberie", unite: "unité", prixUnitaireHT: 450 },
  { label: "Débouchage canalisation", type: "plomberie", unite: "forfait", prixUnitaireHT: 120 },
  { label: "Pose douche à l'italienne", type: "plomberie", unite: "forfait", prixUnitaireHT: 1800 },
  { label: "Installation VMC simple flux", type: "autre", unite: "forfait", prixUnitaireHT: 550 },
  { label: "Pose dalle béton", type: "maconnerie", unite: "m²", prixUnitaireHT: 60 },
  { label: "Enduit de façade", type: "maconnerie", unite: "m²", prixUnitaireHT: 35 },
  { label: "Pose portail motorisé", type: "menuiserie", unite: "unité", prixUnitaireHT: 2200 },
  { label: "Installation climatisation", type: "autre", unite: "unité", prixUnitaireHT: 1500 },
  { label: "Réfection toiture", type: "maconnerie", unite: "m²", prixUnitaireHT: 90 },
  { label: "Pose placo plâtre", type: "maconnerie", unite: "m²", prixUnitaireHT: 20 },
  { label: "Création ouverture mur", type: "maconnerie", unite: "forfait", prixUnitaireHT: 800 },
];
