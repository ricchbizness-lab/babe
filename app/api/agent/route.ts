import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic, buildSystemPrompt } from "@/lib/anthropic";
import { agentSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";
import { checkRateLimit, getRequestKey } from "@/lib/rateLimit";

const MODULE_INSTRUCTIONS: Record<string, string> = {
  brief: "Génère un brief du jour : 3 à 5 priorités concrètes pour aujourd'hui, adaptées au secteur de l'entreprise.",
  devis: "Rédige un devis professionnel à partir des informations fournies (client, prestation, montant, détails). Le montant fourni est déjà définitif : reprends-le tel quel dans le texte, sans le recalculer, sans ajouter de TVA ni de répartition HT/TTC de ton fait. Texte clair uniquement, sans aucun symbole de formatage Markdown.",
  marketing: "Rédige un post pour la plateforme indiquée, adapté au ton de l'entreprise.",
  conseil: "Donne un conseil métier actionnable pour la semaine, adapté au secteur.",
  reponse_client: "Rédige une réponse professionnelle au message client fourni.",
};

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Génération IA non configurée pour le moment — clé Anthropic manquante." },
        { status: 503 }
      );
    }

    const { userId } = await requireSession();

    // Limite l'abus d'appels IA (coût direct) même par un compte légitime.
    const key = `agent:${getRequestKey(req)}:${userId}`;
    if (!checkRateLimit(key, 20, 60_000)) {
      return NextResponse.json({ error: "Trop de requêtes, réessayez dans un instant." }, { status: 429 });
    }

    const businessId = await requireBusinessId(userId);

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return NextResponse.json({ error: "Profil entreprise introuvable" }, { status: 404 });
    }

    // Vérification d'abonnement actif avant tout appel IA facturé.
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription || subscription.status !== "active") {
      return NextResponse.json({ error: "Abonnement inactif" }, { status: 402 });
    }

    const body = await req.json();
    const parsed = agentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(business, parsed.data.module);
    const instruction = MODULE_INSTRUCTIONS[parsed.data.module];

    // Les données fournies par l'utilisateur sont envoyées comme message
    // utilisateur structuré (JSON), jamais concaténées dans le system prompt.
    const userMessage = JSON.stringify({
      instruction,
      input: parsed.data.input || {},
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "";

    return NextResponse.json({ result: text });
  } catch (err) {
    console.error("Erreur /api/agent:", err);
    const { status, message } = ownershipErrorToStatus(err);
    if (status !== 500) return NextResponse.json({ error: message }, { status });
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}
