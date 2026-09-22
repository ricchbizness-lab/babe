"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  AvatarStack,
  Badge,
  EmptyState,
  FilterBar,
  FilterSelect,
  MetricBar,
  ProgressBar,
  Table,
  TableSkeleton,
  Timestamp,
  type TableColumn,
} from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  client: { id: string; name: string } | null;
  tasks: { done: boolean }[];
  assignments: { teamMember: { id: string; name: string } }[];
};

const STATUS_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};
const STATUS_TONE: Record<string, "neutral" | "teal" | "blue" | "success" | "danger"> = {
  planifie: "neutral",
  en_cours: "blue",
  termine: "success",
  annule: "neutral",
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

function progressFor(p: ProjectRow): number | null {
  if (p.tasks.length === 0) return null;
  return (p.tasks.filter((t) => t.done).length / p.tasks.length) * 100;
}

type PeriodeFilter = "all" | "mois" | "trimestre" | "annee";

function matchesPeriode(dateStr: string | null, filter: PeriodeFilter): boolean {
  if (filter === "all") return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  if (filter === "mois") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (filter === "trimestre") {
    const quarterOf = (m: number) => Math.floor(m / 3);
    return quarterOf(d.getMonth()) === quarterOf(now.getMonth()) && d.getFullYear() === now.getFullYear();
  }
  return d.getFullYear() === now.getFullYear();
}

function teamNamesFor(p: ProjectRow): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const a of p.assignments) {
    if (!seen.has(a.teamMember.id)) {
      seen.add(a.teamMember.id);
      names.push(a.teamMember.name);
    }
  }
  return names;
}

export default function ChantiersPage() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [collaborateurFilter, setCollaborateurFilter] = useState("all");
  const [periodeFilter, setPeriodeFilter] = useState<PeriodeFilter>("all");

  useEffect(() => {
    fetchWithAuth("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects ?? []));
  }, []);

  const clientOptions = Array.from(
    new Map((projects ?? []).filter((p) => p.client).map((p) => [p.client!.id, p.client!.name])).entries()
  );
  const collaborateurOptions = Array.from(
    new Map((projects ?? []).flatMap((p) => p.assignments.map((a) => [a.teamMember.id, a.teamMember.name] as const))).entries()
  );

  const filtered = (projects ?? []).filter((p) => {
    const matchesStatus = filter === "all" || p.status === filter;
    const matchesClient = clientFilter === "all" || p.client?.id === clientFilter;
    const matchesCollaborateur =
      collaborateurFilter === "all" || p.assignments.some((a) => a.teamMember.id === collaborateurFilter);
    const matchesPeriodeFilter = matchesPeriode(p.startDate, periodeFilter);
    return matchesStatus && matchesClient && matchesCollaborateur && matchesPeriodeFilter;
  });

  const filtersActive = filter !== "all" || clientFilter !== "all" || collaborateurFilter !== "all" || periodeFilter !== "all";
  function resetFilters() {
    setFilter("all");
    setClientFilter("all");
    setCollaborateurFilter("all");
    setPeriodeFilter("all");
  }

  const now = new Date();
  const enCoursCount = (projects ?? []).filter((p) => p.status === "en_cours").length;
  const planifiesCount = (projects ?? []).filter((p) => p.status === "planifie").length;
  const termineCeMoisCount = (projects ?? []).filter(
    (p) =>
      p.status === "termine" &&
      p.endDate &&
      new Date(p.endDate).getMonth() === now.getMonth() &&
      new Date(p.endDate).getFullYear() === now.getFullYear()
  ).length;

  const columns: TableColumn<ProjectRow>[] = [
    { key: "name", label: "Chantier", emphasis: "title" },
    { key: "client", label: "Client", render: (p) => p.client?.name || "—" },
    {
      key: "status",
      label: "Statut",
      render: (p) => <Badge tone={STATUS_TONE[p.status] || "neutral"}>{STATUS_LABEL[p.status] || p.status}</Badge>,
      sortable: true,
      sortValue: (p) => STATUS_ORDER[p.status] ?? 99,
    },
    {
      key: "progress",
      label: "Progression",
      render: (p) => {
        const value = progressFor(p);
        return value === null ? <span className="nova-ink-faint">—</span> : <ProgressBar value={value} />;
      },
      sortable: true,
      sortValue: (p) => progressFor(p) ?? -1,
    },
    {
      key: "equipe",
      label: "Équipe",
      render: (p) => <AvatarStack names={teamNamesFor(p)} />,
    },
    {
      key: "dates",
      label: "Dates",
      render: (p) => formatDateRange(p.startDate, p.endDate),
      sortable: true,
      sortValue: (p) => (p.startDate ? new Date(p.startDate).getTime() : null),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: () => <ChevronRight size={16} strokeWidth={1.75} className="nova-ink-faint" />,
    },
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
        <MetricBar
          items={[
            { label: "Total chantiers", value: projects.length },
            { label: "En cours", value: enCoursCount },
            { label: "Planifiés", value: planifiesCount },
            { label: "Terminés ce mois", value: termineCeMoisCount },
          ]}
        />
      )}

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

      {projects !== null && projects.length > 0 && (
        <FilterBar onReset={resetFilters} active={filtersActive}>
          <FilterSelect label="Client" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
            <option value="all">Tous</option>
            {clientOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Collaborateur"
            value={collaborateurFilter}
            onChange={(e) => setCollaborateurFilter(e.target.value)}
          >
            <option value="all">Tous</option>
            {collaborateurOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Période" value={periodeFilter} onChange={(e) => setPeriodeFilter(e.target.value as PeriodeFilter)}>
            <option value="all">Toutes</option>
            <option value="mois">Ce mois</option>
            <option value="trimestre">Ce trimestre</option>
            <option value="annee">Cette année</option>
          </FilterSelect>
        </FilterBar>
      )}

      {projects === null ? (
        <TableSkeleton columns={7} />
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
          pageSize={10}
        />
      )}
    </div>
  );
}
