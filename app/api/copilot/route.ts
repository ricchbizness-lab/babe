import { NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { buildTools, runTool, COPILOT_SYSTEM_PROMPT } from "@/lib/copilotTools";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";
import { checkRateLimit, getRequestKey } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const copilotSchema = z.object({
  message: z.string().min(1).max(1000),
});

const MAX_TOOL_ROUNDS = 4;

export async function POST(req: Request) {
  try {
    const { userId } = await requireSession();

    const key = `copilot:${getRequestKey(req)}:${userId}`;
    if (!checkRateLimit(key, 20, 60_000)) {
      return NextResponse.json({ error: "Trop de requêtes, réessayez dans un instant." }, { status: 429 });
    }

    const businessId = await requireBusinessId(userId);

    // Le copilote (palier Premium) exige un abonnement actif, comme le reste de l'IA.
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription || subscription.status !== "active" || subscription.plan === "essentiel") {
      return NextResponse.json({ error: "Le copilote nécessite le palier Pro ou Premium." }, { status: 402 });
    }

    const body = await req.json();
    const parsed = copilotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Message invalide" }, { status: 400 });
    }

    const messages: Anthropic.MessageParam[] = [{ role: "user", content: parsed.data.message }];
    const tools = buildTools();

    let finalText = "";
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        system: COPILOT_SYSTEM_PROMPT,
        tools,
        messages,
      });

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolUses.length === 0) {
        const textBlock = response.content.find((b) => b.type === "text");
        finalText = textBlock && "text" in textBlock ? textBlock.text : "";
        break;
      }

      messages.push({ role: "assistant", content: response.content });

      // businessId n'est jamais lu depuis l'entrée du modèle — toujours la
      // valeur vérifiée côté serveur au tout début de la requête.
      const toolResults = await Promise.all(
        toolUses.map(async (tu) => ({
          type: "tool_result" as const,
          tool_use_id: tu.id,
          content: JSON.stringify(await runTool(tu.name, businessId)),
        }))
      );
      messages.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({ reply: finalText || "Je n'ai pas pu formuler de réponse à partir des données disponibles." });
  } catch (err) {
    console.error("Erreur /api/copilot:", err);
    const { status, message } = ownershipErrorToStatus(err);
    if (status !== 500) return NextResponse.json({ error: message }, { status });
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}
