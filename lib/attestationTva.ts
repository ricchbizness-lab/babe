export const TYPE_LOGEMENT_LABEL: Record<string, string> = {
  maison: "Maison individuelle",
  appartement: "Appartement",
  immeuble_collectif: "Immeuble collectif",
};

export const USAGE_LOGEMENT_LABEL: Record<string, string> = {
  residence_principale: "Résidence principale",
  residence_secondaire: "Résidence secondaire",
  locatif: "Logement locatif",
};

export const TYPE_LOGEMENT_VALUES = Object.keys(TYPE_LOGEMENT_LABEL);
export const USAGE_LOGEMENT_VALUES = Object.keys(USAGE_LOGEMENT_LABEL);
