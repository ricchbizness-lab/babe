"use client";

import { Skeleton, Table, type TableColumn } from "@/components/ui";
import type { DevisRow, ProjectRow } from "./page";

type ClientRow = { id: string; name: string; ca: number; chantiers: number };

export function AnalyseClients({ loading, devis, projects }: { loading: boolean; devis: DevisRow[]; projects: ProjectRow[] }) {
  if (loading) return <Skeleton style={{ height: 300 }} />;

  const byClient = new Map<string, ClientRow>();

  for (const d of devis) {
    if (!d.client) continue;
    if (!byClient.has(d.client.id)) byClient.set(d.client.id, { id: d.client.id, name: d.client.name, ca: 0, chantiers: 0 });
    if (d.status === "accepte") byClient.get(d.client.id)!.ca += d.amount || 0;
  }
  for (const p of projects) {
    if (!p.client) continue;
    if (!byClient.has(p.client.id)) byClient.set(p.client.id, { id: p.client.id, name: p.client.name, ca: 0, chantiers: 0 });
    byClient.get(p.client.id)!.chantiers += 1;
  }

  const rows = [...byClient.values()].sort((a, b) => b.ca - a.ca);

  const columns: TableColumn<ClientRow>[] = [
    { key: "name", label: "Client", emphasis: "title" },
    {
      key: "ca",
      label: "CA (devis acceptés)",
      align: "right",
      render: (r) => `${r.ca.toLocaleString("fr-FR")} €`,
      emphasis: "amount",
      sortable: true,
      sortValue: (r) => r.ca,
    },
    { key: "chantiers", label: "Nombre de chantiers", align: "right", render: (r) => r.chantiers },
  ];

  return (
    <>
      <p className="nova-analyse-intro">
        Le délai de paiement moyen par client n'est pas affiché : aucune date de paiement n'est conservée
        séparément de la date d'acceptation dans les données actuelles.
      </p>
      <Table columns={columns} rows={rows} getRowHref={(r) => `/dashboard/clients/${r.id}`} emptyLabel="Aucun client." pageSize={10} />
    </>
  );
}
