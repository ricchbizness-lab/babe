"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Plus, Trash2, Upload } from "lucide-react";
import { Avatar, Badge, Button, ConfirmModal, MetricBar, ProgressBar, useToast, type BadgeTone } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type Step = { id: string; title: string; status: string; order: number };
type Assignment = { id: string; teamMember: { id: string; name: string; role: string | null } };

type OverviewProject = {
  id: string;
  status: string;
  budgetPrevu: number | null;
  photoCouverture: string | null;
  tasks: { done: boolean }[];
  assignments: Assignment[];
  steps: Step[];
};

const STEP_STATUS_LABEL: Record<string, string> = { a_faire: "À faire", en_cours: "En cours", termine: "Terminé" };
const STEP_STATUS_TONE: Record<string, BadgeTone> = { a_faire: "neutral", en_cours: "amber", termine: "success" };
const STEP_CYCLE: Record<string, string> = { a_faire: "en_cours", en_cours: "termine", termine: "a_faire" };

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_ALLOWED_TYPES = ["image/png", "image/jpeg"];

export function ChantierOverviewTab({
  project,
  onRefresh,
}: {
  project: OverviewProject;
  onRefresh: () => void;
}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [addingStep, setAddingStep] = useState(false);
  const [deleteStepTarget, setDeleteStepTarget] = useState<Step | null>(null);
  const [deletingStep, setDeletingStep] = useState(false);

  const progressValue = project.tasks.length === 0 ? 0 : (project.tasks.filter((t) => t.done).length / project.tasks.length) * 100;
  const depenses = 0; // module Achats à venir — 0 tant qu'il n'existe pas
  const margeEstimee = project.budgetPrevu != null ? project.budgetPrevu - depenses : null;

  const teamOnSite = (() => {
    const seen = new Set<string>();
    const list: Assignment["teamMember"][] = [];
    for (const a of project.assignments) {
      if (!seen.has(a.teamMember.id)) {
        seen.add(a.teamMember.id);
        list.push(a.teamMember);
      }
    }
    return list;
  })();

  function handleCoverChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
      toast.error("Format non supporté — utilisez un fichier PNG ou JPG.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error("Fichier trop volumineux — 2 Mo maximum.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploadingCover(true);
      try {
        const res = await fetchWithAuth(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoCouverture: String(reader.result) }),
        });
        if (!res.ok) {
          toast.error("Impossible d'enregistrer la photo de couverture.");
          return;
        }
        toast.success("Photo de couverture mise à jour");
        onRefresh();
      } catch {
        toast.error("Impossible de joindre le serveur — réessayez.");
      } finally {
        setUploadingCover(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleAddStep(e: FormEvent) {
    e.preventDefault();
    if (!newStepTitle.trim()) return;
    setAddingStep(true);
    try {
      const res = await fetchWithAuth(`/api/projects/${project.id}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newStepTitle }),
      });
      if (!res.ok) {
        toast.error("Impossible d'ajouter cette étape.");
        return;
      }
      setNewStepTitle("");
      toast.success("Étape ajoutée");
      onRefresh();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setAddingStep(false);
    }
  }

  async function handleCycleStep(step: Step) {
    try {
      const res = await fetchWithAuth(`/api/project-steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: STEP_CYCLE[step.status] || "a_faire" }),
      });
      if (!res.ok) {
        toast.error("Erreur lors de la mise à jour de l'étape.");
        return;
      }
      onRefresh();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
  }

  async function confirmDeleteStep() {
    if (!deleteStepTarget) return;
    setDeletingStep(true);
    try {
      const res = await fetchWithAuth(`/api/project-steps/${deleteStepTarget.id}`, { method: "DELETE" });
      setDeletingStep(false);
      if (res.ok) {
        toast.success("Étape supprimée");
        onRefresh();
      } else {
        toast.error("Erreur lors de la suppression de l'étape.");
      }
    } catch {
      setDeletingStep(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteStepTarget(null);
  }

  return (
    <div className="nova-overview-tab">
      <div className="nova-cover-photo">
        {project.photoCouverture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.photoCouverture} alt="Photo de couverture du chantier" />
        ) : (
          <div className="nova-cover-photo-placeholder">
            <Camera size={32} strokeWidth={1.5} />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleCoverChange}
          className="nova-visually-hidden"
        />
        <Button
          variant="secondary"
          className="nova-cover-photo-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingCover}
        >
          <Upload size={14} strokeWidth={1.75} />
          {uploadingCover ? "Envoi..." : project.photoCouverture ? "Changer la photo" : "Ajouter une photo de couverture"}
        </Button>
      </div>

      <ProgressBar value={progressValue} label={`${Math.round(progressValue)}% d'avancement`} />

      <MetricBar
        items={[
          { label: "Budget prévu", value: project.budgetPrevu != null ? `${project.budgetPrevu.toLocaleString("fr-FR")} €` : "—" },
          { label: "Dépenses", value: `${depenses.toLocaleString("fr-FR")} €` },
          { label: "Marge estimée", value: margeEstimee != null ? `${margeEstimee.toLocaleString("fr-FR")} €` : "—" },
          { label: "Avancement", value: `${Math.round(progressValue)}%` },
        ]}
      />

      <section>
        <h2 className="nova-section-title">Équipe sur site</h2>
        {teamOnSite.length === 0 ? (
          <p className="nova-page-subtitle">Aucun collaborateur affecté pour l'instant.</p>
        ) : (
          <div className="nova-team-onsite">
            {teamOnSite.map((m) => (
              <div key={m.id} className="nova-identity-cell">
                <Avatar name={m.name} size={32} />
                <div>
                  <div className="nova-identity-cell-name">{m.name}</div>
                  {m.role && <div className="nova-team-card-role">{m.role}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="nova-section-title">Étapes du chantier</h2>
        {project.steps.length === 0 ? (
          <p className="nova-page-subtitle">Aucune étape définie pour l'instant.</p>
        ) : (
          <ul className="nova-steps-list">
            {project.steps.map((step) => (
              <li key={step.id} className="nova-steps-row">
                <button type="button" onClick={() => handleCycleStep(step)} title="Cliquer pour changer le statut">
                  <Badge tone={STEP_STATUS_TONE[step.status] || "neutral"}>{STEP_STATUS_LABEL[step.status] || step.status}</Badge>
                </button>
                <span className="nova-steps-title">{step.title}</span>
                <button
                  type="button"
                  className="nova-icon-btn"
                  onClick={() => setDeleteStepTarget(step)}
                  aria-label={`Supprimer l'étape ${step.title}`}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddStep} className="nova-quick-add">
          <input
            type="text"
            value={newStepTitle}
            onChange={(e) => setNewStepTitle(e.target.value)}
            placeholder="Nouvelle étape..."
            aria-label="Nouvelle étape"
          />
          <button type="submit" className="nova-btn nova-btn-primary" disabled={addingStep || !newStepTitle.trim()}>
            <Plus size={15} strokeWidth={1.75} />
            Ajouter
          </button>
        </form>
      </section>

      <ConfirmModal
        open={deleteStepTarget !== null}
        itemLabel={deleteStepTarget ? `l'étape « ${deleteStepTarget.title} »` : ""}
        onConfirm={confirmDeleteStep}
        onCancel={() => setDeleteStepTarget(null)}
        confirming={deletingStep}
      />
    </div>
  );
}
