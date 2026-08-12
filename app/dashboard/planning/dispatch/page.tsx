"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Button, Card, CardTitle, ConfirmModal, EmptyState, Field, SelectField, TextareaField, useToast } from "@/components/ui";
import { toDateKey } from "@/lib/dates";

type Member = { id: string; name: string; role: string | null; email: string | null; phone: string | null };
type ProjectOption = { id: string; name: string };
type AssignmentRow = {
  id: string;
  date: string;
  note: string | null;
  teamMember: { id: string; name: string };
  project: { id: string; name: string } | null;
};

const todayKey = toDateKey(new Date());

export default function DispatchPage() {
  const toast = useToast();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[] | null>(null);

  const [memberForm, setMemberForm] = useState({ name: "", role: "", email: "", phone: "" });
  const [memberError, setMemberError] = useState("");
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  const [assignForm, setAssignForm] = useState({ teamMemberId: "", projectId: "", date: todayKey, note: "" });
  const [assignError, setAssignError] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const [deleteMemberTarget, setDeleteMemberTarget] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState(false);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState<AssignmentRow | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState(false);

  useEffect(() => {
    fetch("/api/team")
      .then((res) => res.json())
      .then((data) => setMembers(data.members ?? []));
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects((data.projects ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))));
    fetch(`/api/assignments?date=${todayKey}`)
      .then((res) => res.json())
      .then((data) => setAssignments(data.assignments ?? []));
  }, []);

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    setMemberError("");
    if (!memberForm.name.trim()) {
      setMemberError("Le nom est requis.");
      return;
    }
    setMemberSubmitting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error || "Impossible d'ajouter ce collaborateur.";
        setMemberError(message);
        toast.error(message);
        return;
      }
      const data = await res.json();
      setMembers((prev) => [...(prev ?? []), data.member]);
      setMemberForm({ name: "", role: "", email: "", phone: "" });
      toast.success("Collaborateur ajouté");
    } catch {
      const message = "Impossible de joindre le serveur — réessayez.";
      setMemberError(message);
      toast.error(message);
    } finally {
      setMemberSubmitting(false);
    }
  }

  async function confirmDeleteMember() {
    if (!deleteMemberTarget) return;
    setDeletingMember(true);
    try {
      const res = await fetch(`/api/team/${deleteMemberTarget.id}`, { method: "DELETE" });
      setDeletingMember(false);
      if (res.ok) {
        setMembers((prev) => (prev ?? []).filter((m) => m.id !== deleteMemberTarget.id));
        setAssignments((prev) => (prev ?? []).filter((a) => a.teamMember.id !== deleteMemberTarget.id));
        toast.success("Collaborateur supprimé");
      } else {
        toast.error("Erreur lors de la suppression du collaborateur.");
      }
    } catch {
      setDeletingMember(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteMemberTarget(null);
  }

  async function handleAddAssignment(e: FormEvent) {
    e.preventDefault();
    setAssignError("");
    if (!assignForm.teamMemberId) {
      setAssignError("Choisissez un collaborateur.");
      return;
    }
    setAssignSubmitting(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamMemberId: assignForm.teamMemberId,
          projectId: assignForm.projectId || undefined,
          date: new Date(`${assignForm.date}T00:00:00.000Z`).toISOString(),
          note: assignForm.note || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error || "Impossible de créer l'affectation.";
        setAssignError(message);
        toast.error(message);
        return;
      }
      const data = await res.json();
      if (assignForm.date === todayKey) {
        setAssignments((prev) => [...(prev ?? []), data.assignment]);
      }
      setAssignForm({ teamMemberId: "", projectId: "", date: todayKey, note: "" });
      toast.success("Affectation créée");
    } catch {
      const message = "Impossible de joindre le serveur — réessayez.";
      setAssignError(message);
      toast.error(message);
    } finally {
      setAssignSubmitting(false);
    }
  }

  async function confirmDeleteAssignment() {
    if (!deleteAssignmentTarget) return;
    setDeletingAssignment(true);
    try {
      const res = await fetch(`/api/assignments/${deleteAssignmentTarget.id}`, { method: "DELETE" });
      setDeletingAssignment(false);
      if (res.ok) {
        setAssignments((prev) => (prev ?? []).filter((a) => a.id !== deleteAssignmentTarget.id));
        toast.success("Affectation supprimée");
      } else {
        toast.error("Erreur lors de la suppression de l'affectation.");
      }
    } catch {
      setDeletingAssignment(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteAssignmentTarget(null);
  }

  function assignmentsForMember(memberId: string) {
    return (assignments ?? []).filter((a) => a.teamMember.id === memberId);
  }

  return (
    <div className="nova-page">
      <header className="nova-page-header">
        <h1>Dispatch équipe</h1>
        <p className="nova-page-subtitle">
          Affectations du jour — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
      </header>

      <Card>
        <CardTitle>Ajouter un collaborateur</CardTitle>
        <form onSubmit={handleAddMember}>
          <Field
            label="Nom"
            required
            value={memberForm.name}
            onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
            placeholder="Julie Martin"
          />
          <Field
            label="Rôle"
            value={memberForm.role}
            onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
            placeholder="Électricienne"
          />
          <Field
            label="Email"
            type="email"
            value={memberForm.email}
            onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
          />
          <Field
            label="Téléphone"
            value={memberForm.phone}
            onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
          />
          {memberError && <div className="error">{memberError}</div>}
          <Button type="submit" disabled={memberSubmitting}>
            {memberSubmitting ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Affecter un collaborateur à un chantier</CardTitle>
        <form onSubmit={handleAddAssignment}>
          <SelectField
            label="Collaborateur"
            required
            value={assignForm.teamMemberId}
            onChange={(e) => setAssignForm({ ...assignForm, teamMemberId: e.target.value })}
          >
            <option value="">Sélectionner...</option>
            {(members ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Chantier"
            value={assignForm.projectId}
            onChange={(e) => setAssignForm({ ...assignForm, projectId: e.target.value })}
          >
            <option value="">Aucun chantier</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <Field
            label="Date"
            type="date"
            required
            value={assignForm.date}
            onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })}
          />
          <TextareaField
            label="Note"
            rows={2}
            value={assignForm.note}
            onChange={(e) => setAssignForm({ ...assignForm, note: e.target.value })}
            placeholder="Matériel à apporter, horaire particulier..."
          />
          {assignError && <div className="error">{assignError}</div>}
          <Button type="submit" disabled={assignSubmitting}>
            {assignSubmitting ? "Affectation..." : "Affecter"}
          </Button>
        </form>
      </Card>

      <section>
        <h2 className="nova-section-title">Équipe</h2>
        {members === null ? null : members.length === 0 ? (
          <EmptyState
            icon="dispatch"
            title="Aucun collaborateur pour l'instant"
            description="Ajoutez votre équipe ci-dessus pour commencer à affecter des chantiers."
          />
        ) : (
          <div className="nova-team-grid">
            {members.map((m) => (
              <div key={m.id} className="nova-team-card">
                <div className="nova-team-card-head">
                  <div>
                    <div className="nova-team-card-name">{m.name}</div>
                    {m.role && <div className="nova-team-card-role">{m.role}</div>}
                  </div>
                  <button
                    type="button"
                    className="nova-icon-btn"
                    onClick={() => setDeleteMemberTarget(m)}
                    aria-label={`Retirer ${m.name}`}
                  >
                    <X size={16} strokeWidth={1.75} />
                  </button>
                </div>
                {(m.email || m.phone) && (
                  <div className="nova-team-card-contact">
                    {m.email && <div>{m.email}</div>}
                    {m.phone && <div>{m.phone}</div>}
                  </div>
                )}
                <div className="nova-team-card-assignments">
                  <div className="nova-team-card-assignments-title">Aujourd'hui</div>
                  {assignmentsForMember(m.id).length === 0 ? (
                    <p className="nova-planning-empty">Aucune affectation</p>
                  ) : (
                    <ul className="nova-planning-people">
                      {assignmentsForMember(m.id).map((a) => (
                        <li key={a.id} className="nova-assignment-item">
                          <span>
                            {a.project?.name || "Sans chantier"}
                            {a.note ? ` — ${a.note}` : ""}
                          </span>
                          <button
                            type="button"
                            className="nova-icon-btn"
                            onClick={() => setDeleteAssignmentTarget(a)}
                            aria-label="Retirer l'affectation"
                          >
                            <X size={13} strokeWidth={1.75} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmModal
        open={deleteMemberTarget !== null}
        itemLabel={deleteMemberTarget ? `le collaborateur « ${deleteMemberTarget.name} »` : ""}
        onConfirm={confirmDeleteMember}
        onCancel={() => setDeleteMemberTarget(null)}
        confirming={deletingMember}
      />
      <ConfirmModal
        open={deleteAssignmentTarget !== null}
        itemLabel={
          deleteAssignmentTarget
            ? `l'affectation de ${deleteAssignmentTarget.teamMember.name}${deleteAssignmentTarget.project ? ` sur « ${deleteAssignmentTarget.project.name} »` : ""}`
            : ""
        }
        onConfirm={confirmDeleteAssignment}
        onCancel={() => setDeleteAssignmentTarget(null)}
        confirming={deletingAssignment}
      />
    </div>
  );
}
