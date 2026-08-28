import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAgentText } from "@/lib/agent";
import { agentSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";
import { checkRateLimit, getRequestKey } from "@/lib/rateLimit";

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

    // Les données fournies par l'utilisateur sont envoyées comme message
    // utilisateur structuré (JSON), jamais concaténées dans le system prompt.
    const text = await generateAgentText(business, parsed.data.module, parsed.data.input || {});

    return NextResponse.json({ result: text });
  } catch (err) {
    console.error("Erreur /api/agent:", err);
    const { status, message } = ownershipErrorToStatus(err);
    if (status !== 500) return NextResponse.json({ error: message }, { status });
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}
