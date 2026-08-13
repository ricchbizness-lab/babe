"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ConfirmModal, EmptyState, TableSkeleton, useToast } from "@/components/ui";

type ProjectOption = { id: string; name: string };
type TaskRow = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  project: { id: string; name: string } | null;
};

const FILTERS: { key: "all" | "pending" | "done"; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "done", label: "Terminées" },
];

export default function TachesPage() {
  const toast = useToast();
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [newText, setNewText] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TaskRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks ?? []));
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects((data.projects ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))));
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newText.trim()) return;
    setError("");
    setAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText, projectId: newProjectId || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error || "Impossible d'ajouter cette tâche.";
        setError(message);
        toast.error(message);
        return;
      }
      const data = await res.json();
      setTasks((prev) => [data.task, ...(prev ?? [])]);
      setNewText("");
      setNewProjectId("");
      toast.success("Tâche ajoutée");
    } catch {
      const message = "Impossible de joindre le serveur — réessayez.";
      setError(message);
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(task: TaskRow) {
    setTasks((prev) => (prev ?? []).map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !task.done }),
      });
      if (!res.ok) {
        setTasks((prev) => (prev ?? []).map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
        toast.error("Erreur lors de la mise à jour de la tâche.");
        return;
      }
      toast.success(task.done ? "Tâche marquée comme non faite" : "Tâche cochée comme faite");
    } catch {
      setTasks((prev) => (prev ?? []).map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${deleteTarget.id}`, { method: "DELETE" });
      setDeleting(false);
      if (res.ok) {
        setTasks((prev) => (prev ?? []).filter((t) => t.id !== deleteTarget.id));
        toast.success("Tâche supprimée");
      } else {
        toast.error("Erreur lors de la suppression de la tâche.");
      }
    } catch {
      setDeleting(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteTarget(null);
  }

  const filtered = (tasks ?? []).filter((t) => {
    if (filter === "pending") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  return (
    <div className="nova-page">
      <header className="nova-page-header">
        <h1>Tâches</h1>
        <p className="nova-page-subtitle">
          {tasks === null ? "…" : `${tasks.filter((t) => !t.done).length} en attente sur ${tasks.length}`}
        </p>
      </header>

      <form onSubmit={handleAdd} className="nova-quick-add">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Nouvelle tâche..."
          aria-label="Nouvelle tâche"
        />
        <select value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)} aria-label="Chantier rattaché">
          <option value="">Aucun chantier</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="submit" className="nova-btn nova-btn-primary" disabled={adding || !newText.trim()}>
          Ajouter
        </button>
      </form>
      {error && <div className="error">{error}</div>}

      <div className="nova-filter-row">
        {FILTERS.map((f) => (
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

      {tasks === null ? (
        <TableSkeleton columns={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="taches"
          title={tasks.length === 0 ? "Aucune tâche pour l'instant" : "Aucune tâche pour ce filtre"}
          description={tasks.length === 0 ? "Ajoutez votre première tâche ci-dessus." : undefined}
        />
      ) : (
        <ul className="nova-task-list">
          {filtered.map((t) => (
            <li
              key={t.id}
              className="nova-task-row"
              onClick={(e) => {
                // Le changement du checkbox déclenche déjà handleToggle via son
                // propre onChange (et le clic sur le lien/bouton ne doit pas
                // cocher la tâche) — on évite ainsi un double-toggle qui
                // annulerait le clic.
                if ((e.target as HTMLElement).closest("input, a, button")) return;
                handleToggle(t);
              }}
            >
              <input
                type="checkbox"
                className="nova-checkbox"
                checked={t.done}
                onChange={() => handleToggle(t)}
                aria-label={t.done ? "Marquer comme non faite" : "Marquer comme faite"}
              />
              <span className={t.done ? "nova-task-text-done" : "nova-task-text"}>{t.text}</span>
              {t.project && (
                <Link
                  href={`/dashboard/chantiers/${t.project.id}`}
                  className="nova-inline-link nova-task-project"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t.project.name}
                </Link>
              )}
              <button
                type="button"
                className="nova-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(t);
                }}
                aria-label="Supprimer la tâche"
              >
                <Trash2 size={15} strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        itemLabel={deleteTarget ? `la tâche « ${deleteTarget.text} »` : ""}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
