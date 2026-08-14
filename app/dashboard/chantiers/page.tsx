"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState, Table, TableSkeleton, Timestamp, type TableColumn } from "@/components/ui";

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  client: { id: string; name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};
const STATUS_TONE: Record<string, "neutral" | "teal" | "success" | "danger"> = {
  planifie: "neutral",
  en_cours: "teal",
  termine: "success",
  annule: "danger",
};
const STATUS_ORDER: Record<string, number> = {
  planifie: 0,
  en_cours: 1,
  termine: 2,
  annule: 3,
};
const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "planifie", label: "Planifié" },
  { key: "en_cours", label: "En cours" },
  { key: "termine", label: "Terminé" },
  { key: "annule", label: "Annulé" },
];

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "—";
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  if (start) return `Début ${fmt(start)}`;
  return `Fin ${fmt(end as string)}`;
}

export default function ChantiersPage() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects ?? []));
  }, []);

  const filtered = (projects ?? []).filter((p) => filter === "all" || p.status === filter);

  const columns: TableColumn<ProjectRow>[] = [
    { key: "name", label: "Chantier" },
    { key: "client", label: "Client", render: (p) => p.client?.name || "—" },
    {
      key: "status",
      label: "Statut",
      render: (p) => <Badge tone={STATUS_TONE[p.status] || "neutral"}>{STATUS_LABEL[p.status] || p.status}</Badge>,
      sortable: true,
      sortValue: (p) => STATUS_ORDER[p.status] ?? 99,
    },
    {
      key: "dates",
      label: "Dates",
      render: (p) => formatDateRange(p.startDate, p.endDate),
      sortable: true,
      sortValue: (p) => (p.startDate ? new Date(p.startDate).getTime() : null),
    },
    { key: "createdAt", label: "Créé le", render: (p) => <Timestamp date={p.createdAt} /> },
  ];

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Chantiers</h1>
          <p className="nova-page-subtitle">
            {projects === null ? "…" : `${projects.length} chantier${projects.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/dashboard/chantiers/nouveau" className="nova-btn nova-btn-primary">
          Nouveau chantier
        </Link>
      </header>

      {projects !== null && projects.length > 0 && (
        <div className="nova-filter-row">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`nova-filter-chip ${filter === f.key ? "nova-filter-chip-active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {projects === null ? (
        <TableSkeleton columns={5} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon="chantiers"
          title="Aucun chantier pour l'instant — ajoutez votre premier chantier"
          description="Suivez ici l'avancement de vos chantiers, du planifié au terminé."
          actionLabel="Ajouter un chantier"
          actionHref="/dashboard/chantiers/nouveau"
        />
      ) : (
        <Table
          columns={columns}
          rows={filtered}
          getRowHref={(p) => `/dashboard/chantiers/${p.id}`}
          emptyLabel="Aucun chantier pour ce filtre."
        />
      )}
    </div>
  );
}
