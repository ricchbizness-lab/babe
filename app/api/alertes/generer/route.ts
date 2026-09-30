import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";
import { daysSinceSent, joursRetardPaiement } from "@/lib/relance";
import { sendPushToUser } from "@/lib/pushSend";

type Priorite = "haute" | "moyenne" | "basse";

type AlerteCandidate = {
  type: string;
  titre: string;
  message: string;
  priorite: Priorite;
  lien: string | null;
};

const TROIS_JOURS_MS = 3 * 24 * 60 * 60 * 1000;
const QUATORZE_JOURS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Analyse les données existantes (jamais de nouvelle donnée simulée) et crée
 * les alertes correspondantes — dédupliquées par (type, lien) tant qu'une
 * alerte non lue de ce couple existe déjà, ce qui couvre à la fois "pas de
 * doublon le même jour" et "pas de doublon tant que l'utilisateur n'a pas
 * traité la précédente".
 */
export async function POST() {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const now = new Date();

    const [devisEnvoyes, facturesImpayees, chantiersEnRetard, tachesEnRetard, dernierDevis, rapportAncien] = await Promise.all([
      prisma.devis.findMany({
        where: { businessId, status: "envoye" },
        select: { id: true, label: true, updatedAt: true },
      }),
      prisma.devis.findMany({
        where: { businessId, status: "accepte", paymentStatus: { not: "payee" } },
        select: { id: true, label: true, updatedAt: true },
      }),
      prisma.project.findMany({
        where: { businessId, status: "planifie", startDate: { lt: now } },
        select: { id: true, name: true },
      }),
      prisma.task.findMany({
        where: { businessId, done: false, dueDate: { lt: now } },
        select: { id: true, text: true },
        orderBy: { dueDate: "asc" },
      }),
      prisma.devis.findFirst({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.voiceReport.findFirst({
        where: { businessId, createdAt: { lt: new Date(now.getTime() - TROIS_JOURS_MS) } },
        select: { id: true },
      }),
    ]);

    const candidates: AlerteCandidate[] = [];

    for (const d of devisEnvoyes) {
      const days = daysSinceSent(d.updatedAt.toISOString());
      if (days > 14) {
        candidates.push({
          type: "devis_relance_urgent",
          titre: "Devis urgent à relancer",
          message: `Le devis « ${d.label} » est resté sans réponse depuis ${days} jours.`,
          priorite: "haute",
          lien: `/dashboard/devis/${d.id}`,
        });
      } else if (days > 7) {
        candidates.push({
          type: "devis_relance",
          titre: "Devis à relancer",
          message: `Le devis « ${d.label} » est resté sans réponse depuis ${days} jours.`,
          priorite: "haute",
          lien: `/dashboard/devis/${d.id}`,
        });
      }
    }

    for (const f of facturesImpayees) {
      const retard = joursRetardPaiement(f.updatedAt.toISOString());
      if (retard > 0) {
        candidates.push({
          type: "facture_retard",
          titre: "Facture en retard",
          message: `La facture « ${f.label} » est impayée depuis plus de 30 jours (${retard} jour${retard > 1 ? "s" : ""} de retard).`,
          priorite: "haute",
          lien: `/dashboard/facturation/${f.id}`,
        });
      }
    }

    for (const p of chantiersEnRetard) {
      candidates.push({
        type: "chantier_a_demarrer",
        titre: "Chantier à démarrer",
        message: `Le chantier « ${p.name} » devait démarrer mais reste au statut « planifié ».`,
        priorite: "moyenne",
        lien: `/dashboard/chantiers/${p.id}`,
      });
    }

    if (tachesEnRetard.length > 0) {
      candidates.push({
        type: "tache_retard",
        titre: "Tâche en retard",
        message:
          tachesEnRetard.length === 1
            ? `La tâche « ${tachesEnRetard[0].text} » a dépassé son échéance.`
            : `${tachesEnRetard.length} tâches ont dépassé leur échéance, dont « ${tachesEnRetard[0].text} ».`,
        priorite: "moyenne",
        lien: "/dashboard/taches",
      });
    }

    if (dernierDevis && now.getTime() - dernierDevis.createdAt.getTime() > QUATORZE_JOURS_MS) {
      candidates.push({
        type: "activite_faible",
        titre: "Activité commerciale faible",
        message: "Aucun nouveau devis n'a été créé depuis plus de 14 jours.",
        priorite: "basse",
        lien: "/dashboard/devis",
      });
    }

    // rapportAncien signale qu'au moins un rapport vocal date de plus de
    // 3 jours — VoiceReport n'a pas de statut "traité" en base (son résumé
    // IA est généré dès la création), l'alerte sert donc de rappel de
    // relecture/suivi terrain plutôt que d'un vrai indicateur de traitement.
    if (rapportAncien) {
      candidates.push({
        type: "rapports_vocaux_attente",
        titre: "Rapports vocaux en attente",
        message: "Des rapports vocaux de terrain de plus de 3 jours restent à consulter.",
        priorite: "basse",
        lien: "/dashboard/rapports-vocaux",
      });
    }

    const created: { id: string; titre: string; priorite: string; lien: string | null }[] = [];
    for (const c of candidates) {
      const existing = await prisma.alerte.findFirst({
        where: { businessId, type: c.type, lien: c.lien, lu: false },
      });
      if (existing) continue;
      const alerte = await prisma.alerte.create({
        data: { businessId, type: c.type, titre: c.titre, message: c.message, priorite: c.priorite, lien: c.lien },
      });
      created.push(alerte);
    }

    const hautesCreees = created.filter((a) => a.priorite === "haute");
    if (hautesCreees.length > 0) {
      for (const a of hautesCreees) {
        await sendPushToUser(userId, { title: "Nova — Alerte", body: a.titre, url: a.lien || "/dashboard/alertes" });
      }
    }

    return NextResponse.json({ created: created.length });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
