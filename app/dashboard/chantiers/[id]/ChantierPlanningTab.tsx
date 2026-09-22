"use client";

import { Avatar } from "@/components/ui";
import { isSameDay, startOfWeek, weekDays } from "@/lib/dates";

type Assignment = { id: string; date: string; note: string | null; teamMember: { id: string; name: string; role: string | null } };

export function ChantierPlanningTab({ assignments }: { assignments: Assignment[] }) {
  const days = weekDays(startOfWeek(new Date()));

  function assignmentsForDay(day: Date) {
    return assignments.filter((a) => isSameDay(new Date(a.date), day));
  }

  return (
    <div className="nova-chantier-week">
      {days.map((day) => {
        const dayAssignments = assignmentsForDay(day.date);
        const today = isSameDay(day.date, new Date());
        return (
          <div key={day.label} className={`nova-planning-day ${today ? "nova-planning-day-today" : ""}`}>
            <div className="nova-planning-day-header">
              <span className="nova-planning-day-label">{day.label}</span>
              <span className="nova-planning-day-date">{day.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</span>
            </div>
            {dayAssignments.length === 0 ? (
              <p className="nova-planning-empty">
                <span>Aucune affectation</span>
              </p>
            ) : (
              <ul className="nova-planning-people">
                {dayAssignments.map((a) => (
                  <li key={a.id}>
                    <Avatar name={a.teamMember.name} size={18} />
                    {a.teamMember.name}
                    {a.note ? ` — ${a.note}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
