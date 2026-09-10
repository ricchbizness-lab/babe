import { anthropic, buildSystemPrompt, type BusinessContext } from "@/lib/anthropic";

export const MODULE_INSTRUCTIONS: Record<string, string> = {
  brief: "Génère un brief du jour : 3 à 5 priorités concrètes pour aujourd'hui, adaptées au secteur de l'entreprise.",
  devis:
    "Rédige un devis professionnel à partir des informations fournies (client, prestation, montant, détails). Le montant fourni est déjà définitif : reprends-le tel quel dans le texte, sans le recalculer, sans ajouter de TVA ni de répartition HT/TTC de ton fait. " +
    "Si les modalités de paiement ne sont pas fournies, utilise par défaut \"30% à la commande, solde à réception\". Si le délai d'exécution n'est pas fourni, utilise par défaut \"À convenir selon planning\". " +
    "Structure le contenu avec des bullet points précédés d'un tiret (-) pour chaque prestation. Format attendu :\n" +
    "TITRE : [objet du devis]\n" +
    "- prestation 1\n" +
    "- prestation 2\n" +
    "- prestation 3\n" +
    "Respecte ce format avec des sauts de ligne entre chaque section (coordonnées, prestations, modalités, délai). Chaque titre de section est écrit en MAJUSCULES suivi de deux-points. Texte clair uniquement, sans aucun symbole de formatage Markdown autre que le tiret de liste.",
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
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text : "";
}
