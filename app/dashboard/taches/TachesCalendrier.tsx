"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthGrid, toDateKey } from "@/lib/dates";
import type { TaskRow } from "./page";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatMonthYear(date: Date): string {
  const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function TachesCalendrier({ tasks, onToggle }: { tasks: TaskRow[]; onToggle: (task: TaskRow) => void }) {
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
        <span className="nova-calendar-month-label">{formatMonthYear(viewMonth)}</span>
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
