import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { parsePeriod } from "@/lib/dates";
import { computeStrategicReportData } from "@/lib/strategicReportData";
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

    const range = parsePeriod(parsed.data.period);
    if (!range) {
      return NextResponse.json(
        { error: "Format de période invalide — utilisez AAAA (année), AAAA-MM (mois) ou AAAA-TN (trimestre, ex. 2026-T3)." },
        { status: 400 }
      );
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const data = await computeStrategicReportData(businessId, range);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1800,
      system:
        `Tu rédiges un rapport de synthèse périodique pour ${business?.name}, sur la période ${data.periode.label} ` +
        `(du ${data.periode.debut} au ${data.periode.fin}). ` +
        `Interdiction absolue d'utiliser les mots "audit" ou "bilan" — ce sont des documents ` +
        `réglementés produits par un expert-comptable, jamais par toi. Utilise "rapport de synthèse". ` +
        `Positionne systématiquement ce rapport comme complémentaire au travail de l'expert-comptable, ` +
        `jamais comme un substitut. Toute observation doit être formulée comme un point à discuter ` +
        `avec un professionnel, jamais comme une décision arrêtée. ` +
        `Tu structures TOUJOURS le rapport en 4 sections, dans cet ordre, avec ces titres exacts : ` +
        `"Résumé de période", "Analyse financière", "Activité équipe", "Recommandations Nova". ` +
        `Tu t'appuies UNIQUEMENT sur les données JSON fournies dans le message utilisateur — n'invente ` +
        `jamais un chiffre qui n'y figure pas. Quand une donnée vaut null (ex. marge moyenne par chantier, ` +
        `délai moyen de paiement), indique explicitement qu'elle n'est pas disponible plutôt que de l'omettre ` +
        `silencieusement ou de l'estimer toi-même. La section "Recommandations Nova" contient 3 à 5 ` +
        `recommandations concrètes, formulées comme des options à évaluer ("vous pourriez envisager...", ` +
        `"une piste possible serait...") — jamais comme des directives ("vous devez", "il faut"). ` +
        `Tu génères du texte professionnel structuré. Tu n'utilises JAMAIS de Markdown : pas de #, ##, **, *, ` +
        `|, >, ni aucun autre symbole de formatage — seulement des sauts de ligne et des tirets "-" pour les listes. ` +
        `Ce rapport N'A PAS ENCORE été relu par un humain — termine-le en le rappelant explicitement.`,
      messages: [{ role: "user", content: `Données de la période, au format JSON :\n${JSON.stringify(data, null, 2)}` }],
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
