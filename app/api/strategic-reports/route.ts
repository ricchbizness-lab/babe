import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { computeRegistreActivite } from "@/lib/registre";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";
import { z } from "zod";

/**
 * Rapport stratégique périodique — palier Premium + option "Comité".
 *
 * Garde-fou structurel, pas seulement documentaire : ce endpoint ne crée
 * QUE des rapports au statut "brouillon". Il n'existe volontairement AUCUNE
 * route qui passe un rapport à "envoye" sans renseigner `reviewedBy` — voir
 * PATCH ci-dessous. Un rapport ne doit jamais atteindre le client final
 * sans qu'un comptable partenaire identifié l'ait relu.
 */

const periodSchema = z.object({ period: z.string().min(1).max(20) });

export async function GET() {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);
    const reports = await prisma.strategicReport.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ reports });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const body = await req.json();
    const parsed = periodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Période invalide" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const registre = await computeRegistreActivite(businessId);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system:
        `Tu rédiges un rapport de synthèse périodique pour ${business?.name}. ` +
        `Interdiction absolue d'utiliser les mots "audit" ou "bilan" — ce sont des documents ` +
        `réglementés produits par un expert-comptable, jamais par toi. Utilise "rapport de synthèse". ` +
        `Positionne systématiquement ce rapport comme complémentaire au travail de l'expert-comptable, ` +
        `jamais comme un substitut. Toute observation doit être formulée comme un point à discuter ` +
        `avec un professionnel, jamais comme une décision arrêtée. ` +
        `Ce rapport N'A PAS ENCORE été relu par un humain — termine-le en le rappelant explicitement.`,
      messages: [{ role: "user", content: `Registre d'activité de la période : ${JSON.stringify(registre)}` }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const content = textBlock && "text" in textBlock ? textBlock.text : "";

    const report = await prisma.strategicReport.create({
      data: { businessId, period: parsed.data.period, content, status: "brouillon" },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    console.error("Erreur /api/strategic-reports:", err);
    const { status, message } = ownershipErrorToStatus(err);
    if (status !== 500) return NextResponse.json({ error: message }, { status });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
