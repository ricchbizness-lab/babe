"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  ConfirmModal,
  DatePickerField,
  EditModal,
  EmptyState,
  Field,
  MetricBar,
  SelectField,
  Table,
  TableSkeleton,
  Tabs,
  Timestamp,
  useToast,
  type BadgeTone,
  type TableColumn,
} from "@/components/ui";
import { SOUS_TRAITANT_SPECIALTIES } from "@/lib/validation";
import { toDateKey } from "@/lib/dates";
import { fetchWithAuth } from "@/lib/fetchClient";

type ProjectOption = { id: string; name: string };
type DevisOption = { id: string; label: string };

type Specialty = (typeof SOUS_TRAITANT_SPECIALTIES)[number];

type SousTraitant = {
  id: string;
  name: string;
  siret: string | null;
  email: string | null;
  phone: string | null;
  specialty: Specialty;
  tvaIntracom: string | null;
  contrats: { id: string; statut: string }[];
};

type Contrat = {
  id: string;
  description: string;
  montantHT: number;
  statut: "en_cours" | "termine" | "annule";
  dateDebut: string | null;
  dateFin: string | null;
  createdAt: string;
  sousTraitant: { id: string; name: string; specialty: Specialty };
  project: { id: string; name: string } | null;
  devis: { id: string; label: string } | null;
};

const SPECIALTY_LABEL: Record<Specialty, string> = {
  plomberie: "Plomberie",
  electricite: "Électricité",
  maconnerie: "Maçonnerie",
  autre: "Autre",
};

const CONTRAT_STATUT_LABEL: Record<Contrat["statut"], string> = {
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};
const CONTRAT_STATUT_TONE: Record<Contrat["statut"], BadgeTone> = {
  en_cours: "blue",
  termine: "success",
  annule: "neutral",
};

const EMPTY_SOUS_TRAITANT_FORM = { name: "", siret: "", email: "", phone: "", specialty: "plomberie" as Specialty, tvaIntracom: "" };
const EMPTY_CONTRAT_FORM = {
  sousTraitantId: "",
  projectId: "",
  devisId: "",
  description: "",
  montantHT: "",
  statut: "en_cours" as Contrat["statut"],
  dateDebut: "",
  dateFin: "",
};

export default function SousTraitancePage() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"sous-traitants" | "contrats">("sous-traitants");
  const [sousTraitants, setSousTraitants] = useState<SousTraitant[] | null>(null);
  const [contrats, setContrats] = useState<Contrat[] | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [devisOptions, setDevisOptions] = useState<DevisOption[]>([]);

  const [addingSousTraitant, setAddingSousTraitant] = useState(false);
  const [sousTraitantForm, setSousTraitantForm] = useState(EMPTY_SOUS_TRAITANT_FORM);
  const [savingSousTraitant, setSavingSousTraitant] = useState(false);
  const [editSousTraitantTarget, setEditSousTraitantTarget] = useState<SousTraitant | null>(null);
  const [deleteSousTraitantTarget, setDeleteSousTraitantTarget] = useState<SousTraitant | null>(null);
  const [deletingSousTraitant, setDeletingSousTraitant] = useState(false);

  const [addingContrat, setAddingContrat] = useState(false);
  const [contratForm, setContratForm] = useState(EMPTY_CONTRAT_FORM);
  const [savingContrat, setSavingContrat] = useState(false);
  const [editContratTarget, setEditContratTarget] = useState<Contrat | null>(null);
  const [deleteContratTarget, setDeleteContratTarget] = useState<Contrat | null>(null);
  const [deletingContrat, setDeletingContrat] = useState(false);

  useEffect(() => {
    fetchWithAuth("/api/sous-traitants")
      .then((res) => res.json())
      .then((data) => setSousTraitants(data.sousTraitants ?? []));
    fetchWithAuth("/api/contrats-sous-traitance")
      .then((res) => res.json())
      .then((data) => setContrats(data.contrats ?? []));
    fetchWithAuth("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects((data.projects ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))));
    fetchWithAuth("/api/devis")
      .then((res) => res.json())
      .then((data) => setDevisOptions((data.devis ?? []).map((d: { id: string; label: string }) => ({ id: d.id, label: d.label }))));
  }, []);

  const loading = sousTraitants === null || contrats === null;

  // --- Sous-traitants ---

  function openAddSousTraitant() {
    setSousTraitantForm(EMPTY_SOUS_TRAITANT_FORM);
    setAddingSousTraitant(true);
  }

  async function confirmAddSousTraitant() {
    if (!sousTraitantForm.name.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    setSavingSousTraitant(true);
    try {
      const res = await fetchWithAuth("/api/sous-traitants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sousTraitantForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible d'ajouter ce sous-traitant.");
        return;
      }
      const data = await res.json();
      setSousTraitants((prev) => [...(prev ?? []), { ...data.sousTraitant, contrats: [] }]);
      toast.success("Sous-traitant ajouté");
      router.refresh();
      setAddingSousTraitant(false);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingSousTraitant(false);
    }
  }

  function openEditSousTraitant(s: SousTraitant) {
    setSousTraitantForm({
      name: s.name,
      siret: s.siret || "",
      email: s.email || "",
      phone: s.phone || "",
      specialty: s.specialty,
      tvaIntracom: s.tvaIntracom || "",
    });
    setEditSousTraitantTarget(s);
  }

  async function confirmEditSousTraitant() {
    if (!editSousTraitantTarget) return;
    if (!sousTraitantForm.name.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    setSavingSousTraitant(true);
    try {
      const res = await fetchWithAuth(`/api/sous-traitants/${editSousTraitantTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sousTraitantForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de modifier ce sous-traitant.");
        return;
      }
      const data = await res.json();
      setSousTraitants((prev) => (prev ?? []).map((s) => (s.id === data.sousTraitant.id ? data.sousTraitant : s)));
      toast.success("Sous-traitant mis à jour");
      router.refresh();
      setEditSousTraitantTarget(null);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingSousTraitant(false);
    }
  }

  async function confirmDeleteSousTraitant() {
    if (!deleteSousTraitantTarget) return;
    setDeletingSousTraitant(true);
    try {
      const res = await fetchWithAuth(`/api/sous-traitants/${deleteSousTraitantTarget.id}`, { method: "DELETE" });
      setDeletingSousTraitant(false);
      if (res.ok) {
        setSousTraitants((prev) => (prev ?? []).filter((s) => s.id !== deleteSousTraitantTarget.id));
        setContrats((prev) => (prev ?? []).filter((c) => c.sousTraitant.id !== deleteSousTraitantTarget.id));
        toast.success("Sous-traitant supprimé");
        router.refresh();
      } else {
        toast.error("Erreur lors de la suppression du sous-traitant.");
      }
    } catch {
      setDeletingSousTraitant(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteSousTraitantTarget(null);
  }

  // --- Contrats ---

  function openAddContrat() {
    setContratForm(EMPTY_CONTRAT_FORM);
    setAddingContrat(true);
  }

  function buildContratPayload() {
    return {
      sousTraitantId: contratForm.sousTraitantId,
      projectId: contratForm.projectId || undefined,
      devisId: contratForm.devisId || undefined,
      description: contratForm.description,
      montantHT: Number(contratForm.montantHT) || 0,
      statut: contratForm.statut,
      dateDebut: contratForm.dateDebut ? new Date(`${contratForm.dateDebut}T00:00:00.000Z`).toISOString() : undefined,
      dateFin: contratForm.dateFin ? new Date(`${contratForm.dateFin}T00:00:00.000Z`).toISOString() : undefined,
    };
  }

  async function confirmAddContrat() {
    if (!contratForm.sousTraitantId) {
      toast.error("Choisissez un sous-traitant.");
      return;
    }
    if (!contratForm.description.trim()) {
      toast.error("La description est requise.");
      return;
    }
    setSavingContrat(true);
    try {
      const res = await fetchWithAuth("/api/contrats-sous-traitance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildContratPayload()),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de créer ce contrat.");
        return;
      }
      const data = await res.json();
      setContrats((prev) => [data.contrat, ...(prev ?? [])]);
      toast.success("Contrat créé");
      router.refresh();
      setAddingContrat(false);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingContrat(false);
    }
  }

  function openEditContrat(c: Contrat) {
    setContratForm({
      sousTraitantId: c.sousTraitant.id,
      projectId: c.project?.id || "",
      devisId: c.devis?.id || "",
      description: c.description,
      montantHT: String(c.montantHT),
      statut: c.statut,
      dateDebut: c.dateDebut ? toDateKey(new Date(c.dateDebut)) : "",
      dateFin: c.dateFin ? toDateKey(new Date(c.dateFin)) : "",
    });
    setEditContratTarget(c);
  }

  async function confirmEditContrat() {
    if (!editContratTarget) return;
    setSavingContrat(true);
    try {
      const res = await fetchWithAuth(`/api/contrats-sous-traitance/${editContratTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildContratPayload()),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de modifier ce contrat.");
        return;
      }
      const data = await res.json();
      setContrats((prev) => (prev ?? []).map((c) => (c.id === data.contrat.id ? data.contrat : c)));
      toast.success("Contrat mis à jour");
      router.refresh();
      setEditContratTarget(null);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingContrat(false);
    }
  }

  async function confirmDeleteContrat() {
    if (!deleteContratTarget) return;
    setDeletingContrat(true);
    try {
      const res = await fetchWithAuth(`/api/contrats-sous-traitance/${deleteContratTarget.id}`, { method: "DELETE" });
      setDeletingContrat(false);
      if (res.ok) {
        setContrats((prev) => (prev ?? []).filter((c) => c.id !== deleteContratTarget.id));
        toast.success("Contrat supprimé");
        router.refresh();
      } else {
        toast.error("Erreur lors de la suppression du contrat.");
      }
    } catch {
      setDeletingContrat(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteContratTarget(null);
  }

  // --- Métriques ---

  const sousTraitantsList = sousTraitants ?? [];
  const contratsList = contrats ?? [];
  const contratsActifs = contratsList.filter((c) => c.statut === "en_cours").length;
  const montantTotalEnCours = contratsList.filter((c) => c.statut === "en_cours").reduce((sum, c) => sum + c.montantHT, 0);

  const sousTraitantColumns: TableColumn<SousTraitant>[] = [
    { key: "name", label: "Nom", emphasis: "title" },
    { key: "specialty", label: "Spécialité", render: (s) => <Badge tone="teal">{SPECIALTY_LABEL[s.specialty] || s.specialty}</Badge> },
    { key: "contact", label: "Contact", render: (s) => s.email || s.phone || "—" },
    {
      key: "contratsActifs",
      label: "Contrats actifs",
      align: "right",
      render: (s) => s.contrats.filter((c) => c.statut === "en_cours").length,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (s) => (
        <span className="nova-team-card-actions">
          <button type="button" className="nova-team-card-edit-link" onClick={() => openEditSousTraitant(s)} aria-label="Modifier le sous-traitant">
            <Pencil size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="nova-icon-btn" onClick={() => setDeleteSousTraitantTarget(s)} aria-label="Supprimer le sous-traitant">
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </span>
      ),
    },
  ];

  const contratColumns: TableColumn<Contrat>[] = [
    { key: "sousTraitant", label: "Sous-traitant", render: (c) => c.sousTraitant.name, emphasis: "title" },
    { key: "project", label: "Chantier", render: (c) => c.project?.name || "—" },
    { key: "description", label: "Description", render: (c) => c.description },
    {
      key: "montantHT",
      label: "Montant HT",
      align: "right",
      render: (c) => `${c.montantHT.toLocaleString("fr-FR")} €`,
      sortable: true,
      sortValue: (c) => c.montantHT,
      emphasis: "amount",
    },
    {
      key: "statut",
      label: "Statut",
      render: (c) => <Badge tone={CONTRAT_STATUT_TONE[c.statut]}>{CONTRAT_STATUT_LABEL[c.statut]}</Badge>,
    },
    {
      key: "dates",
      label: "Dates",
      render: (c) =>
        c.dateDebut ? (
          <>
            <Timestamp date={c.dateDebut} />
            {c.dateFin && (
              <>
                {" → "}
                <Timestamp date={c.dateFin} />
              </>
            )}
          </>
        ) : (
          "—"
        ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (c) => (
        <span className="nova-team-card-actions">
          <button type="button" className="nova-team-card-edit-link" onClick={() => openEditContrat(c)} aria-label="Modifier le contrat">
            <Pencil size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="nova-icon-btn" onClick={() => setDeleteContratTarget(c)} aria-label="Supprimer le contrat">
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Sous-traitance</h1>
          <p className="nova-page-subtitle">
            {loading ? "…" : `${sousTraitantsList.length} sous-traitant${sousTraitantsList.length > 1 ? "s" : ""}`}
          </p>
        </div>
        {tab === "sous-traitants" ? (
          <Button onClick={openAddSousTraitant}>
            <Plus size={16} strokeWidth={1.75} />
            Ajouter un sous-traitant
          </Button>
        ) : (
          <Button onClick={openAddContrat}>
            <Plus size={16} strokeWidth={1.75} />
            Nouveau contrat
          </Button>
        )}
      </header>

      {!loading && (
        <MetricBar
          items={[
            { label: "Sous-traitants", value: sousTraitantsList.length },
            { label: "Contrats en cours", value: contratsActifs },
            { label: "Montant HT en cours", value: `${montantTotalEnCours.toLocaleString("fr-FR")} €` },
          ]}
        />
      )}

      <Tabs
        tabs={[
          { key: "sous-traitants", label: "Sous-traitants" },
          { key: "contrats", label: "Contrats" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <TableSkeleton columns={5} />
      ) : tab === "sous-traitants" ? (
        sousTraitantsList.length === 0 ? (
          <EmptyState
            icon="sous-traitance"
            title="Aucun sous-traitant pour l'instant"
            description="Ajoutez vos sous-traitants pour leur rattacher des contrats et suivre vos coûts réels."
          />
        ) : (
          <Table columns={sousTraitantColumns} rows={sousTraitantsList} emptyLabel="Aucun sous-traitant." pageSize={10} />
        )
      ) : contratsList.length === 0 ? (
        <EmptyState
          icon="sous-traitance"
          title="Aucun contrat pour l'instant"
          description="Créez un contrat de sous-traitance rattaché à un chantier pour suivre son coût dans la rentabilité."
        />
      ) : (
        <Table columns={contratColumns} rows={contratsList} emptyLabel="Aucun contrat." pageSize={10} />
      )}

      <EditModal
        open={addingSousTraitant}
        title="Nouveau sous-traitant"
        onCancel={() => setAddingSousTraitant(false)}
        onSave={confirmAddSousTraitant}
        saving={savingSousTraitant}
      >
        <Field label="Nom" required value={sousTraitantForm.name} onChange={(e) => setSousTraitantForm({ ...sousTraitantForm, name: e.target.value })} />
        <SelectField
          label="Spécialité"
          value={sousTraitantForm.specialty}
          onChange={(e) => setSousTraitantForm({ ...sousTraitantForm, specialty: e.target.value as Specialty })}
        >
          {SOUS_TRAITANT_SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {SPECIALTY_LABEL[s]}
            </option>
          ))}
        </SelectField>
        <Field label="SIRET" value={sousTraitantForm.siret} onChange={(e) => setSousTraitantForm({ ...sousTraitantForm, siret: e.target.value })} />
        <Field label="Email" type="email" value={sousTraitantForm.email} onChange={(e) => setSousTraitantForm({ ...sousTraitantForm, email: e.target.value })} />
        <Field label="Téléphone" value={sousTraitantForm.phone} onChange={(e) => setSousTraitantForm({ ...sousTraitantForm, phone: e.target.value })} />
        <Field
          label="TVA intracommunautaire"
          value={sousTraitantForm.tvaIntracom}
          onChange={(e) => setSousTraitantForm({ ...sousTraitantForm, tvaIntracom: e.target.value })}
        />
      </EditModal>

      <EditModal
        open={editSousTraitantTarget !== null}
        title="Modifier le sous-traitant"
        onCancel={() => setEditSousTraitantTarget(null)}
        onSave={confirmEditSousTraitant}
        saving={savingSousTraitant}
      >
        <Field label="Nom" required value={sousTraitantForm.name} onChange={(e) => setSousTraitantForm({ ...sousTraitantForm, name: e.target.value })} />
        <SelectField
          label="Spécialité"
          value={sousTraitantForm.specialty}
          onChange={(e) => setSousTraitantForm({ ...sousTraitantForm, specialty: e.target.value as Specialty })}
        >
          {SOUS_TRAITANT_SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {SPECIALTY_LABEL[s]}
            </option>
          ))}
        </SelectField>
        <Field label="SIRET" value={sousTraitantForm.siret} onChange={(e) => setSousTraitantForm({ ...sousTraitantForm, siret: e.target.value })} />
        <Field label="Email" type="email" value={sousTraitantForm.email} onChange={(e) => setSousTraitantForm({ ...sousTraitantForm, email: e.target.value })} />
        <Field label="Téléphone" value={sousTraitantForm.phone} onChange={(e) => setSousTraitantForm({ ...sousTraitantForm, phone: e.target.value })} />
        <Field
          label="TVA intracommunautaire"
          value={sousTraitantForm.tvaIntracom}
          onChange={(e) => setSousTraitantForm({ ...sousTraitantForm, tvaIntracom: e.target.value })}
        />
      </EditModal>

      <ConfirmModal
        open={deleteSousTraitantTarget !== null}
        itemLabel={deleteSousTraitantTarget ? `le sous-traitant « ${deleteSousTraitantTarget.name} » (et ses contrats associés)` : ""}
        onConfirm={confirmDeleteSousTraitant}
        onCancel={() => setDeleteSousTraitantTarget(null)}
        confirming={deletingSousTraitant}
      />

      <EditModal
        open={addingContrat}
        title="Nouveau contrat de sous-traitance"
        onCancel={() => setAddingContrat(false)}
        onSave={confirmAddContrat}
        saving={savingContrat}
      >
        <SelectField
          label="Sous-traitant"
          required
          value={contratForm.sousTraitantId}
          onChange={(e) => setContratForm({ ...contratForm, sousTraitantId: e.target.value })}
        >
          <option value="">Sélectionner...</option>
          {sousTraitantsList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Chantier" value={contratForm.projectId} onChange={(e) => setContratForm({ ...contratForm, projectId: e.target.value })}>
          <option value="">Aucun chantier</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Devis rattaché" value={contratForm.devisId} onChange={(e) => setContratForm({ ...contratForm, devisId: e.target.value })}>
          <option value="">Aucun devis</option>
          {devisOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </SelectField>
        <Field
          label="Description"
          required
          value={contratForm.description}
          onChange={(e) => setContratForm({ ...contratForm, description: e.target.value })}
          placeholder="Lot électricité, 2ème étage"
        />
        <Field
          label="Montant HT (€)"
          type="number"
          min="0"
          step="1"
          value={contratForm.montantHT}
          onChange={(e) => setContratForm({ ...contratForm, montantHT: e.target.value })}
        />
        <SelectField
          label="Statut"
          value={contratForm.statut}
          onChange={(e) => setContratForm({ ...contratForm, statut: e.target.value as Contrat["statut"] })}
        >
          <option value="en_cours">En cours</option>
          <option value="termine">Terminé</option>
          <option value="annule">Annulé</option>
        </SelectField>
        <DatePickerField label="Date de début" value={contratForm.dateDebut} onChange={(value) => setContratForm({ ...contratForm, dateDebut: value })} />
        <DatePickerField label="Date de fin" value={contratForm.dateFin} onChange={(value) => setContratForm({ ...contratForm, dateFin: value })} />
      </EditModal>

      <EditModal
        open={editContratTarget !== null}
        title="Modifier le contrat"
        onCancel={() => setEditContratTarget(null)}
        onSave={confirmEditContrat}
        saving={savingContrat}
      >
        <SelectField
          label="Sous-traitant"
          required
          value={contratForm.sousTraitantId}
          onChange={(e) => setContratForm({ ...contratForm, sousTraitantId: e.target.value })}
        >
          <option value="">Sélectionner...</option>
          {sousTraitantsList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Chantier" value={contratForm.projectId} onChange={(e) => setContratForm({ ...contratForm, projectId: e.target.value })}>
          <option value="">Aucun chantier</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Devis rattaché" value={contratForm.devisId} onChange={(e) => setContratForm({ ...contratForm, devisId: e.target.value })}>
          <option value="">Aucun devis</option>
          {devisOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </SelectField>
        <Field
          label="Description"
          required
          value={contratForm.description}
          onChange={(e) => setContratForm({ ...contratForm, description: e.target.value })}
        />
        <Field
          label="Montant HT (€)"
          type="number"
          min="0"
          step="1"
          value={contratForm.montantHT}
          onChange={(e) => setContratForm({ ...contratForm, montantHT: e.target.value })}
        />
        <SelectField
          label="Statut"
          value={contratForm.statut}
          onChange={(e) => setContratForm({ ...contratForm, statut: e.target.value as Contrat["statut"] })}
        >
          <option value="en_cours">En cours</option>
          <option value="termine">Terminé</option>
          <option value="annule">Annulé</option>
        </SelectField>
        <DatePickerField label="Date de début" value={contratForm.dateDebut} onChange={(value) => setContratForm({ ...contratForm, dateDebut: value })} />
        <DatePickerField label="Date de fin" value={contratForm.dateFin} onChange={(value) => setContratForm({ ...contratForm, dateFin: value })} />
      </EditModal>

      <ConfirmModal
        open={deleteContratTarget !== null}
        itemLabel={deleteContratTarget ? `le contrat « ${deleteContratTarget.description} »` : ""}
        onConfirm={confirmDeleteContrat}
        onCancel={() => setDeleteContratTarget(null)}
        confirming={deletingContrat}
      />
    </div>
  );
}
