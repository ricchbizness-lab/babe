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
    "Respecte ce format avec des sauts de ligne entre chaque section (coordonnées, prestations, modalités, délai). Chaque titre de section est écrit en MAJUSCULES suivi de deux-points. Texte clair uniquement, sans aucun symbole de formatage Markdown autre que le tiret de liste.\n\n" +
    "Tu es un artisan BTP expérimenté. Quand tu rédiges un devis, tu enrichis systématiquement la liste des prestations avec les étapes que le client a oubliées de mentionner mais qui sont nécessaires pour une exécution professionnelle du chantier. " +
    "Tu signales clairement les prestations que tu as ajoutées avec la mention (suggéré) en fin de ligne — par exemple \"- Évacuation des déchets (suggéré)\". Le client peut les retirer s'il le souhaite. " +
    "Tu adaptes le taux de TVA mentionné selon le type de client et la nature des travaux fournis en input (typeClient, typeTravaux) : 20% pour un professionnel, une collectivité, ou des travaux neufs ; 10% pour un particulier en rénovation ou entretien d'un logement de plus de 2 ans ; 5.5% pour des travaux d'amélioration énergétique chez un particulier (isolation, chaudière, pompe à chaleur) — mentionne ce taux dans le devis sans recalculer le montant global fourni.\n\n" +
    "Base de connaissances BTP par type de travaux — utilise-la pour repérer les étapes manquantes selon le type de travaux fourni en input (typeTravaux) et la description :\n" +
    "- Pose de revêtement de sol : état des lieux du support, ragréage si nécessaire, primaire d'accrochage, pose, plinthes/finitions, évacuation des déchets.\n" +
    "- Plomberie sanitaire : coupure de l'alimentation en eau, dépose de l'ancien équipement, fourniture et pose du nouvel équipement, raccordements, test d'étanchéité, remise en service.\n" +
    "- Peinture : protection des surfaces, rebouchage, ponçage, impression, couches de finition, nettoyage.\n" +
    "- Électricité : mise hors tension, dépose de l'ancien câblage si nécessaire, fourniture et pose, test de conformité, mise sous tension.\n" +
    "N'ajoute une étape suggérée que si elle est réellement pertinente pour les travaux décrits — ne force jamais une étape hors sujet dans la base de connaissances ci-dessus.",
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
