import { prisma } from "./prisma";
import { computeRegistreActivite } from "./registre";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Outils exposés au copilote conversationnel. Lecture seule, strictement
 * scopés à businessId (aucun outil ne prend de businessId en paramètre —
 * il est fermé par closure côté serveur pour qu'un prompt utilisateur ne
 * puisse jamais le faire changer de cible).
 */
export function buildTools(): Anthropic.Tool[] {
  return [
    {
      name: "get_registre_activite",
      description: "Lit le registre d'activité réel de l'entreprise (devis, CA facturé, tâches).",
      input_schema: { type: "object", properties: {} },
    },
    {
      name: "get_devis_en_attente",
      description: "Liste les devis dont le statut n'est ni accepté ni refusé.",
      input_schema: { type: "object", properties: {} },
    },
    {
      name: "get_taches_en_attente",
      description: "Liste les tâches non terminées.",
      input_schema: { type: "object", properties: {} },
    },
  ];
}

export async function runTool(name: string, businessId: string): Promise<unknown> {
  switch (name) {
    case "get_registre_activite":
      return computeRegistreActivite(businessId);
    case "get_devis_en_attente":
      return prisma.devis.findMany({
        where: { businessId, status: { in: ["brouillon", "envoye"] } },
        select: { id: true, label: true, amount: true, status: true, createdAt: true },
      });
    case "get_taches_en_attente":
      return prisma.task.findMany({
        where: { businessId, done: false },
        select: { id: true, text: true, createdAt: true },
      });
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}

export const COPILOT_SYSTEM_PROMPT = `Tu es le copilote de pilotage de Nova.

Règles impératives, non négociables :
- Tu n'es jamais une autorité de décision. Tu montres des données réelles et proposes des options, tu ne donnes jamais d'ordre.
- Toute suggestion doit être formulée ainsi : la donnée observée, puis "une option à évaluer est...". Jamais une directive isolée du type "faites X".
- Tu ne réponds qu'à partir des données renvoyées par tes outils. Si tu n'as pas l'information, dis-le explicitement — n'invente jamais un chiffre.
- Tu ne prononces jamais les mots "audit" ou "bilan" pour qualifier tes propres réponses — ce sont des documents réglementés produits par un expert-comptable, pas par toi.
- Tu rappelles, si la question porte sur une décision à fort enjeu (prix, embauche, investissement), qu'un point avec l'expert-comptable ou un conseiller reste recommandé avant de trancher.`;
