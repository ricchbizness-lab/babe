import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";
import { relanceLevel } from "@/lib/relance";
import { sortByAcceptedDate, invoiceNumber, computeInvoiceAmounts } from "@/lib/facturation";
import { lastMonths, monthKey } from "@/lib/dates";

type ActivityRow = {
  id: string;
  kind: "devis" | "facture" | "chantier";
  reference: string;
  clientOrChantier: string;
  amount: number | null;
  status: string;
  date: string;
  href: string;
};

type AFaireItem = {
  id: string;
  kind: "devis" | "facture" | "chantier" | "tache";
  title: string;
  subtitle: string;
  date: string | null;
  urgent: boolean;
  href: string;
};

export async function GET() {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const [user, business, devisAll, projectsAll, tasksOverdue] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } }),
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.devis.findMany({ where: { businessId }, include: { client: true }, orderBy: { createdAt: "desc" } }),
      prisma.project.findMany({ where: { businessId }, include: { client: true }, orderBy: { createdAt: "desc" } }),
      prisma.task.findMany({
        where: { businessId, done: false, dueDate: { lt: new Date() } },
        include: { project: true },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
    ]);

    const devisEnAttente = devisAll.filter((d) => d.status === "envoye");
    const devisAcceptes = devisAll.filter((d) => d.status === "accepte");
    const facturesImpayees = devisAcceptes.filter((d) => d.paymentStatus !== "payee");
    const relances = devisEnAttente.filter((d) => relanceLevel(d.status, d.updatedAt.toISOString()).level !== "none");
    const chantiersEnCours = projectsAll.filter((p) => p.status === "en_cours");
    const chantiersADemarrer = projectsAll.filter((p) => p.status === "planifie");

    // Numérotation des factures identique à /dashboard/facturation — un devis
    // accepté EST la facture, le numéro est recalculé à la volée.
    const facturesChronological = sortByAcceptedDate(
      devisAcceptes.map((d) => ({ ...d, updatedAt: d.updatedAt.toISOString() }))
    );
    const factureNumeroById = new Map(
      facturesChronological.map((d, i) => [d.id, invoiceNumber(i, d.updatedAt)])
    );

    // --- Graphique 6 mois : CA (devis acceptés) vs factures encaissées ---
    const months = lastMonths(6);
    const chart = months.map(({ key, label }) => {
      const ca = devisAcceptes
        .filter((d) => monthKey(d.updatedAt) === key)
        .reduce((sum, d) => sum + (d.amount || 0), 0);
      const encaisse = devisAcceptes
        .filter((d) => d.paymentStatus === "payee" && monthKey(d.updatedAt) === key)
        .reduce((sum, d) => sum + (d.amount || 0), 0);
      return { month: label, ca, encaisse };
    });

    // --- À faire ---
    const aFaire: AFaireItem[] = [
      ...relances.map((d) => {
        const level = relanceLevel(d.status, d.updatedAt.toISOString());
        return {
          id: `relance-${d.id}`,
          kind: "devis" as const,
          title: `Relancer le devis « ${d.label} »`,
          subtitle: d.client?.name || "Sans client",
          date: d.updatedAt.toISOString(),
          urgent: level.level === "danger",
          href: `/dashboard/devis/${d.id}`,
        };
      }),
      ...facturesImpayees.map((d) => ({
        id: `facture-${d.id}`,
        kind: "facture" as const,
        title: `Facture impayée « ${factureNumeroById.get(d.id) || d.label} »`,
        subtitle: d.client?.name || "Sans client",
        date: d.updatedAt.toISOString(),
        urgent: true,
        href: `/dashboard/facturation/${d.id}`,
      })),
      ...chantiersADemarrer.map((p) => ({
        id: `chantier-${p.id}`,
        kind: "chantier" as const,
        title: `Démarrer « ${p.name} »`,
        subtitle: p.client?.name || "Sans client",
        date: p.startDate ? p.startDate.toISOString() : null,
        urgent: false,
        href: `/dashboard/chantiers/${p.id}`,
      })),
      ...tasksOverdue.map((t) => ({
        id: `tache-${t.id}`,
        kind: "tache" as const,
        title: t.text,
        subtitle: t.project?.name || "Sans chantier",
        date: t.dueDate ? t.dueDate.toISOString() : null,
        urgent: true,
        href: "/dashboard/taches",
      })),
    ]
      .sort((a, b) => (a.date && b.date ? new Date(a.date).getTime() - new Date(b.date).getTime() : 0))
      .slice(0, 6);

    // --- Dernières activités : devis non acceptés + factures + chantiers ---
    const activites: ActivityRow[] = [
      ...devisAll
        .filter((d) => d.status !== "accepte")
        .map((d) => ({
          id: `devis-${d.id}`,
          kind: "devis" as const,
          reference: d.label,
          clientOrChantier: d.client?.name || "—",
          amount: d.amount,
          status: d.status,
          date: d.createdAt.toISOString(),
          href: `/dashboard/devis/${d.id}`,
        })),
      ...devisAcceptes.map((d) => ({
        id: `facture-${d.id}`,
        kind: "facture" as const,
        reference: factureNumeroById.get(d.id) || d.label,
        clientOrChantier: d.client?.name || "—",
        amount: computeInvoiceAmounts(d.amount)?.ttc ?? d.amount,
        status: d.paymentStatus,
        date: d.updatedAt.toISOString(),
        href: `/dashboard/facturation/${d.id}`,
      })),
      ...projectsAll.map((p) => ({
        id: `chantier-${p.id}`,
        kind: "chantier" as const,
        reference: p.name,
        clientOrChantier: p.client?.name || "—",
        amount: null,
        status: p.status,
        date: p.createdAt.toISOString(),
        href: `/dashboard/chantiers/${p.id}`,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    return NextResponse.json({
      businessName: business?.name || "",
      firstName: user?.firstName || null,
      metrics: {
        devisEnCours: devisEnAttente.length,
        facturesEnAttente: facturesImpayees.length,
        relancesActives: relances.length,
        chantiersEnCours: chantiersEnCours.length,
      },
      chart,
      aFaire,
      activites,
    });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
