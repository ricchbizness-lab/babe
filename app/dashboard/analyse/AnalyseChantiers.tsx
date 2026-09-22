"use client";

import { Badge, ProgressBar, Skeleton, Table, type BadgeTone, type TableColumn } from "@/components/ui";
import { depensesForProject } from "@/lib/achats";
import { margeTone } from "@/lib/rentabilite";
import type { DevisRow, ProjectRow, PurchaseRow } from "./page";

const STATUS_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};
const STATUS_TONE: Record<string, BadgeTone> = {
  planifie: "neutral",
  en_cours: "blue",
  termine: "success",
  annule: "neutral",
};

/**
 * Montant facturé d'un chantier — un devis n'a pas de lien direct vers un
 * chantier dans le modèle de données actuel, on rattache donc les devis
 * acceptés par client (même approximation que l'onglet Factures de la
 * fiche chantier). Limite assumée : un client avec plusieurs chantiers
 * verra chacun de ses devis acceptés compté sur chacun de ses chantiers.
 */
function montantFactureForProject(clientId: string | undefined, devis: DevisRow[]): number {
  if (!clientId) return 0;
  return devis.filter((d) => d.status === "accepte" && d.client?.id === clientId).reduce((sum, d) => sum + (d.amount || 0), 0);
}

type Row = ProjectRow & { coutsReels: number; montantFacture: number; margeReelle: number; margePct: number | null; avancement: number };

export function AnalyseChantiers({
  loading,
  projects,
  purchases,
  devis,
}: {
  loading: boolean;
  projects: ProjectRow[];
  purchases: PurchaseRow[];
  devis: DevisRow[];
}) {
  if (loading) return <Skeleton style={{ height: 300 }} />;

  const rows: Row[] = projects.map((p) => {
    const coutsReels = depensesForProject(p.id, purchases);
    const montantFacture = montantFactureForProject(p.client?.id, devis);
    const margeReelle = montantFacture - coutsReels;
    const margePct = montantFacture > 0 ? (margeReelle / montantFacture) * 100 : null;
    const avancement = p.tasks.length === 0 ? 0 : (p.tasks.filter((t) => t.done).length / p.tasks.length) * 100;
    return { ...p, coutsReels, montantFacture, margeReelle, margePct, avancement };
  });

  const columns: TableColumn<Row>[] = [
    { key: "name", label: "Chantier", emphasis: "title" },
    { key: "client", label: "Client", render: (r) => r.client?.name || "—" },
    {
      key: "status",
      label: "Statut",
      render: (r) => <Badge tone={STATUS_TONE[r.status] || "neutral"}>{STATUS_LABEL[r.status] || r.status}</Badge>,
    },
    {
      key: "budget",
      label: "Budget prévu",
      align: "right",
      render: (r) => (r.budgetPrevu != null ? `${r.budgetPrevu.toLocaleString("fr-FR")} €` : "—"),
    },
    {
      key: "montantFacture",
      label: "Montant facturé",
      align: "right",
      render: (r) => `${r.montantFacture.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`,
      sortable: true,
      sortValue: (r) => r.montantFacture,
    },
    {
      key: "coutsReels",
      label: "Coûts réels",
      align: "right",
      render: (r) => `${r.coutsReels.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`,
    },
    {
      key: "margeReelle",
      label: "Marge réelle",
      align: "right",
      render: (r) => `${r.margeReelle.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`,
      emphasis: "amount",
      sortable: true,
      sortValue: (r) => r.margeReelle,
    },
    {
      key: "margePct",
      label: "Marge %",
      align: "right",
      render: (r) => (r.margePct != null ? <Badge tone={margeTone(r.margePct)}>{Math.round(r.margePct)}%</Badge> : "—"),
    },
    {
      key: "avancement",
      label: "Avancement",
      render: (r) => <ProgressBar value={r.avancement} />,
      sortable: true,
      sortValue: (r) => r.avancement,
    },
  ];

  return (
    <>
      <p className="nova-analyse-intro">
        Le montant facturé est calculé à partir des devis acceptés du client rattaché à chaque chantier (aucun lien
        direct entre les devis et un chantier précis dans les données actuelles). Les coûts réels proviennent des
        achats non annulés rattachés au chantier.
      </p>
      <Table columns={columns} rows={rows} getRowHref={(r) => `/dashboard/chantiers/${r.id}`} emptyLabel="Aucun chantier." pageSize={10} />
    </>
  );
}
