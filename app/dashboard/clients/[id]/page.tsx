"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, FileText, Pencil, Trash2 } from "lucide-react";
import {
  BackLink,
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardTitle,
  ConfirmModal,
  EditModal,
  Field,
  Table,
  TableSkeleton,
  TextareaField,
  Timestamp,
  useToast,
  type TableColumn,
} from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type ClientDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  projects: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
    tasks: { id: string; text: string; createdAt: string }[];
    _count: { voiceReports: number };
  }[];
  devis: { id: string; label: string; status: string; amount: number | null; createdAt: string }[];
};

const PROJECT_STATUS_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};
const PROJECT_STATUS_TONE: Record<string, "neutral" | "teal" | "blue" | "success" | "danger"> = {
  planifie: "neutral",
  en_cours: "blue",
  termine: "success",
  annule: "neutral",
};
const DEVIS_STATUS_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
};
const DEVIS_STATUS_TONE: Record<string, "neutral" | "teal" | "blue" | "success" | "danger"> = {
  brouillon: "neutral",
  envoye: "blue",
  accepte: "success",
  refuse: "danger",
};

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchWithAuth(`/api/clients/${params.id}`).then(async (res) => {
      if (!res.ok) {
        setError("Client introuvable.");
        return;
      }
      const data = await res.json();
      setClient(data.client);
    });
  }, [params.id]);

  function openEdit() {
    if (!client) return;
    setEditForm({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      notes: client.notes || "",
    });
    setEditing(true);
  }

  async function confirmEdit() {
    if (!client) return;
    if (!editForm.name.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetchWithAuth(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de modifier ce client.");
        return;
      }
      const data = await res.json();
      setClient((prev) => (prev ? { ...prev, ...data.client } : prev));
      toast.success("Client mis à jour");
      router.refresh();
      setEditing(false);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/clients/${params.id}`, { method: "DELETE" });
      setDeleting(false);
      if (res.ok) {
        toast.success("Client supprimé");
        router.refresh();
        router.push("/dashboard/clients");
        return;
      }
      toast.error("Erreur lors de la suppression du client.");
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
        <BackLink href="/dashboard/clients" label="Retour aux clients" />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/clients" label="Retour aux clients" />
        <TableSkeleton columns={3} rows={3} />
      </div>
    );
  }

  const projectColumns: TableColumn<ClientDetail["projects"][number]>[] = [
    { key: "name", label: "Chantier" },
    {
      key: "status",
      label: "Statut",
      render: (p) => (
        <Badge tone={PROJECT_STATUS_TONE[p.status] || "neutral"}>{PROJECT_STATUS_LABEL[p.status] || p.status}</Badge>
      ),
    },
    { key: "createdAt", label: "Créé le", render: (p) => <Timestamp date={p.createdAt} /> },
  ];

  const caTotal = client.devis
    .filter((d) => d.status === "accepte")
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  const chantiersEnCours = client.projects.filter((p) => p.status === "en_cours").length;
  const chantiersTermines = client.projects.filter((p) => p.status === "termine").length;

  const dernieresDates = [
    ...client.devis.map((d) => d.createdAt),
    ...client.projects.map((p) => p.createdAt),
  ];
  const derniereInteraction =
    dernieresDates.length > 0
      ? dernieresDates.reduce((latest, d) => (new Date(d) > new Date(latest) ? d : latest))
      : null;

  const tachesEnAttente = client.projects.flatMap((p) =>
    p.tasks.map((t) => ({ ...t, projectId: p.id, projectName: p.name }))
  );
  const nombreRapportsVocaux = client.projects.reduce((sum, p) => sum + p._count.voiceReports, 0);

  const devisColumns: TableColumn<ClientDetail["devis"][number]>[] = [
    { key: "label", label: "Devis" },
    {
      key: "status",
      label: "Statut",
      render: (d) => <Badge tone={DEVIS_STATUS_TONE[d.status] || "neutral"}>{DEVIS_STATUS_LABEL[d.status] || d.status}</Badge>,
    },
    {
      key: "amount",
      label: "Montant",
      align: "right",
      render: (d) => (d.amount != null ? `${d.amount.toLocaleString("fr-FR")} €` : "—"),
    },
    { key: "createdAt", label: "Créé le", render: (d) => <Timestamp date={d.createdAt} /> },
  ];

  return (
    <div className="nova-page">
      <Breadcrumb items={[{ label: "Clients", href: "/dashboard/clients" }, { label: client.name }]} />

      <header className="nova-page-header-row">
        <div>
          <h1>{client.name}</h1>
          <p className="nova-page-subtitle">
            Client depuis le {new Date(client.createdAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="nova-header-actions">
          <Link href={`/dashboard/devis/nouveau?clientId=${client.id}`} className="nova-btn nova-btn-secondary">
            <FileText size={16} strokeWidth={1.75} />
            Nouveau devis
          </Link>
          <Link href={`/dashboard/chantiers/nouveau?clientId=${client.id}`} className="nova-btn nova-btn-secondary">
            <Building2 size={16} strokeWidth={1.75} />
            Nouveau chantier
          </Link>
          <Button variant="secondary" onClick={openEdit}>
            <Pencil size={16} strokeWidth={1.75} />
            Modifier
          </Button>
          <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={16} strokeWidth={1.75} />
            Supprimer le client
          </Button>
        </div>
      </header>

      <Card>
        <CardTitle>Coordonnées</CardTitle>
        <dl className="nova-detail-list">
          <div>
            <dt>Email</dt>
            <dd>{client.email || "—"}</dd>
          </div>
          <div>
            <dt>Téléphone</dt>
            <dd>{client.phone || "—"}</dd>
          </div>
          <div>
            <dt>Adresse</dt>
            <dd>{client.address || "—"}</dd>
          </div>
        </dl>
        {client.notes && <p className="nova-detail-notes">{client.notes}</p>}
      </Card>

      <section>
        <h2 className="nova-section-title">Chantiers ({client.projects.length})</h2>
        <Table
          columns={projectColumns}
          rows={client.projects}
          getRowHref={(p) => `/dashboard/chantiers/${p.id}`}
          emptyLabel="Aucun chantier rattaché à ce client."
        />
      </section>

      <section>
        <h2 className="nova-section-title">Devis ({client.devis.length})</h2>
        <Table columns={devisColumns} rows={client.devis} emptyLabel="Aucun devis rattaché à ce client." />
      </section>

      <section>
        <h2 className="nova-section-title">Résumé d'activité</h2>
        <Card>
          <div className="nova-summary-grid">
            <div>
              <div className="nova-analyse-value">{caTotal.toLocaleString("fr-FR")} €</div>
              <div className="nova-analyse-label">CA total (devis acceptés)</div>
            </div>
            <div>
              <div className="nova-analyse-value">{client.projects.length}</div>
              <div className="nova-analyse-label">
                Chantiers ({chantiersEnCours} en cours, {chantiersTermines} terminés)
              </div>
            </div>
            <div>
              <div className="nova-analyse-value">
                {derniereInteraction ? new Date(derniereInteraction).toLocaleDateString("fr-FR") : "—"}
              </div>
              <div className="nova-analyse-label">Dernière interaction</div>
            </div>
            <div>
              <div className="nova-analyse-value">{nombreRapportsVocaux}</div>
              <div className="nova-analyse-label">Rapports vocaux</div>
            </div>
          </div>

          <p className="nova-summary-subtitle">Tâches en attente ({tachesEnAttente.length})</p>
          {tachesEnAttente.length === 0 ? (
            <p className="nova-page-subtitle">Aucune tâche en attente sur les chantiers de ce client.</p>
          ) : (
            <ul className="nova-summary-task-list">
              {tachesEnAttente.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <span>{t.text}</span>
                  <Link href={`/dashboard/chantiers/${t.projectId}`} className="nova-inline-link">
                    {t.projectName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <ConfirmModal
        open={confirmingDelete}
        itemLabel={`le client « ${client.name} »`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
        confirming={deleting}
      />

      <EditModal open={editing} title="Modifier le client" onCancel={() => setEditing(false)} onSave={confirmEdit} saving={savingEdit}>
        <Field
          label="Nom"
          required
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
        />
        <Field
          label="Email"
          type="email"
          value={editForm.email}
          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
        />
        <Field
          label="Téléphone"
          value={editForm.phone}
          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
        />
        <Field
          label="Adresse"
          value={editForm.address}
          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
        />
        <TextareaField
          label="Notes"
          rows={3}
          value={editForm.notes}
          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
        />
      </EditModal>
    </div>
  );
}
