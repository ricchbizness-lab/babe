import { z } from "zod";

export const diagnosticSchema = z.object({
  ca: z.enum(["<50k", "50-150k", "150-500k", ">500k"]),
  clients: z.enum(["1-5", "6-20", "21-50", ">50"]),
  tempsAdmin: z.enum(["<2h", "2-5h", "5-10h", ">10h"]),
  secteur: z.enum(["batiment", "commerce", "services", "autre"]),
});

const TEMPS_HEURES: Record<string, number> = { "<2h": 1, "2-5h": 3.5, "5-10h": 7.5, ">10h": 12 };
const CA_TAUX: Record<string, number> = { "<50k": 30, "50-150k": 45, "150-500k": 60, ">500k": 80 };

/**
 * Estimation qualitative avant inscription — volontairement approximative
 * (fourchette basse/haute), sans connexion à aucune donnée réelle. Le
 * diagnostic chiffré et précis n'existe qu'une fois le compte créé, sur les
 * vraies données de l'entreprise (voir lib/registre.ts).
 */
export function estimateDiagnostic(input: z.infer<typeof diagnosticSchema>) {
  const heures = TEMPS_HEURES[input.tempsAdmin];
  const taux = CA_TAUX[input.ca];
  return {
    low: Math.round(heures * taux * 3.2),
    high: Math.round(heures * taux * 4.4),
  };
}
