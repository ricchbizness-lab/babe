"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthGrid, toDateKey } from "@/lib/dates";
import { LOCALE_TO_BCP47, resolveLocale } from "@/lib/i18n";
import type { TaskRow } from "./page";

function formatMonthYear(date: Date, bcp47: string): string {
  const label = date.toLocaleDateString(bcp47, { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function TachesCalendrier({ tasks, onToggle }: { tasks: TaskRow[]; onToggle: (task: TaskRow) => void }) {
  const t = useTranslations("taches");
  const locale = resolveLocale(useLocale());
  const WEEKDAY_LABELS = [
    t("weekdayMon"),
    t("weekdayTue"),
    t("weekdayWed"),
    t("weekdayThu"),
    t("weekdayFri"),
    t("weekdaySat"),
    t("weekdaySun"),
  ];
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const byDay = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const key = toDateKey(new Date(t.dueDate));
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(t);
  }

  const todayKey = toDateKey(new Date());
  const days = monthGrid(viewMonth);

  return (
    <div className="nova-calendar">
      <div className="nova-calendar-nav">
        <button type="button" className="nova-btn nova-btn-secondary" onClick={() => setViewMonth((m) => addMonths(m, -1))}>
          <ChevronLeft size={16} strokeWidth={1.75} />
        </button>
        <span className="nova-calendar-month-label">{formatMonthYear(viewMonth, LOCALE_TO_BCP47[locale])}</span>
        <button type="button" className="nova-btn nova-btn-secondary" onClick={() => setViewMonth((m) => addMonths(m, 1))}>
          <ChevronRight size={16} strokeWidth={1.75} />
        </button>
      </div>
      <div className="nova-calendar-grid">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="nova-calendar-weekday">
            {label}
          </div>
        ))}
        {days.map(({ date, inMonth }) => {
          const key = toDateKey(date);
          const dayTasks = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`nova-calendar-cell ${inMonth ? "" : "nova-calendar-cell-outside"} ${isToday ? "nova-calendar-cell-today" : ""}`}
            >
              <span className="nova-calendar-cell-date">{date.getDate()}</span>
              <div className="nova-calendar-cell-tasks">
                {dayTasks.slice(0, 3).map((t) => {
                  const overdue = !t.done && new Date(t.dueDate as string) < new Date(new Date().toDateString());
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`nova-calendar-task ${t.done ? "nova-calendar-task-done" : ""} ${overdue ? "nova-calendar-task-late" : ""}`}
                      onClick={() => onToggle(t)}
                      title={t.text}
                    >
                      {t.text}
                    </button>
                  );
                })}
                {dayTasks.length > 3 && <span className="nova-calendar-task-more">+{dayTasks.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
