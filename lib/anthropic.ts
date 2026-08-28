import Anthropic from "@anthropic-ai/sdk";

// Appel exclusivement côté serveur — la clé ne doit JAMAIS être exposée au
// client (ne jamais préfixer la variable d'env avec NEXT_PUBLIC_).
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type BusinessContext = {
  name: string;
  sector: string;
  mission: string | null;
  tone: string;
};

/**
 * Construit un prompt système à partir du profil entreprise.
 * Les entrées utilisateur (input) ne sont PAS concaténées directement dans
 * le system prompt — elles sont passées comme message utilisateur séparé,
 * ce qui réduit la surface d'injection de prompt par rapport à une
 * interpolation brute dans les instructions système.
 */
export function buildSystemPrompt(business: BusinessContext, module: string): string {
  const toneMap: Record<string, string> = {
    pro: "professionnel, clair et sobre",
    chaleureux: "chaleureux et accessible",
    direct: "direct et concis",
  };

  return [
    `Tu es l'assistant IA de "${business.name}", une entreprise du secteur "${business.sector}".`,
    business.mission ? `Mission de l'entreprise : ${business.mission}` : "",
    `Ton de communication attendu : ${toneMap[business.tone] || toneMap.pro}.`,
    `Module actif : ${module}.`,
    `Règle impérative : toute recommandation doit être formulée comme une option à évaluer, jamais comme une directive. Ne jamais te présenter comme une autorité de décision — tu assistes, tu ne décides pas à la place du dirigeant.`,
    `Tu génères du texte professionnel structuré. Tu n'utilises JAMAIS de Markdown : pas de #, ##, **, *, |, >, ni aucun autre symbole de formatage. Tu rédiges en texte clair, avec des sauts de ligne pour séparer les sections.`,
  ]
    .filter(Boolean)
    .join("\n");
}
