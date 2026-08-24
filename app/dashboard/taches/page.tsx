"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { ConfirmModal, DatePickerField, EmptyState, Pagination, TableSkeleton, usePagination, useToast } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type ProjectOption = { id: string; name: string };
type TaskRow = {
  id: string;
  text: string;
  done: boolean;
  dueDate: string | null;
  createdAt: string;
  project: { id: string; name: string } | null;
};

function isOverdue(task: TaskRow) {
  if (!task.dueDate || task.done) return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

const FILTERS: { key: "all" | "pending" | "done" | "late"; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "done", label: "Terminées" },
  { key: "late", label: "En retard" },
];

type SortKey = "status" | "project";
type SortState = { key: SortKey; direction: "asc" | "desc" };

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "status", label: "Statut" },
  { key: "project", label: "Chantier rattaché" },
];

export default function TachesPage() {
  const router = useRouter();
  const toast = useToast();
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "done" | "late">("all");
  const [newText, setNewText] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TaskRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sort, setSort] = useState<SortState | null>(null);

  useEffect(() => {
    fetchWithAuth("/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks ?? []));
    fetchWithAuth("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects((data.projects ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))));
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newText.trim()) return;
    setError("");
    setAdding(true);
    try {
      const res = await fetchWithAuth("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newText,
          projectId: newProjectId || undefined,
          dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        }),
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
      setNewDueDate("");
      toast.success("Tâche ajoutée");
      router.refresh();
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
      const res = await fetchWithAuth(`/api/tasks/${task.id}`, {
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
      router.refresh();
    } catch {
      setTasks((prev) => (prev ?? []).map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/tasks/${deleteTarget.id}`, { method: "DELETE" });
      setDeleting(false);
      if (res.ok) {
        setTasks((prev) => (prev ?? []).filter((t) => t.id !== deleteTarget.id));
        toast.success("Tâche supprimée");
        router.refresh();
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
    if (filter === "late") return isOverdue(t);
    return true;
  });

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  }

  const sortedTasks = useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.direction === "asc" ? 1 : -1;
    if (sort.key === "status") {
      return [...filtered].sort((a, b) => ((a.done ? 1 : 0) - (b.done ? 1 : 0)) * dir);
    }
    return [...filtered].sort((a, b) => {
      const na = a.project?.name || "";
      const nb = b.project?.name || "";
      if (!na && !nb) return 0;
      if (!na) return 1;
      if (!nb) return -1;
      return na.localeCompare(nb, "fr", { sensitivity: "base" }) * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort]);

  const { page, setPage, totalPages, start, end } = usePagination(sortedTasks.length, 10);
  const pageTasks = sortedTasks.slice(start, end);

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
        <DatePickerField label="Échéance (optionnel)" value={newDueDate} onChange={setNewDueDate} />
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

      {tasks !== null && filtered.length > 0 && (
        <div className="nova-task-sort-row">
          <span className="nova-task-sort-label">Trier par</span>
          {SORT_OPTIONS.map((opt) => {
            const active = sort?.key === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                className={`nova-table-sort-btn ${active ? "nova-table-sort-btn-active" : ""}`}
                onClick={() => toggleSort(opt.key)}
              >
                {opt.label}
                {active ? (
                  sort?.direction === "asc" ? (
                    <ChevronUp size={13} strokeWidth={2} />
                  ) : (
                    <ChevronDown size={13} strokeWidth={2} />
                  )
                ) : null}
              </button>
            );
          })}
        </div>
      )}

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
          {pageTasks.map((t) => (
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
              {t.dueDate && (
                <span className={isOverdue(t) ? "nova-task-due-date nova-task-due-date-late" : "nova-task-due-date"}>
                  {new Date(t.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
              )}
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

      {tasks !== null && filtered.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={sortedTasks.length} start={start} end={end} />
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
