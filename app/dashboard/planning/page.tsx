"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Avatar, Badge, EmptyState, Skeleton, colorFromName, initialsFromName } from "@/components/ui";
import { addDays, addMonths, formatShortDate, isSameDay, monthGrid, startOfWeek, toDateKey, weekDays } from "@/lib/dates";
import { fetchWithAuth } from "@/lib/fetchClient";
import { LOCALE_TO_BCP47, resolveLocale } from "@/lib/i18n";

type ProjectRow = { id: string; name: string; status: string; startDate: string | null; endDate: string | null };
type MemberRow = { id: string; name: string; role: string | null };
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
  const [mode, setMode] = useState<"semaine" | "mois">("semaine");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[] | null>(null);
  const [detail, setDetail] = useState<AssignmentRow | null>(null);

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
  }, []);

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

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>{t("title")}</h1>
          <p className="nova-page-subtitle">{mode === "semaine" ? rangeLabel : formatMonthYear(monthStart, bcp47)}</p>
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
      ) : (
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
    </div>
  );
}
