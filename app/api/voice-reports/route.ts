import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { transcribeAudioBase64 } from "@/lib/transcription";
import { voiceReportSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";
import { checkRateLimit, getRequestKey } from "@/lib/rateLimit";

/**
 * Rappel légal (voir NOVA_Brief_Technique_v3.md, Phase 2) : cette
 * fonctionnalité est un compte-rendu d'activité pratique pour le
 * collaborateur, jamais un outil de notation de sa performance. Aucun champ
 * de scoring n'existe dans le modèle VoiceReport — à ne jamais en ajouter
 * sans revalidation juridique (droit du travail, RGPD).
 *
 * Avant un vrai lancement : information des salariés sur l'usage de cet
 * outil, validation du cadre légal avec un professionnel du droit du
 * travail — non fait dans cette version, voir README.
 */

export async function GET() {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);
    const reports = await prisma.voiceReport.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 50,
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

    const key = `voice-reports:${getRequestKey(req)}:${userId}`;
    if (!checkRateLimit(key, 30, 60_000)) {
      return NextResponse.json({ error: "Trop de requêtes, réessayez dans un instant." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = voiceReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides" }, { status: 400 });
    }

    if (parsed.data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
      if (!project || project.businessId !== businessId) {
        return NextResponse.json({ error: "Chantier invalide" }, { status: 400 });
      }
    }

    let transcript: string;
    let language = "fr";

    if (parsed.data.transcriptText) {
      // Mode démo : le texte est déjà fourni, pas d'appel de transcription.
      transcript = parsed.data.transcriptText;
    } else if (parsed.data.audioBase64) {
      // Mode production : nécessite GROQ_API_KEY configuré (voir lib/transcription.ts).
      try {
        const result = await transcribeAudioBase64(
          parsed.data.audioBase64,
          parsed.data.audioMimeType || "audio/webm"
        );
        transcript = result.transcript;
        language = result.language;
      } catch (err) {
        console.error("Erreur de transcription:", err);
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Transcription audio indisponible." },
          { status: 501 }
        );
      }
    } else {
      return NextResponse.json({ error: "Aucun contenu fourni" }, { status: 400 });
    }

    // Résumé structuré du transcript — appel Claude en texte, pas d'audio.
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const summaryResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system:
        `Tu résumes des comptes-rendus vocaux de chantier pour ${business?.name || "une entreprise du bâtiment"}. ` +
        `Structure le résumé en 3-5 points factuels (tâches réalisées, points bloquants signalés, matériel manquant). ` +
        `N'ajoute aucune appréciation sur la performance ou le rythme de travail de la personne — uniquement les faits rapportés.`,
      messages: [{ role: "user", content: transcript }],
    });
    const textBlock = summaryResponse.content.find((b) => b.type === "text");
    const summary = textBlock && "text" in textBlock ? textBlock.text : transcript;

    const report = await prisma.voiceReport.create({
      data: {
        businessId,
        projectId: parsed.data.projectId,
        authorLabel: parsed.data.authorLabel,
        transcript,
        summary,
        language,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    console.error("Erreur /api/voice-reports:", err);
    const { status, message } = ownershipErrorToStatus(err);
    if (status !== 500) return NextResponse.json({ error: message }, { status });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
