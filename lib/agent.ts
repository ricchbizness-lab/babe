import { anthropic, buildSystemPrompt, type BusinessContext } from "@/lib/anthropic";

export const MODULE_INSTRUCTIONS: Record<string, string> = {
  brief: "Génère un brief du jour : 3 à 5 priorités concrètes pour aujourd'hui, adaptées au secteur de l'entreprise.",
  devis:
    "Tu es un artisan BTP expérimenté. Génère un devis complet au format JSON strict — rien d'autre que le JSON dans ta réponse, aucun texte autour.\n\n" +
    "Règles :\n" +
    "- Complète avec les prestations oubliées selon le type de travaux\n" +
    "- Prix moyens du marché français 2026\n" +
    "- TVA : 20% neuf/pro, 10% rénovation particulier, 5.5% énergie\n" +
    "- Inclure toujours : préparation + prestations principales + finitions + évacuation déchets\n" +
    "- Jamais de prix à 0\n" +
    "- Entre 4 et 10 lignes maximum\n\n" +
    "Prestations à inclure selon contexte :\n" +
    "SOL : dépose, ragréage si rénovation, fourniture (m²), pose (m²), plinthes (ml), évacuation\n" +
    "PLOMBERIE : dépose si rénovation, fourniture, pose et raccordements, test étanchéité\n" +
    "PEINTURE : protection, rebouchage/ponçage, impression, finition, nettoyage\n" +
    "ÉLECTRICITÉ : mise hors tension, fourniture, pose, test conformité\n" +
    "MAÇONNERIE : protection, travaux, évacuation gravats, nettoyage\n\n" +
    "Format JSON attendu :\n" +
    '{"titre": "...", "description": "...", "lignes": [{"type": "prestation|materiel|maindoeuvre|deplacement", "description": "...", "quantite": 1, "unite": "h|m²|ml|forfait|unité", "prixUnitaireHT": 0, "tva": 10}], "conditions": "..."}',
  marketing: "Rédige un post pour la plateforme indiquée, adapté au ton de l'entreprise.",
  conseil: "Donne un conseil métier actionnable pour la semaine, adapté au secteur.",
  reponse_client: "Rédige une réponse professionnelle au message client fourni.",
  relance: "Rédige un message de relance de paiement courtois mais ferme pour une facture en retard, à partir des informations fournies (client, montant, échéance, nombre de jours de retard).",
  relance_devis: "Rédige un message de relance courtois pour un devis envoyé au client resté sans réponse, à partir des informations fournies (client, devis, montant, nombre de jours depuis l'envoi).",
  analyse: "Analyse les indicateurs d'activité fournis (chiffre d'affaires, marge, taux de conversion, chantiers) et formule 2 à 3 constats ou pistes à évaluer sur la rentabilité de l'activité, jamais des directives.",
  mise_en_concurrence:
    "Rédige un email professionnel de demande de devis à envoyer à un fournisseur, à partir des informations fournies (catégorie d'achat, description du besoin, budget estimé si disponible). " +
    "L'email doit être poli et concis, présenter clairement le besoin, demander un devis détaillé avec délai de livraison et conditions, et se terminer par une formule de politesse. Texte clair uniquement, sans aucun symbole de formatage Markdown, sans objet d'email inclus dans le corps.",
};

/** Génère un texte via le modèle actif pour un module donné — utilisé par /api/agent (génération affichée) et /api/relances (génération + envoi email). */
export async function generateAgentText(
  business: BusinessContext,
  module: string,
  input: Record<string, unknown>
): Promise<string> {
  const systemPrompt = buildSystemPrompt(business, module);
  const instruction = MODULE_INSTRUCTIONS[module];

  const userMessage = JSON.stringify({ instruction, input });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1400,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text : "";
}
