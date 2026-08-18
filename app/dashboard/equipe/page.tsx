"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { Button, ConfirmModal, EditModal, EmptyState, Field, useToast } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type Member = { id: string; name: string; role: string | null; email: string | null; phone: string | null };

const EMPTY_FORM = { name: "", role: "", email: "", phone: "" };

export default function EquipePage() {
  const router = useRouter();
  const toast = useToast();
  const [members, setMembers] = useState<Member[] | null>(null);

  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [savingAdd, setSavingAdd] = useState(false);

  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchWithAuth("/api/team")
      .then((res) => res.json())
      .then((data) => setMembers(data.members ?? []));
  }, []);

  function openAdd() {
    setAddForm(EMPTY_FORM);
    setAdding(true);
  }

  async function confirmAdd() {
    if (!addForm.name.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    setSavingAdd(true);
    try {
      const res = await fetchWithAuth("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible d'ajouter ce collaborateur.");
        return;
      }
      const data = await res.json();
      setMembers((prev) => [...(prev ?? []), data.member]);
      toast.success("Collaborateur ajouté");
      router.refresh();
      setAdding(false);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingAdd(false);
    }
  }

  function openEdit(m: Member) {
    setEditForm({ name: m.name, role: m.role || "", email: m.email || "", phone: m.phone || "" });
    setEditTarget(m);
  }

  async function confirmEdit() {
    if (!editTarget) return;
    if (!editForm.name.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetchWithAuth(`/api/team/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de modifier ce collaborateur.");
        return;
      }
      const data = await res.json();
      setMembers((prev) => (prev ?? []).map((m) => (m.id === data.member.id ? data.member : m)));
      toast.success("Collaborateur mis à jour");
      router.refresh();
      setEditTarget(null);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/team/${deleteTarget.id}`, { method: "DELETE" });
      setDeleting(false);
      if (res.ok) {
        setMembers((prev) => (prev ?? []).filter((m) => m.id !== deleteTarget.id));
        toast.success("Collaborateur supprimé");
        router.refresh();
      } else {
        toast.error("Erreur lors de la suppression du collaborateur.");
      }
    } catch {
      setDeleting(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteTarget(null);
  }

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Équipe</h1>
          <p className="nova-page-subtitle">
            {members === null ? "…" : `${members.length} collaborateur${members.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={openAdd}>
          <UserPlus size={16} strokeWidth={1.75} />
          Ajouter un collaborateur
        </Button>
      </header>

      {members === null ? null : members.length === 0 ? (
        <EmptyState
          icon="equipe"
          title="Aucun collaborateur pour l'instant"
          description="Ajoutez votre équipe pour l'organiser dans le planning et le dispatch."
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
              </div>
              {(m.email || m.phone) && (
                <div className="nova-team-card-contact">
                  {m.email && <div>{m.email}</div>}
                  {m.phone && <div>{m.phone}</div>}
                </div>
              )}
              <div className="nova-team-card-footer">
                <Button variant="secondary" onClick={() => openEdit(m)}>
                  <Pencil size={14} strokeWidth={1.75} />
                  Modifier
                </Button>
                <Button variant="danger" onClick={() => setDeleteTarget(m)}>
                  <Trash2 size={14} strokeWidth={1.75} />
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EditModal open={adding} title="Ajouter un collaborateur" onCancel={() => setAdding(false)} onSave={confirmAdd} saving={savingAdd}>
        <Field
          label="Nom"
          required
          value={addForm.name}
          onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
          placeholder="Julie Martin"
        />
        <Field
          label="Rôle"
          value={addForm.role}
          onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
          placeholder="Électricienne"
        />
        <Field label="Email" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
        <Field label="Téléphone" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
      </EditModal>

      <EditModal
        open={editTarget !== null}
        title="Modifier le collaborateur"
        onCancel={() => setEditTarget(null)}
        onSave={confirmEdit}
        saving={savingEdit}
      >
        <Field label="Nom" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
        <Field label="Rôle" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} />
        <Field label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
        <Field label="Téléphone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
      </EditModal>

      <ConfirmModal
        open={deleteTarget !== null}
        itemLabel={deleteTarget ? `le collaborateur « ${deleteTarget.name} »` : ""}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
