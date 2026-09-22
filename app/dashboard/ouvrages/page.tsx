"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  ConfirmModal,
  EditModal,
  EmptyState,
  Field,
  FilterBar,
  FilterSelect,
  SearchInput,
  SelectField,
  Table,
  TableSkeleton,
  TextareaField,
  useToast,
  type BadgeTone,
  type TableColumn,
} from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { OUVRAGE_TYPE_LABEL, OUVRAGE_TYPES } from "@/lib/validation";

type Ouvrage = {
  id: string;
  label: string;
  type: string;
  unite: string;
  prixUnitaireHT: number;
  tvaDefaut: number;
  description: string | null;
};

const TYPE_LABEL: Record<string, string> = OUVRAGE_TYPE_LABEL;
const TYPE_TONE: Record<string, BadgeTone> = {
  plomberie: "blue",
  electricite: "amber",
  maconnerie: "neutral",
  peinture: "teal",
  sol: "success",
  menuiserie: "danger",
  autre: "neutral",
};

type FormState = {
  label: string;
  type: string;
  unite: string;
  prixUnitaireHT: string;
  tvaDefaut: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  label: "",
  type: "plomberie",
  unite: "",
  prixUnitaireHT: "",
  tvaDefaut: "20",
  description: "",
};

export default function OuvragesPage() {
  const toast = useToast();
  const [ouvrages, setOuvrages] = useState<Ouvrage[] | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [form, setForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Ouvrage | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchWithAuth("/api/ouvrages")
      .then((res) => res.json())
      .then((data) => setOuvrages(data.ouvrages ?? []));
  }, []);

  const filtered = (ouvrages ?? []).filter((o) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || o.label.toLowerCase().includes(q) || (o.description || "").toLowerCase().includes(q);
    const matchesType = typeFilter === "all" || o.type === typeFilter;
    return matchesQuery && matchesType;
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function openEdit(o: Ouvrage) {
    setForm({
      label: o.label,
      type: o.type,
      unite: o.unite,
      prixUnitaireHT: String(o.prixUnitaireHT),
      tvaDefaut: String(o.tvaDefaut),
      description: o.description || "",
    });
    setEditingId(o.id);
  }

  function closeModal() {
    setForm(null);
    setEditingId(null);
  }

  async function confirmSave() {
    if (!form) return;
    if (!form.label.trim() || !form.unite.trim()) {
      toast.error("Le libellé et l'unité sont requis.");
      return;
    }
    const payload = {
      label: form.label,
      type: form.type,
      unite: form.unite,
      prixUnitaireHT: Number(form.prixUnitaireHT) || 0,
      tvaDefaut: Number(form.tvaDefaut) || 20,
      description: form.description || undefined,
    };
    setSaving(true);
    try {
      const url = editingId ? `/api/ouvrages/${editingId}` : "/api/ouvrages";
      const res = await fetchWithAuth(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible d'enregistrer cet ouvrage.");
        return;
      }
      const data = await res.json();
      const saved: Ouvrage = data.ouvrage;
      setOuvrages((prev) =>
        editingId ? (prev ?? []).map((o) => (o.id === saved.id ? saved : o)) : [...(prev ?? []), saved]
      );
      toast.success(editingId ? "Ouvrage modifié" : "Ouvrage ajouté");
      closeModal();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/ouvrages/${deleteTarget.id}`, { method: "DELETE" });
      setDeleting(false);
      if (res.ok) {
        const deletedId = deleteTarget.id;
        setOuvrages((prev) => (prev ?? []).filter((o) => o.id !== deletedId));
        toast.success("Ouvrage supprimé");
      } else {
        toast.error("Erreur lors de la suppression de l'ouvrage.");
      }
    } catch {
      setDeleting(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteTarget(null);
  }

  const columns: TableColumn<Ouvrage>[] = [
    { key: "label", label: "Libellé", emphasis: "title" },
    {
      key: "type",
      label: "Catégorie",
      render: (o) => <Badge tone={TYPE_TONE[o.type] || "neutral"}>{TYPE_LABEL[o.type] || o.type}</Badge>,
    },
    { key: "unite", label: "Unité" },
    {
      key: "prixUnitaireHT",
      label: "Prix HT",
      align: "right",
      render: (o) => `${o.prixUnitaireHT.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`,
      emphasis: "amount",
      sortable: true,
      sortValue: (o) => o.prixUnitaireHT,
    },
    { key: "tvaDefaut", label: "TVA défaut", align: "right", render: (o) => `${o.tvaDefaut}%` },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (o) => (
        <div className="nova-table-row-actions">
          <button type="button" className="nova-icon-btn nova-icon-btn-edit" onClick={() => openEdit(o)} aria-label={`Modifier ${o.label}`}>
            <Pencil size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="nova-icon-btn" onClick={() => setDeleteTarget(o)} aria-label={`Supprimer ${o.label}`}>
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Bibliothèque d'ouvrages</h1>
          <p className="nova-page-subtitle">
            {ouvrages === null ? "…" : `${ouvrages.length} ouvrage${ouvrages.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} strokeWidth={1.75} />
          Ajouter un ouvrage
        </Button>
      </header>

      <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un ouvrage..." />

      <FilterBar onReset={() => setTypeFilter("all")} active={typeFilter !== "all"}>
        <FilterSelect label="Catégorie" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">Toutes</option>
          {OUVRAGE_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </FilterSelect>
      </FilterBar>

      {ouvrages === null ? (
        <TableSkeleton columns={6} />
      ) : ouvrages.length === 0 ? (
        <>
          <EmptyState
            icon="ouvrages"
            title="Aucun ouvrage pour l'instant — ajoutez votre premier ouvrage"
            description="Enregistrez vos prestations types pour les réutiliser d'un devis à l'autre sans les ressaisir."
          />
          <div className="nova-status-actions">
            <Button onClick={openCreate}>
              <Plus size={16} strokeWidth={1.75} />
              Ajouter un ouvrage
            </Button>
          </div>
        </>
      ) : (
        <Table columns={columns} rows={filtered} emptyLabel="Aucun résultat pour cette recherche." pageSize={15} />
      )}

      <EditModal
        open={form !== null}
        title={editingId ? "Modifier l'ouvrage" : "Ajouter un ouvrage"}
        onCancel={closeModal}
        onSave={confirmSave}
        saving={saving}
      >
        {form && (
          <>
            <Field
              label="Libellé"
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Pose de carrelage"
            />
            <SelectField label="Catégorie" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {OUVRAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </SelectField>
            <Field
              label="Unité"
              required
              value={form.unite}
              onChange={(e) => setForm({ ...form, unite: e.target.value })}
              placeholder="m², unité, forfait..."
            />
            <Field
              label="Prix unitaire HT (€)"
              type="number"
              min="0"
              step="0.01"
              value={form.prixUnitaireHT}
              onChange={(e) => setForm({ ...form, prixUnitaireHT: e.target.value })}
            />
            <Field
              label="TVA par défaut (%)"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={form.tvaDefaut}
              onChange={(e) => setForm({ ...form, tvaDefaut: e.target.value })}
            />
            <TextareaField
              label="Description (optionnel)"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </>
        )}
      </EditModal>

      <ConfirmModal
        open={deleteTarget !== null}
        itemLabel={deleteTarget ? `l'ouvrage « ${deleteTarget.label} »` : ""}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
