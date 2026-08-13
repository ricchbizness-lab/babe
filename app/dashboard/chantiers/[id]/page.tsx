"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Share2, Trash2 } from "lucide-react";
import {
  BackLink,
  Badge,
  Button,
  Card,
  CardTitle,
  ConfirmModal,
  DatePickerField,
  EditModal,
  Field,
  SelectField,
  Table,
  TableSkeleton,
  Timestamp,
  useToast,
  type TableColumn,
} from "@/components/ui";
import { toDateKey } from "@/lib/dates";

type ChantierDetail = {
  id: string;
  name: string;
  address: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  client: { id: string; name: string } | null;
  tasks: { id: string; text: string; done: boolean; createdAt: string }[];
  voiceReports: { id: string; authorLabel: string; summary: string; createdAt: string }[];
};

type ClientOption = { id: string; name: string };

const STATUS_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};
const STATUS_TONE: Record<string, "neutral" | "teal" | "success" | "danger"> = {
  planifie: "neutral",
  en_cours: "teal",
  termine: "success",
  annule: "danger",
};

const STATUS_ACTIONS: { status: string; label: string; variant: "secondary" | "primary" | "success" | "danger" }[] = [
  { status: "planifie", label: "Marquer comme planifié", variant: "secondary" },
  { status: "en_cours", label: "Marquer comme en cours", variant: "primary" },
  { status: "termine", label: "Marquer comme terminé", variant: "success" },
  { status: "annule", label: "Marquer comme annulé", variant: "danger" },
];

function statusChangeMessage(status: string, tasksUpdated: number, devisUpdated: number): string {
  if (status === "termine" && tasksUpdated > 0) {
    return `Chantier terminé — ${tasksUpdated} tâche${tasksUpdated > 1 ? "s" : ""} marquée${tasksUpdated > 1 ? "s" : ""} comme terminée${tasksUpdated > 1 ? "s" : ""}`;
  }
  if (status === "annule" && (tasksUpdated > 0 || devisUpdated > 0)) {
    return "Chantier annulé — tâches et devis mis à jour";
  }
  return `Chantier marqué comme ${(STATUS_LABEL[status] || status).toLowerCase()}`;
}

export default function ChantierDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [project, setProject] = useState<ChantierDetail | null>(null);
  const [error, setError] = useState("");
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", address: "", clientId: "", status: "planifie", startDate: "", endDate: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${params.id}`).then(async (res) => {
      if (!res.ok) {
        setError("Chantier introuvable.");
        return;
      }
      const data = await res.json();
      setProject(data.project);
    });
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients((data.clients ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))));
  }, [params.id]);

  async function handleStatusChange(status: string) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.error("Erreur lors de la mise à jour du chantier.");
        return;
      }
      const data = await res.json();
      // Le changement de statut peut entraîner une mise à jour en cascade des
      // tâches (et des devis pour une annulation) — on recharge la fiche
      // complète pour refléter ces changements plutôt que de deviner l'état.
      const refreshed = await fetch(`/api/projects/${params.id}`).then((r) => r.json());
      setProject(refreshed.project);
      toast.success(statusChangeMessage(status, data.tasksUpdated ?? 0, data.devisUpdated ?? 0));
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  function openEdit() {
    if (!project) return;
    setEditForm({
      name: project.name,
      address: project.address || "",
      clientId: project.client?.id || "",
      status: project.status,
      startDate: project.startDate ? toDateKey(new Date(project.startDate)) : "",
      endDate: project.endDate ? toDateKey(new Date(project.endDate)) : "",
    });
    setEditing(true);
  }

  async function confirmEdit() {
    if (!editForm.name.trim()) {
      toast.error("Le nom du chantier est requis.");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          address: editForm.address || undefined,
          clientId: editForm.clientId || undefined,
          status: editForm.status,
          startDate: editForm.startDate ? new Date(`${editForm.startDate}T00:00:00.000Z`).toISOString() : undefined,
          endDate: editForm.endDate ? new Date(`${editForm.endDate}T00:00:00.000Z`).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de modifier ce chantier.");
        return;
      }
      const data = await res.json();
      const refreshed = await fetch(`/api/projects/${params.id}`).then((r) => r.json());
      setProject(refreshed.project);
      const cascaded = (data.tasksUpdated ?? 0) > 0 || (data.devisUpdated ?? 0) > 0;
      toast.success(cascaded ? statusChangeMessage(data.project.status, data.tasksUpdated ?? 0, data.devisUpdated ?? 0) : "Chantier mis à jour");
      setEditing(false);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const res = await fetch(`/api/projects/${params.id}/portal-token`, { method: "POST" });
      setSharing(false);
      if (!res.ok) {
        toast.error("Impossible de générer le lien du portail.");
        return;
      }
      const data = await res.json();
      setPortalUrl(data.url);
    } catch {
      setSharing(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
  }

  async function handleCopy() {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    toast.success("Lien copié !");
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${params.id}`, { method: "DELETE" });
      setDeleting(false);
      if (res.ok) {
        toast.success("Chantier supprimé");
        router.push("/dashboard/chantiers");
        return;
      }
      toast.error("Erreur lors de la suppression du chantier.");
      setConfirmingDelete(false);
    } catch {
      setDeleting(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
      setConfirmingDelete(false);
    }
  }

  if (error) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/chantiers" label="Retour aux chantiers" />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/chantiers" label="Retour aux chantiers" />
        <TableSkeleton columns={3} rows={3} />
      </div>
    );
  }

  const taskColumns: TableColumn<ChantierDetail["tasks"][number]>[] = [
    { key: "text", label: "Tâche" },
    {
      key: "done",
      label: "Statut",
      render: (t) => <Badge tone={t.done ? "success" : "neutral"}>{t.done ? "Faite" : "À faire"}</Badge>,
    },
    { key: "createdAt", label: "Créé le", render: (t) => <Timestamp date={t.createdAt} /> },
  ];

  const reportColumns: TableColumn<ChantierDetail["voiceReports"][number]>[] = [
    { key: "authorLabel", label: "Auteur" },
    { key: "summary", label: "Résumé", render: (r) => <span className="nova-truncate">{r.summary}</span> },
    { key: "createdAt", label: "Le", render: (r) => <Timestamp date={r.createdAt} /> },
  ];

  return (
    <div className="nova-page">
      <BackLink href="/dashboard/chantiers" label="Retour aux chantiers" />

      <header className="nova-page-header-row">
        <div>
          <h1>{project.name}</h1>
          <p className="nova-page-subtitle">
            {project.client ? (
              <Link href={`/dashboard/clients/${project.client.id}`} className="nova-inline-link">
                {project.client.name}
              </Link>
            ) : (
              "Sans client rattaché"
            )}
          </p>
        </div>
        <div className="nova-header-actions">
          <Badge tone={STATUS_TONE[project.status] || "neutral"}>{STATUS_LABEL[project.status] || project.status}</Badge>
          <Button variant="secondary" onClick={openEdit}>
            <Pencil size={16} strokeWidth={1.75} />
            Modifier
          </Button>
          <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={16} strokeWidth={1.75} />
            Supprimer
          </Button>
        </div>
      </header>

      <div className="nova-status-actions">
        {STATUS_ACTIONS.filter((a) => a.status !== project.status).map((a) => (
          <Button key={a.status} variant={a.variant} disabled={updatingStatus} onClick={() => handleStatusChange(a.status)}>
            {a.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardTitle>Portail client</CardTitle>
        <p className="nova-card-text">
          Générez un lien public à envoyer à votre client pour qu'il suive l'avancement de ce chantier, sans avoir
          besoin de compte.
        </p>
        {portalUrl ? (
          <div className="nova-portal-link-row">
            <code className="nova-portal-link">{portalUrl}</code>
            <Button variant="secondary" onClick={handleCopy}>
              <Copy size={16} strokeWidth={1.75} />
              Copier le lien
            </Button>
          </div>
        ) : (
          <Button onClick={handleShare} disabled={sharing}>
            <Share2 size={16} strokeWidth={1.75} />
            {sharing ? "Génération..." : "Partager avec le client"}
          </Button>
        )}
      </Card>

      <Card>
        <CardTitle>Détails</CardTitle>
        <dl className="nova-detail-list">
          <div>
            <dt>Adresse</dt>
            <dd>{project.address || "—"}</dd>
          </div>
          <div>
            <dt>Début</dt>
            <dd>{project.startDate ? new Date(project.startDate).toLocaleDateString("fr-FR") : "—"}</dd>
          </div>
          <div>
            <dt>Fin</dt>
            <dd>{project.endDate ? new Date(project.endDate).toLocaleDateString("fr-FR") : "—"}</dd>
          </div>
        </dl>
      </Card>

      <section>
        <h2 className="nova-section-title">Tâches ({project.tasks.length})</h2>
        <Table columns={taskColumns} rows={project.tasks} emptyLabel="Aucune tâche rattachée à ce chantier." />
      </section>

      <section>
        <div className="nova-section-header-row">
          <h2 className="nova-section-title">Rapports vocaux ({project.voiceReports.length})</h2>
          <Link href={`/dashboard/rapports-vocaux/nouveau?projectId=${project.id}`} className="nova-btn nova-btn-secondary">
            Ajouter un rapport
          </Link>
        </div>
        <Table columns={reportColumns} rows={project.voiceReports} emptyLabel="Aucun rapport vocal rattaché à ce chantier." />
      </section>

      <ConfirmModal
        open={confirmingDelete}
        itemLabel={`le chantier « ${project.name} »`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
        confirming={deleting}
      />

      <EditModal
        open={editing}
        title="Modifier le chantier"
        onCancel={() => setEditing(false)}
        onSave={confirmEdit}
        saving={savingEdit}
      >
        <Field
          label="Nom du chantier"
          required
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
        />
        <SelectField
          label="Client rattaché"
          value={editForm.clientId}
          onChange={(e) => setEditForm({ ...editForm, clientId: e.target.value })}
        >
          <option value="">Aucun client rattaché</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <Field
          label="Adresse"
          value={editForm.address}
          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
        />
        <SelectField
          label="Statut"
          value={editForm.status}
          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
        >
          <option value="planifie">Planifié</option>
          <option value="en_cours">En cours</option>
          <option value="termine">Terminé</option>
          <option value="annule">Annulé</option>
        </SelectField>
        <DatePickerField
          label="Date de début"
          value={editForm.startDate}
          onChange={(value) => setEditForm({ ...editForm, startDate: value })}
        />
        <DatePickerField
          label="Date de fin"
          value={editForm.endDate}
          onChange={(value) => setEditForm({ ...editForm, endDate: value })}
        />
      </EditModal>
    </div>
  );
}
