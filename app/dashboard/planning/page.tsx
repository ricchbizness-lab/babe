"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  DatePickerField,
  EditModal,
  EmptyState,
  Field,
  SelectField,
  Skeleton,
  TextareaField,
  colorFromName,
  initialsFromName,
  useToast,
  type BadgeTone,
} from "@/components/ui";
import { addDays, addMonths, formatShortDate, isSameDay, monthGrid, startOfWeek, toDateKey, weekDays } from "@/lib/dates";
import { fetchWithAuth } from "@/lib/fetchClient";
import { LOCALE_TO_BCP47, resolveLocale } from "@/lib/i18n";

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  client: { id: string; name: string } | null;
  tasks: { done: boolean }[];
};

const GANTT_WEEKS_VISIBLE = 8;
const GANTT_DAYS_VISIBLE = GANTT_WEEKS_VISIBLE * 7;

const GANTT_STATUS_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
};
const GANTT_STATUS_TONE: Record<string, BadgeTone> = {
  planifie: "blue",
  en_cours: "teal",
  termine: "success",
};
const GANTT_STATUS_BAR_CLASS: Record<string, string> = {
  planifie: "nova-gantt-bar-planifie",
  en_cours: "nova-gantt-bar-en-cours",
  termine: "nova-gantt-bar-termine",
};
type MemberRow = { id: string; name: string; role: string | null };
type ClientOption = { id: string; name: string };
type AssignmentRow = {
  id: string;
  date: string;
  note: string | null;
  teamMember: { id: string; name: string; role: string | null };
  project: { id: string; name: string; status: string } | null;
};

function formatMonthYear(date: Date, bcp47: string): string {
  const label = date.toLocaleDateString(bcp47, { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function PlanningPage() {
  const t = useTranslations("planning");
  const locale = resolveLocale(useLocale());
  const bcp47 = LOCALE_TO_BCP47[locale];
  const WEEKDAY_LABELS = [t("weekdayMon"), t("weekdayTue"), t("weekdayWed"), t("weekdayThu"), t("weekdayFri"), t("weekdaySat"), t("weekdaySun")];
  const [mode, setMode] = useState<"semaine" | "mois" | "gantt">("semaine");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [ganttStart, setGanttStart] = useState(() => startOfWeek(new Date()));
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[] | null>(null);
  const [detail, setDetail] = useState<AssignmentRow | null>(null);
  const [ganttDetail, setGanttDetail] = useState<ProjectRow | null>(null);
  const [ganttDateForm, setGanttDateForm] = useState({ startDate: "", endDate: "" });
  const [savingGanttDates, setSavingGanttDates] = useState(false);
  const toast = useToast();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [newChantierOpen, setNewChantierOpen] = useState(false);
  const [newChantierForm, setNewChantierForm] = useState({ name: "", clientId: "", startDate: "", endDate: "" });
  const [creatingChantier, setCreatingChantier] = useState(false);

  const [quickAssignTarget, setQuickAssignTarget] = useState<{ project: ProjectRow; weekDate: Date } | null>(null);
  const [quickAssignForm, setQuickAssignForm] = useState({ teamMemberId: "", date: "", note: "" });
  const [creatingQuickAssign, setCreatingQuickAssign] = useState(false);

  useEffect(() => {
    fetchWithAuth("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects ?? []));
    fetchWithAuth("/api/team")
      .then((res) => res.json())
      .then((data) => setMembers((data.members ?? []).map((m: MemberRow) => ({ id: m.id, name: m.name, role: m.role }))));
    fetchWithAuth("/api/assignments")
      .then((res) => res.json())
      .then((data) => setAssignments(data.assignments ?? []));
    fetchWithAuth("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients((data.clients ?? []).map((c: ClientOption) => ({ id: c.id, name: c.name }))));
  }, []);

  function reloadProjects() {
    fetchWithAuth("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects ?? []));
  }

  const loading = projects === null || members === null || assignments === null;
  const membersList = members ?? [];
  const projectsList = projects ?? [];
  const assignmentsList = assignments ?? [];

  const days = weekDays(weekStart);
  const weekEnd = addDays(weekStart, 6);
  const rangeLabel = `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)} ${weekEnd.getFullYear()}`;
  const todayKey = toDateKey(new Date());

  function assignmentsForCell(memberId: string, day: Date) {
    return assignmentsList.filter((a) => a.teamMember.id === memberId && isSameDay(new Date(a.date), day));
  }

  function activeProjectsOnDay(day: Date): ProjectRow[] {
    return projectsList.filter((p) => {
      if (p.status !== "en_cours") return false;
      if (!p.startDate || !p.endDate) return true;
      return new Date(p.startDate) <= day && new Date(p.endDate) >= day;
    });
  }

  // --- Vue Gantt (sprint 3, point 3) — SVG maison via CSS, pas de lib tierce ---

  const ganttProjects = projectsList.filter((p) => p.status === "en_cours" || p.status === "planifie");
  const ganttWeeks = Array.from({ length: GANTT_WEEKS_VISIBLE }, (_, i) => addDays(ganttStart, i * 7));
  const ganttRangeEnd = addDays(ganttStart, GANTT_DAYS_VISIBLE);

  function isCurrentGanttWeek(weekDate: Date): boolean {
    const now = new Date();
    return weekDate <= now && now < addDays(weekDate, 7);
  }

  function ganttAvancement(p: ProjectRow): number {
    if (p.tasks.length === 0) return 0;
    return Math.round((p.tasks.filter((t) => t.done).length / p.tasks.length) * 100);
  }

  /** Collaborateurs affectés à ce chantier (toutes dates confondues), dédupliqués — pour répondre à "qui travaille dessus" au premier coup d'œil sur le Gantt. */
  function teamForProject(projectId: string): { id: string; name: string }[] {
    const seen = new Set<string>();
    const team: { id: string; name: string }[] = [];
    for (const a of assignmentsList) {
      if (a.project?.id === projectId && !seen.has(a.teamMember.id)) {
        seen.add(a.teamMember.id);
        team.push(a.teamMember);
      }
    }
    return team;
  }

  function openGanttDetail(p: ProjectRow) {
    setGanttDetail(p);
    setGanttDateForm({
      startDate: p.startDate ? toDateKey(new Date(p.startDate)) : "",
      endDate: p.endDate ? toDateKey(new Date(p.endDate)) : "",
    });
  }

  async function handleSaveGanttDates() {
    if (!ganttDetail || !ganttDateForm.startDate || !ganttDateForm.endDate) return;
    setSavingGanttDates(true);
    try {
      const res = await fetchWithAuth(`/api/projects/${ganttDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(`${ganttDateForm.startDate}T00:00:00.000Z`).toISOString(),
          endDate: new Date(`${ganttDateForm.endDate}T00:00:00.000Z`).toISOString(),
        }),
      });
      if (!res.ok) {
        toast.error("Impossible de mettre à jour les dates.");
        return;
      }
      const data = await res.json();
      setProjects((prev) =>
        (prev ?? []).map((p) => (p.id === data.project.id ? { ...p, startDate: data.project.startDate, endDate: data.project.endDate } : p))
      );
      setGanttDetail((prev) => (prev ? { ...prev, startDate: data.project.startDate, endDate: data.project.endDate } : prev));
      toast.success("Dates mises à jour");
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingGanttDates(false);
    }
  }

  function openNewChantier(weekDate: Date) {
    setNewChantierForm({ name: "", clientId: "", startDate: toDateKey(weekDate), endDate: toDateKey(addDays(weekDate, 6)) });
    setNewChantierOpen(true);
  }

  async function handleCreateChantier() {
    if (!newChantierForm.name.trim()) {
      toast.error("Le nom du chantier est requis.");
      return;
    }
    setCreatingChantier(true);
    try {
      const res = await fetchWithAuth("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChantierForm.name,
          clientId: newChantierForm.clientId || undefined,
          status: "planifie",
          startDate: newChantierForm.startDate ? new Date(`${newChantierForm.startDate}T00:00:00.000Z`).toISOString() : undefined,
          endDate: newChantierForm.endDate ? new Date(`${newChantierForm.endDate}T00:00:00.000Z`).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de créer ce chantier.");
        return;
      }
      toast.success("Chantier créé");
      setNewChantierOpen(false);
      reloadProjects();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setCreatingChantier(false);
    }
  }

  function openQuickAssign(project: ProjectRow, weekDate: Date) {
    setQuickAssignTarget({ project, weekDate });
    setQuickAssignForm({ teamMemberId: "", date: toDateKey(weekDate), note: "" });
  }

  async function handleCreateQuickAssign() {
    if (!quickAssignTarget) return;
    if (!quickAssignForm.teamMemberId) {
      toast.error("Choisissez un collaborateur.");
      return;
    }
    setCreatingQuickAssign(true);
    try {
      const res = await fetchWithAuth("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamMemberId: quickAssignForm.teamMemberId,
          projectId: quickAssignTarget.project.id,
          date: new Date(`${quickAssignForm.date}T00:00:00.000Z`).toISOString(),
          note: quickAssignForm.note || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de créer l'affectation.");
        return;
      }
      const data = await res.json();
      setAssignments((prev) => [...(prev ?? []), data.assignment]);
      toast.success("Affectation créée");
      setQuickAssignTarget(null);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setCreatingQuickAssign(false);
    }
  }

  /** Position/largeur de la barre en % de la fenêtre visible, tronquée aux bords si le chantier déborde. */
  function ganttBarStyle(p: ProjectRow): { left: string; width: string; hidden: boolean } | null {
    if (!p.startDate || !p.endDate) return null;
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    if (end < ganttStart || start > ganttRangeEnd) {
      return { left: "0%", width: "0%", hidden: true };
    }
    const clampedStart = start < ganttStart ? ganttStart : start;
    const clampedEnd = end > ganttRangeEnd ? ganttRangeEnd : end;
    const offsetDays = (clampedStart.getTime() - ganttStart.getTime()) / 86_400_000;
    const durationDays = Math.max(1, (clampedEnd.getTime() - clampedStart.getTime()) / 86_400_000 + 1);
    return {
      left: `${(offsetDays / GANTT_DAYS_VISIBLE) * 100}%`,
      width: `${(durationDays / GANTT_DAYS_VISIBLE) * 100}%`,
      hidden: false,
    };
  }

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>{t("title")}</h1>
          <p className="nova-page-subtitle">
            {mode === "semaine"
              ? rangeLabel
              : mode === "mois"
                ? formatMonthYear(monthStart, bcp47)
                : `${formatShortDate(ganttStart)} – ${formatShortDate(addDays(ganttStart, GANTT_DAYS_VISIBLE - 1))}`}
          </p>
        </div>
        <div className="nova-header-actions">
          <div className="nova-mode-toggle">
            <button
              type="button"
              className={`nova-mode-toggle-btn ${mode === "semaine" ? "nova-mode-toggle-btn-active" : ""}`}
              onClick={() => setMode("semaine")}
            >
              {t("week")}
            </button>
            <button
              type="button"
              className={`nova-mode-toggle-btn ${mode === "mois" ? "nova-mode-toggle-btn-active" : ""}`}
              onClick={() => setMode("mois")}
            >
              {t("month")}
            </button>
            <button
              type="button"
              className={`nova-mode-toggle-btn ${mode === "gantt" ? "nova-mode-toggle-btn-active" : ""}`}
              onClick={() => setMode("gantt")}
            >
              Gantt
            </button>
          </div>
          <Link href="/dashboard/planning/dispatch" className="nova-btn nova-btn-primary">
            <Plus size={16} strokeWidth={1.75} />
            {t("newIntervention")}
          </Link>
        </div>
      </header>

      {mode === "semaine" && (
        <div className="nova-week-nav">
          <button type="button" className="nova-btn nova-btn-secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft size={16} strokeWidth={1.75} />
            {t("prevWeek")}
          </button>
          <button type="button" className="nova-btn nova-btn-secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            {t("nextWeek")}
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {mode === "mois" && (
        <div className="nova-week-nav">
          <button type="button" className="nova-btn nova-btn-secondary" onClick={() => setMonthStart((m) => addMonths(m, -1))}>
            <ChevronLeft size={16} strokeWidth={1.75} />
            {t("prevMonth")}
          </button>
          <button type="button" className="nova-btn nova-btn-secondary" onClick={() => setMonthStart((m) => addMonths(m, 1))}>
            {t("nextMonth")}
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {mode === "gantt" && (
        <div className="nova-week-nav">
          <button type="button" className="nova-btn nova-btn-secondary" onClick={() => setGanttStart((d) => addDays(d, -7))}>
            <ChevronLeft size={16} strokeWidth={1.75} />
            Semaine précédente
          </button>
          <button type="button" className="nova-btn nova-btn-secondary" onClick={() => setGanttStart(startOfWeek(new Date()))}>
            Aujourd'hui
          </button>
          <button type="button" className="nova-btn nova-btn-secondary" onClick={() => setGanttStart((d) => addDays(d, 7))}>
            Semaine suivante
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {loading ? (
        <Skeleton style={{ width: "100%", height: 400 }} />
      ) : mode === "semaine" && membersList.length === 0 ? (
        <EmptyState
          icon="equipe"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          actionLabel={t("emptyAction")}
          actionHref="/dashboard/equipe"
        />
      ) : mode === "semaine" ? (
        <div className="nova-planning-weekgrid">
          <div className="nova-planning-weekgrid-corner" />
          {days.map((day, i) => (
            <div
              key={toDateKey(day.date)}
              className={`nova-planning-weekgrid-header-cell ${isSameDay(day.date, new Date()) ? "nova-planning-weekgrid-today" : ""}`}
            >
              <span className="nova-planning-day-label">{WEEKDAY_LABELS[i]}</span>
              <span className="nova-planning-day-date">{formatShortDate(day.date)}</span>
            </div>
          ))}

          {membersList.map((member) => (
            <Fragment key={member.id}>
              <div className="nova-planning-weekgrid-member-cell">
                <Avatar name={member.name} size={26} />
                <div>
                  <div className="nova-planning-weekgrid-member-name">{member.name}</div>
                  {member.role && <div className="nova-planning-weekgrid-member-role">{member.role}</div>}
                </div>
              </div>
              {days.map((day) => {
                const cellAssignments = assignmentsForCell(member.id, day.date);
                return (
                  <div
                    key={`${member.id}-${toDateKey(day.date)}`}
                    className={`nova-planning-weekgrid-cell ${isSameDay(day.date, new Date()) ? "nova-planning-weekgrid-today" : ""}`}
                  >
                    {cellAssignments.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="nova-planning-block"
                        style={{ background: colorFromName(member.name) }}
                        onClick={() => setDetail(a)}
                      >
                        <span className="nova-planning-block-initials">{initialsFromName(member.name)}</span>
                        <span className="nova-planning-block-project">{a.project?.name || t("noProject")}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      ) : mode === "mois" ? (
        <div className="nova-calendar">
          <div className="nova-calendar-grid">
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={i} className="nova-calendar-weekday">
                {label}
              </div>
            ))}
            {monthGrid(monthStart).map(({ date, inMonth }) => {
              const key = toDateKey(date);
              const dayProjects = activeProjectsOnDay(date);
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className={`nova-calendar-cell ${inMonth ? "" : "nova-calendar-cell-outside"} ${isToday ? "nova-calendar-cell-today" : ""}`}
                >
                  <span className="nova-calendar-cell-date">{date.getDate()}</span>
                  <div className="nova-calendar-cell-tasks">
                    {dayProjects.slice(0, 3).map((p) => (
                      <Link key={p.id} href={`/dashboard/chantiers/${p.id}`} className="nova-calendar-task">
                        {p.name}
                      </Link>
                    ))}
                    {dayProjects.length > 3 && <span className="nova-calendar-task-more">+{dayProjects.length - 3}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : ganttProjects.length === 0 ? (
        <>
          <EmptyState
            icon="planning"
            title="Aucun chantier en cours ou planifié"
            description="Les chantiers planifiés ou en cours apparaîtront ici sur une vue chronologique."
          />
          <div className="nova-gantt-empty-add">
            <Button variant="secondary" onClick={() => openNewChantier(ganttStart)}>
              <Plus size={16} strokeWidth={1.75} />
              Nouveau chantier
            </Button>
          </div>
        </>
      ) : (
        <div className="nova-gantt">
          <div className="nova-gantt-header">
            <div className="nova-gantt-header-label" />
            <div className="nova-gantt-header-weeks">
              {ganttWeeks.map((weekDate, i) => (
                <div key={i} className={`nova-gantt-week-col ${isCurrentGanttWeek(weekDate) ? "nova-gantt-week-current" : ""}`}>
                  {formatShortDate(weekDate)}
                </div>
              ))}
            </div>
          </div>
          <div className="nova-gantt-body">
            {ganttProjects.map((p) => {
              const bar = ganttBarStyle(p);
              const team = teamForProject(p.id);
              return (
                <div key={p.id} className="nova-gantt-row">
                  <div className="nova-gantt-row-label">
                    <span className="nova-gantt-row-name">{p.name}</span>
                    {p.client && <span className="nova-gantt-row-client">{p.client.name}</span>}
                    {team.length > 0 ? (
                      <span className="nova-gantt-row-team">
                        {team.slice(0, 3).map((m) => (
                          <span key={m.id} className="nova-gantt-row-avatar" style={{ background: colorFromName(m.name) }} title={m.name}>
                            {initialsFromName(m.name)}
                          </span>
                        ))}
                        {team.length > 3 && <span className="nova-gantt-row-avatar nova-gantt-row-avatar-more">+{team.length - 3}</span>}
                      </span>
                    ) : (
                      <span className="nova-gantt-row-no-team">Personne affecté</span>
                    )}
                  </div>
                  <div className="nova-gantt-row-track">
                    {ganttWeeks.map((weekDate, i) => {
                      const weekEnd = addDays(weekDate, 7);
                      const cellCount = assignmentsList.filter(
                        (a) => a.project?.id === p.id && new Date(a.date) >= weekDate && new Date(a.date) < weekEnd
                      ).length;
                      return (
                        <button
                          key={i}
                          type="button"
                          className={`nova-gantt-grid-col ${isCurrentGanttWeek(weekDate) ? "nova-gantt-week-current" : ""}`}
                          onClick={() => openQuickAssign(p, weekDate)}
                          aria-label={`Affecter un collaborateur — ${p.name}, semaine du ${formatShortDate(weekDate)}`}
                        >
                          {cellCount > 0 && <span className="nova-gantt-cell-count">{cellCount}</span>}
                        </button>
                      );
                    })}
                    {bar && !bar.hidden ? (
                      <button
                        type="button"
                        className={`nova-gantt-bar ${GANTT_STATUS_BAR_CLASS[p.status] || ""}`}
                        style={{ left: bar.left, width: bar.width }}
                        onClick={() => openGanttDetail(p)}
                        aria-label={`${p.name} — modifier les dates ou voir le détail`}
                      >
                        <span className="nova-gantt-tooltip">
                          <strong>{p.client?.name || "Sans client"}</strong>
                          <span>
                            {formatShortDate(new Date(p.startDate!))} → {formatShortDate(new Date(p.endDate!))}
                          </span>
                          <span>
                            {GANTT_STATUS_LABEL[p.status] || p.status} · {ganttAvancement(p)}%
                          </span>
                          <span>{team.length > 0 ? `Équipe : ${team.map((m) => m.name).join(", ")}` : "Personne affecté"}</span>
                        </span>
                      </button>
                    ) : !bar ? (
                      <button
                        type="button"
                        className="nova-gantt-bar nova-gantt-bar-undated"
                        onClick={() => openGanttDetail(p)}
                      >
                        Dates non définies
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}

            <div className="nova-gantt-row nova-gantt-row-add">
              <div className="nova-gantt-row-label nova-gantt-row-add-label">
                <Plus size={14} strokeWidth={1.75} />
                Nouveau chantier
              </div>
              <div className="nova-gantt-row-track">
                {ganttWeeks.map((weekDate, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`nova-gantt-grid-col nova-gantt-grid-col-add ${isCurrentGanttWeek(weekDate) ? "nova-gantt-week-current" : ""}`}
                    onClick={() => openNewChantier(weekDate)}
                    aria-label={`Nouveau chantier — semaine du ${formatShortDate(weekDate)}`}
                  >
                    <Plus size={14} strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="nova-modal-overlay" onClick={() => setDetail(null)}>
          <div className="nova-modal" role="dialog" aria-modal="true" aria-label={t("detailTitle")} onClick={(e) => e.stopPropagation()}>
            <div className="nova-planning-detail-header">
              <h3 className="nova-modal-title">{t("detailTitle")}</h3>
              <button type="button" className="nova-icon-btn" onClick={() => setDetail(null)} aria-label={t("close")}>
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <dl className="nova-detail-list">
              <div>
                <dt>{t("collaborator")}</dt>
                <dd>
                  {detail.teamMember.name}
                  {detail.teamMember.role ? ` — ${detail.teamMember.role}` : ""}
                </dd>
              </div>
              <div>
                <dt>{t("date")}</dt>
                <dd>{new Date(detail.date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</dd>
              </div>
              <div>
                <dt>{t("project")}</dt>
                <dd>
                  {detail.project ? (
                    <>
                      {detail.project.name}{" "}
                      <Badge tone="blue">{detail.project.status === "en_cours" ? t("inProgress") : detail.project.status}</Badge>
                    </>
                  ) : (
                    t("noProject")
                  )}
                </dd>
              </div>
              {detail.note && (
                <div>
                  <dt>{t("note")}</dt>
                  <dd>{detail.note}</dd>
                </div>
              )}
            </dl>
            <div className="nova-modal-actions">
              {detail.project && (
                <Link href={`/dashboard/chantiers/${detail.project.id}`} className="nova-btn nova-btn-secondary">
                  {t("viewProject")}
                </Link>
              )}
              <button type="button" className="nova-btn nova-btn-primary" onClick={() => setDetail(null)}>
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {ganttDetail && (
        <div className="nova-modal-overlay" onClick={() => setGanttDetail(null)}>
          <div className="nova-modal" role="dialog" aria-modal="true" aria-label={ganttDetail.name} onClick={(e) => e.stopPropagation()}>
            <div className="nova-planning-detail-header">
              <h3 className="nova-modal-title">{ganttDetail.name}</h3>
              <button type="button" className="nova-icon-btn" onClick={() => setGanttDetail(null)} aria-label={t("close")}>
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <dl className="nova-detail-list">
              <div>
                <dt>Client</dt>
                <dd>{ganttDetail.client?.name || "Sans client rattaché"}</dd>
              </div>
              <div>
                <dt>Statut</dt>
                <dd>
                  <Badge tone={GANTT_STATUS_TONE[ganttDetail.status] || "neutral"}>
                    {GANTT_STATUS_LABEL[ganttDetail.status] || ganttDetail.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt>Avancement</dt>
                <dd>{ganttAvancement(ganttDetail)}%</dd>
              </div>
            </dl>

            <div className="nova-gantt-detail-dates">
              <DatePickerField
                label="Date de début"
                value={ganttDateForm.startDate}
                onChange={(value) => setGanttDateForm({ ...ganttDateForm, startDate: value })}
              />
              <DatePickerField
                label="Date de fin"
                value={ganttDateForm.endDate}
                onChange={(value) => setGanttDateForm({ ...ganttDateForm, endDate: value })}
              />
              <Button
                variant="secondary"
                onClick={handleSaveGanttDates}
                disabled={savingGanttDates || !ganttDateForm.startDate || !ganttDateForm.endDate}
              >
                {savingGanttDates ? "Enregistrement..." : "Enregistrer les dates"}
              </Button>
            </div>

            <div className="nova-modal-actions">
              <Link href={`/dashboard/chantiers/${ganttDetail.id}`} className="nova-btn nova-btn-secondary">
                Voir la fiche chantier
              </Link>
              <button type="button" className="nova-btn nova-btn-primary" onClick={() => setGanttDetail(null)}>
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      <EditModal
        open={newChantierOpen}
        title="Nouveau chantier"
        onCancel={() => setNewChantierOpen(false)}
        onSave={handleCreateChantier}
        saving={creatingChantier}
      >
        <Field
          label="Nom"
          required
          value={newChantierForm.name}
          onChange={(e) => setNewChantierForm({ ...newChantierForm, name: e.target.value })}
          placeholder="Rénovation toiture"
        />
        <SelectField
          label="Client"
          value={newChantierForm.clientId}
          onChange={(e) => setNewChantierForm({ ...newChantierForm, clientId: e.target.value })}
        >
          <option value="">Aucun client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <DatePickerField
          label="Date de début"
          value={newChantierForm.startDate}
          onChange={(value) => setNewChantierForm({ ...newChantierForm, startDate: value })}
        />
        <DatePickerField
          label="Date de fin"
          value={newChantierForm.endDate}
          onChange={(value) => setNewChantierForm({ ...newChantierForm, endDate: value })}
        />
      </EditModal>

      <EditModal
        open={quickAssignTarget !== null}
        title={quickAssignTarget ? `Affecter un collaborateur — ${quickAssignTarget.project.name}` : ""}
        onCancel={() => setQuickAssignTarget(null)}
        onSave={handleCreateQuickAssign}
        saving={creatingQuickAssign}
      >
        <SelectField
          label="Collaborateur"
          required
          value={quickAssignForm.teamMemberId}
          onChange={(e) => setQuickAssignForm({ ...quickAssignForm, teamMemberId: e.target.value })}
        >
          <option value="">Sélectionner...</option>
          {membersList.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>
        <DatePickerField
          label="Date"
          value={quickAssignForm.date}
          onChange={(value) => setQuickAssignForm({ ...quickAssignForm, date: value })}
        />
        <TextareaField
          label="Note (optionnel)"
          rows={2}
          value={quickAssignForm.note}
          onChange={(e) => setQuickAssignForm({ ...quickAssignForm, note: e.target.value })}
          placeholder="Matériel à apporter, horaire particulier..."
        />
      </EditModal>
    </div>
  );
}
