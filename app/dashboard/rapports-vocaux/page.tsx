"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mic } from "lucide-react";
import { EmptyState, Table, TableSkeleton, Timestamp, type TableColumn } from "@/components/ui";

type ReportRow = {
  id: string;
  authorLabel: string;
  summary: string;
  createdAt: string;
  project: { id: string; name: string } | null;
};

export default function RapportsVocauxPage() {
  const [reports, setReports] = useState<ReportRow[] | null>(null);

  useEffect(() => {
    fetch("/api/voice-reports")
      .then((res) => res.json())
      .then((data) => setReports(data.reports ?? []));
  }, []);

  const columns: TableColumn<ReportRow>[] = [
    { key: "authorLabel", label: "Auteur" },
    {
      key: "project",
      label: "Chantier",
      render: (r) =>
        r.project ? (
          <Link href={`/dashboard/chantiers/${r.project.id}`} className="nova-inline-link">
            {r.project.name}
          </Link>
        ) : (
          "—"
        ),
    },
    { key: "summary", label: "Résumé", render: (r) => <span className="nova-truncate">{r.summary}</span> },
    { key: "createdAt", label: "Le", render: (r) => <Timestamp date={r.createdAt} /> },
  ];

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Rapports vocaux</h1>
          <p className="nova-page-subtitle">
            {reports === null ? "…" : `${reports.length} rapport${reports.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/dashboard/rapports-vocaux/nouveau" className="nova-btn nova-btn-primary">
          <Mic size={16} strokeWidth={1.75} />
          Nouveau rapport
        </Link>
      </header>

      {reports === null ? (
        <TableSkeleton columns={4} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon="rapports-vocaux"
          title="Aucun rapport vocal pour l'instant"
          description="Les comptes rendus terrain de vos équipes apparaîtront ici, résumés automatiquement."
          actionLabel="Ajouter un rapport"
          actionHref="/dashboard/rapports-vocaux/nouveau"
        />
      ) : (
        <Table columns={columns} rows={reports} />
      )}
    </div>
  );
}
