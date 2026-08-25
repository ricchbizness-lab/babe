"use client";

import Link from "next/link";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui";
import type { TaskRow } from "./page";

const COLUMNS: { key: string; label: string; match: (t: TaskRow) => boolean }[] = [
  {
    key: "a_faire",
    label: "À faire",
    match: (t) => !t.done && !t.dueDate && t.project?.status !== "en_cours",
  },
  {
    key: "en_cours",
    label: "En cours",
    match: (t) => !t.done && t.project?.status === "en_cours",
  },
  {
    key: "en_attente",
    label: "En attente",
    match: (t) => !t.done && !!t.dueDate && t.project?.status !== "en_cours",
  },
  {
    key: "terminees",
    label: "Terminées",
    match: (t) => t.done,
  },
];

function isOverdue(task: TaskRow) {
  if (!task.dueDate || task.done) return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

export function TachesKanban({
  tasks,
  onToggle,
  onDelete,
}: {
  tasks: TaskRow[];
  onToggle: (task: TaskRow) => void;
  onDelete: (task: TaskRow) => void;
}) {
  return (
    <div className="nova-kanban">
      {COLUMNS.map((col) => {
        let items = tasks.filter(col.match);
        if (col.key === "terminees") {
          items = [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10);
        }
        return (
          <div className="nova-kanban-column" key={col.key}>
            <div className="nova-kanban-column-header">
              <div className="nova-kanban-column-title">
                <span className="nova-kanban-column-name">{col.label}</span>
                <span className="nova-kanban-column-count">{items.length}</span>
              </div>
            </div>
            <div className="nova-kanban-column-body">
              {items.length === 0 ? (
                <div className="nova-kanban-empty">Aucune tâche</div>
              ) : (
                items.map((t) => (
                  <div key={t.id} className="nova-kanban-card nova-task-kanban-card">
                    <div className="nova-task-kanban-card-top">
                      <input
                        type="checkbox"
                        className="nova-checkbox"
                        checked={t.done}
                        onChange={() => onToggle(t)}
                        aria-label={t.done ? "Marquer comme non faite" : "Marquer comme faite"}
                      />
                      <span className={t.done ? "nova-task-text-done" : "nova-task-kanban-text"}>{t.text}</span>
                      <button
                        type="button"
                        className="nova-icon-btn"
                        onClick={() => onDelete(t)}
                        aria-label="Supprimer la tâche"
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    </div>
                    <div className="nova-task-kanban-card-footer">
                      {t.project && (
                        <Link href={`/dashboard/chantiers/${t.project.id}`}>
                          <Badge tone="teal">{t.project.name}</Badge>
                        </Link>
                      )}
                      {t.dueDate && (
                        <span className={isOverdue(t) ? "nova-task-due-date nova-task-due-date-late" : "nova-task-due-date"}>
                          {isOverdue(t) && <AlertTriangle size={12} strokeWidth={2} />}
                          {new Date(t.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
