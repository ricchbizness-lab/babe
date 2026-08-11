"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, EmptyState, Skeleton } from "@/components/ui";
import { addDays, formatShortDate, isSameDay, startOfWeek, weekDays } from "@/lib/dates";

type ProjectRow = { id: string; name: string; status: string };
type AssignmentRow = {
  id: string;
  date: string;
  teamMember: { id: string; name: string };
  project: { id: string; name: string; status: string } | null;
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

export default function PlanningPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[] | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects ?? []));
    fetch("/api/assignments")
      .then((res) => res.json())
      .then((data) => setAssignments(data.assignments ?? []));
  }, []);

  const activeProjects = (projects ?? []).filter((p) => p.status === "en_cours");
  const days = weekDays(weekStart);
  const weekEnd = addDays(weekStart, 4);
  const rangeLabel = `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)} ${weekEnd.getFullYear()}`;

  function assignmentsFor(projectId: string, day: Date) {
    return (assignments ?? []).filter((a) => a.project?.id === projectId && isSameDay(new Date(a.date), day));
  }

  const loading = projects === null || assignments === null;

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Planning</h1>
          <p className="nova-page-subtitle">{rangeLabel}</p>
        </div>
        <div className="nova-week-nav">
          <button type="button" className="nova-btn nova-btn-secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft size={16} strokeWidth={1.75} />
            Semaine précédente
          </button>
          <button type="button" className="nova-btn nova-btn-secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Semaine suivante
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="nova-planning-grid">
          {Array.from({ length: 5 }).map((_, i) => (
            <div className="nova-planning-day" key={i}>
              <Skeleton style={{ width: 70, height: 14, marginBottom: 12 }} />
              <Skeleton style={{ width: "100%", height: 56, marginBottom: 8 }} />
              <Skeleton style={{ width: "100%", height: 56 }} />
            </div>
          ))}
        </div>
      ) : activeProjects.length === 0 ? (
        <EmptyState
          icon="chantiers"
          title="Aucun chantier en cours"
          description="Passez un chantier au statut « en cours » pour le voir apparaître dans le planning de la semaine."
          actionLabel="Voir les chantiers"
          actionHref="/dashboard/chantiers"
        />
      ) : (
        <div className="nova-planning-grid">
          {days.map((day) => (
            <div key={day.label} className="nova-planning-day">
              <div className="nova-planning-day-header">
                <span className="nova-planning-day-label">{day.label}</span>
                <span className="nova-planning-day-date">{formatShortDate(day.date)}</span>
              </div>
              <div className="nova-planning-day-body">
                {activeProjects.map((p) => {
                  const dayAssignments = assignmentsFor(p.id, day.date);
                  return (
                    <div key={p.id} className="nova-planning-project">
                      <div className="nova-planning-project-head">
                        <Link href={`/dashboard/chantiers/${p.id}`} className="nova-inline-link">
                          {p.name}
                        </Link>
                        <Badge tone={STATUS_TONE[p.status] || "neutral"}>{STATUS_LABEL[p.status] || p.status}</Badge>
                      </div>
                      {dayAssignments.length === 0 ? (
                        <p className="nova-planning-empty">Aucune affectation</p>
                      ) : (
                        <ul className="nova-planning-people">
                          {dayAssignments.map((a) => (
                            <li key={a.id}>{a.teamMember.name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
