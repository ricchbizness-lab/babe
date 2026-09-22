"use client";

import { MetricBar, Skeleton, Table, type TableColumn } from "@/components/ui";
import { lastMonths, monthKey } from "@/lib/dates";
import type { DevisRow } from "./page";

type PeriodRow = { id: string; label: string; total: number; acceptes: number; taux: number };

export function AnalyseCommercial({ loading, devis }: { loading: boolean; devis: DevisRow[] }) {
  if (loading) return <Skeleton style={{ height: 300 }} />;

  const devisAcceptes = devis.filter((d) => d.status === "accepte");
  const montantMoyen = devisAcceptes.length > 0 ? devisAcceptes.reduce((sum, d) => sum + (d.amount || 0), 0) / devisAcceptes.length : 0;
  const tauxGlobal = devis.length > 0 ? Math.round((devisAcceptes.length / devis.length) * 100) : 0;

  const months = lastMonths(6);
  const periodRows: PeriodRow[] = months.map(({ key, label }) => {
    const devisDuMois = devis.filter((d) => monthKey(new Date(d.createdAt)) === key);
    const acceptesDuMois = devisDuMois.filter((d) => d.status === "accepte");
    return {
      id: key,
      label,
      total: devisDuMois.length,
      acceptes: acceptesDuMois.length,
      taux: devisDuMois.length > 0 ? Math.round((acceptesDuMois.length / devisDuMois.length) * 100) : 0,
    };
  });

  const columns: TableColumn<PeriodRow>[] = [
    { key: "label", label: "Mois", emphasis: "title" },
    { key: "total", label: "Devis créés", align: "right" },
    { key: "acceptes", label: "Acceptés", align: "right" },
    { key: "taux", label: "Taux de conversion", align: "right", render: (r) => `${r.taux}%` },
  ];

  return (
    <>
      <MetricBar
        items={[
          { label: "Montant moyen des devis acceptés", value: `${Math.round(montantMoyen).toLocaleString("fr-FR")} €` },
          { label: "Taux de conversion global", value: `${tauxGlobal}%` },
        ]}
      />
      <Table columns={columns} rows={periodRows} emptyLabel="Aucun devis." />
    </>
  );
}
