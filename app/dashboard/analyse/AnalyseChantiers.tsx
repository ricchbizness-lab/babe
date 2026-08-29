"use client";

import { Badge, ProgressBar, Skeleton, Table, type BadgeTone, type TableColumn } from "@/components/ui";
import { depensesForProject } from "@/lib/achats";
import type { ProjectRow, PurchaseRow } from "./page";

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

type Row = ProjectRow & { depenses: number; marge: number | null; margePct: number | null; avancement: number };

export function AnalyseChantiers({ loading, projects, purchases }: { loading: boolean; projects: ProjectRow[]; purchases: PurchaseRow[] }) {
  if (loading) return <Skeleton style={{ height: 300 }} />;

  const rows: Row[] = projects.map((p) => {
    const depenses = depensesForProject(p.id, purchases);
    const marge = p.budgetPrevu != null ? p.budgetPrevu - depenses : null;
    const margePct = p.budgetPrevu != null && p.budgetPrevu > 0 ? (marge as number) / p.budgetPrevu * 100 : null;
    const avancement = p.tasks.length === 0 ? 0 : (p.tasks.filter((t) => t.done).length / p.tasks.length) * 100;
    return { ...p, depenses, marge, margePct, avancement };
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
      key: "depenses",
      label: "Dépenses",
      align: "right",
      render: (r) => `${r.depenses.toLocaleString("fr-FR")} €`,
    },
    {
      key: "marge",
      label: "Marge estimée",
      align: "right",
      render: (r) => (r.marge != null ? `${r.marge.toLocaleString("fr-FR")} €` : "—"),
      emphasis: "amount",
      sortable: true,
      sortValue: (r) => r.marge,
    },
    {
      key: "margePct",
      label: "Marge %",
      align: "right",
      render: (r) => (r.margePct != null ? `${Math.round(r.margePct)}%` : "—"),
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
        La colonne « Budget prévu » sert de base de calcul de marge pour chaque chantier (aucun lien direct entre les
        devis et un chantier précis dans les données actuelles). Les dépenses proviennent des achats rattachés.
      </p>
      <Table columns={columns} rows={rows} getRowHref={(r) => `/dashboard/chantiers/${r.id}`} emptyLabel="Aucun chantier." pageSize={10} />
    </>
  );
}
