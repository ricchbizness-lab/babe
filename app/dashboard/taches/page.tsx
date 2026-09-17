"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  ConfirmModal,
  DatePickerField,
  EditModal,
  EmptyState,
  Field,
  MetricBar,
  Pagination,
  SelectField,
  Tabs,
  TableSkeleton,
  usePagination,
  useToast,
} from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { TachesKanban } from "./TachesKanban";
import { TachesCalendrier } from "./TachesCalendrier";

type ProjectOption = { id: string; name: string };
export type TaskRow = {
  id: string;
  text: string;
  done: boolean;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; status: string } | null;
};

function isOverdue(task: TaskRow) {
  if (!task.dueDate || task.done) return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

type SortKey = "status" | "project";
type SortState = { key: SortKey; direction: "asc" | "desc" };

export default function TachesPage() {
  const router = useRouter();
  const toast = useToast();
  const tt = useTranslations("taches");
  const tCommon = useTranslations("common");

  const FILTERS: { key: "all" | "pending" | "done" | "late"; label: string }[] = [
    { key: "all", label: tt("filterAll") },
    { key: "pending", label: tt("filterPending") },
    { key: "done", label: tt("filterDone") },
    { key: "late", label: tt("filterLate") },
  ];

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "status", label: tt("sortStatus") },
    { key: "project", label: tt("sortProject") },
  ];
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [view, setView] = useState<"kanban" | "liste" | "calendrier">("kanban");
  const [filter, setFilter] = useState<"all" | "pending" | "done" | "late">("all");

  const [addOpen, setAddOpen] = useState(false);
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

  function openAdd() {
    setNewText("");
    setNewProjectId("");
    setNewDueDate("");
    setError("");
    setAddOpen(true);
  }

  async function handleAdd() {
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
        const message = data.error || tt("toastAddError");
        setError(message);
        toast.error(message);
        return;
      }
      const data = await res.json();
      setTasks((prev) => [data.task, ...(prev ?? [])]);
      toast.success(tt("toastAdded"));
      router.refresh();
      setAddOpen(false);
    } catch {
      const message = tCommon("networkError");
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
        toast.error(tt("toastToggleError"));
        return;
      }
      toast.success(task.done ? tt("toastMarkedUndone") : tt("toastMarkedDone"));
      router.refresh();
    } catch {
      setTasks((prev) => (prev ?? []).map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
      toast.error(tCommon("networkError"));
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
        toast.success(tt("toastDeleted"));
        router.refresh();
      } else {
        toast.error(tt("toastDeleteError"));
      }
    } catch {
      setDeleting(false);
      toast.error(tCommon("networkError"));
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

  const now = new Date();
  const aFaireCount = (tasks ?? []).filter((t) => !t.done).length;
  const enRetardCount = (tasks ?? []).filter((t) => isOverdue(t)).length;
  const termineesCeMoisCount = (tasks ?? []).filter(
    (t) => t.done && new Date(t.updatedAt).getMonth() === now.getMonth() && new Date(t.updatedAt).getFullYear() === now.getFullYear()
  ).length;

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>{tt("title")}</h1>
          <p className="nova-page-subtitle">
            {tasks === null ? "…" : tt("pendingOfTotal", { pending: tasks.filter((t) => !t.done).length, total: tasks.length })}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} strokeWidth={1.75} />
          {tt("newTask")}
        </Button>
      </header>

      <Tabs
        tabs={[
          { key: "kanban", label: tt("tabKanban") },
          { key: "liste", label: tt("tabListe") },
          { key: "calendrier", label: tt("tabCalendrier") },
        ]}
        active={view}
        onChange={setView}
      />

      {view === "liste" && tasks !== null && tasks.length > 0 && (
        <MetricBar
          items={[
            { label: tt("metricTotal"), value: tasks.length },
            { label: tt("metricTodo"), value: aFaireCount },
            { label: tt("metricLate"), value: enRetardCount },
            { label: tt("metricDoneThisMonth"), value: termineesCeMoisCount },
          ]}
        />
      )}

      {error && <div className="error">{error}</div>}

      {tasks === null ? (
        <TableSkeleton columns={3} />
      ) : tasks.length === 0 ? (
        <EmptyState icon="taches" title={tt("emptyTitle")} description={tt("emptyDescription")} />
      ) : view === "kanban" ? (
        <TachesKanban tasks={tasks} onToggle={handleToggle} onDelete={setDeleteTarget} />
      ) : view === "calendrier" ? (
        <TachesCalendrier tasks={tasks} onToggle={handleToggle} />
      ) : (
        <>
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

          {filtered.length > 0 && (
            <div className="nova-task-sort-row">
              <span className="nova-task-sort-label">{tt("sortBy")}</span>
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

          {filtered.length === 0 ? (
            <EmptyState icon="taches" title={tt("emptyFilterTitle")} />
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
                    aria-label={t.done ? tt("markUndone") : tt("markDone")}
                  />
                  <span className={t.done ? "nova-task-text-done" : "nova-task-text"}>{t.text}</span>
                  {t.dueDate && (
                    <span className={isOverdue(t) ? "nova-task-due-date nova-task-due-date-late" : "nova-task-due-date"}>
                      {isOverdue(t) && <AlertTriangle size={12} strokeWidth={2} />}
                      {new Date(t.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                  )}
                  {t.project && (
                    <Link
                      href={`/dashboard/chantiers/${t.project.id}`}
                      className="nova-task-project"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge tone="blue">{t.project.name}</Badge>
                    </Link>
                  )}
                  <button
                    type="button"
                    className="nova-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(t);
                    }}
                    aria-label={tt("deleteTask")}
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {filtered.length > 0 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={sortedTasks.length} start={start} end={end} />
          )}
        </>
      )}

      <EditModal open={addOpen} title={tt("newTaskModalTitle")} onCancel={() => setAddOpen(false)} onSave={handleAdd} saving={adding}>
        <Field
          label={tt("taskTextLabel")}
          required
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={tt("taskTextPlaceholder")}
        />
        <SelectField label={tt("projectLabel")} value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)}>
          <option value="">{tt("noProject")}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <DatePickerField label={tt("dueDateLabel")} value={newDueDate} onChange={setNewDueDate} />
      </EditModal>

      <ConfirmModal
        open={deleteTarget !== null}
        itemLabel={deleteTarget ? tt("deleteConfirmItem", { text: deleteTarget.text }) : ""}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
