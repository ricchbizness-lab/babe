"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Banknote, Building2, FileText, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import {
  BackLink,
  Badge,
  Breadcrumb,
  Card,
  CardTitle,
  Button,
  ConfirmModal,
  EditModal,
  Field,
  RelanceIndicator,
  SelectField,
  Skeleton,
  Table,
  TextareaField,
  Timestamp,
  useToast,
  type TableColumn,
} from "@/components/ui";
import { daysSinceSent } from "@/lib/relance";
import { fetchWithAuth } from "@/lib/fetchClient";
import { computeDevisTotals, lineTotalHT } from "@/lib/devisTotals";

type DevisLineType = "prestation" | "materiel" | "deplacement" | "maindoeuvre" | "autre";

type DevisLine = {
  id: string;
  type: DevisLineType;
  description: string;
  quantite: number;
  unite: string | null;
  prixUnitaire: number;
  tva: number;
};

type DevisDetail = {
  id: string;
  label: string;
  description: string | null;
  amount: number | null;
  status: string;
  paymentStatus: string;
  content: string;
  remise: number | null;
  notesDevis: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string } | null;
  lines: DevisLine[];
};

const STATUS_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
};
const STATUS_TONE: Record<string, "neutral" | "teal" | "success" | "danger"> = {
  brouillon: "neutral",
  envoye: "teal",
  accepte: "success",
  refuse: "danger",
};

const STATUS_ACTIONS: { status: string; label: string; variant: "primary" | "success" | "danger" }[] = [
  { status: "envoye", label: "Marquer comme envoyé", variant: "primary" },
  { status: "accepte", label: "Marquer comme accepté", variant: "success" },
  { status: "refuse", label: "Marquer comme refusé", variant: "danger" },
];

const LINE_TYPE_LABEL: Record<DevisLineType, string> = {
  prestation: "Prestation",
  materiel: "Matériel",
  deplacement: "Déplacement",
  maindoeuvre: "Main d'œuvre",
  autre: "Autre",
};
const LINE_TYPE_TONE: Record<DevisLineType, "neutral" | "teal" | "amber" | "success"> = {
  prestation: "teal",
  materiel: "amber",
  deplacement: "neutral",
  maindoeuvre: "success",
  autre: "neutral",
};

type LineFormState = {
  type: DevisLineType;
  description: string;
  quantite: string;
  unite: string;
  prixUnitaire: string;
  tva: string;
};

const EMPTY_LINE_FORM: LineFormState = {
  type: "prestation",
  description: "",
  quantite: "1",
  unite: "",
  prixUnitaire: "",
  tva: "20",
};

export default function DevisDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [devis, setDevis] = useState<DevisDetail | null>(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [relanceMessage, setRelanceMessage] = useState<string | null>(null);
  const [generatingRelance, setGeneratingRelance] = useState(false);
  const [chantierPromptDismissed, setChantierPromptDismissed] = useState(false);

  const [lineForm, setLineForm] = useState<LineFormState | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [savingLine, setSavingLine] = useState(false);
  const [deleteLineTarget, setDeleteLineTarget] = useState<DevisLine | null>(null);
  const [deletingLine, setDeletingLine] = useState(false);

  const [remiseInput, setRemiseInput] = useState("0");
  const [notesInput, setNotesInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [requestingPayment, setRequestingPayment] = useState(false);

  useEffect(() => {
    fetchWithAuth(`/api/devis/${params.id}`).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(res.status === 404 || res.status === 403 ? "Devis introuvable." : data.error || "Erreur lors du chargement du devis.");
        return;
      }
      const data = await res.json();
      setDevis(data.devis);
      setRemiseInput(String(data.devis.remise ?? 0));
      setNotesInput(data.devis.notesDevis || "");
    });
  }, [params.id]);

  // Retour de Stripe Checkout (paiement direct depuis un devis accepté).
  useEffect(() => {
    if (!devis) return;
    const payment = searchParams.get("payment");
    if (payment === "success" && devis.paymentStatus !== "payee") {
      fetchWithAuth(`/api/devis/${devis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "payee" }),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setDevis(data.devis);
          toast.success("Paiement reçu");
          router.refresh();
        }
      });
      router.replace(`/dashboard/devis/${devis.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devis?.id, searchParams]);

  async function handleStatusChange(status: string) {
    if (!devis) return;
    setUpdating(true);
    try {
      const res = await fetchWithAuth(`/api/devis/${devis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setDevis(data.devis);
        toast.success(`Devis marqué comme ${STATUS_LABEL[status]?.toLowerCase() || status}`);
        if (res.headers.get("X-Email-Error") === "true") {
          toast.error("Statut mis à jour mais l'email n'a pas pu être envoyé — vérifiez votre configuration Resend.");
        }
        router.refresh();
        return;
      }
      toast.error("Erreur lors de la mise à jour du devis.");
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleRequestPayment() {
    if (!devis) return;
    setRequestingPayment(true);
    try {
      const res = await fetchWithAuth("/api/stripe/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId: devis.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de créer le lien de paiement.");
        return;
      }
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setRequestingPayment(false);
    }
  }

  async function handleRelance() {
    if (!devis) return;
    setGeneratingRelance(true);
    setRelanceMessage(null);
    try {
      const res = await fetchWithAuth("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "reponse_client",
          input: {
            context: "relance devis",
            clientName: devis.client?.name || "ce client",
            devisLabel: devis.label,
            montant: devis.amount,
            joursEcoules: daysSinceSent(devis.updatedAt),
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erreur lors de la génération du message de relance.");
        return;
      }
      const data = await res.json();
      setRelanceMessage(data.result || "");
      toast.success("Message de relance généré");
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setGeneratingRelance(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/devis/${params.id}`, { method: "DELETE" });
      setDeleting(false);
      if (res.ok) {
        toast.success("Devis supprimé");
        router.refresh();
        router.push("/dashboard/devis");
        return;
      }
      toast.error("Erreur lors de la suppression du devis.");
      setConfirmingDelete(false);
    } catch {
      setDeleting(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
      setConfirmingDelete(false);
    }
  }

  function openAddLine() {
    setEditingLineId(null);
    setLineForm({ ...EMPTY_LINE_FORM });
  }

  function openEditLine(line: DevisLine) {
    setEditingLineId(line.id);
    setLineForm({
      type: line.type,
      description: line.description,
      quantite: String(line.quantite),
      unite: line.unite || "",
      prixUnitaire: String(line.prixUnitaire),
      tva: String(line.tva),
    });
  }

  function closeLineModal() {
    setLineForm(null);
    setEditingLineId(null);
  }

  async function confirmLineSave() {
    if (!devis || !lineForm) return;
    if (!lineForm.description.trim()) {
      toast.error("La description est requise.");
      return;
    }
    const payload = {
      type: lineForm.type,
      description: lineForm.description,
      quantite: Number(lineForm.quantite) || 0,
      unite: lineForm.unite || undefined,
      prixUnitaire: Number(lineForm.prixUnitaire) || 0,
      tva: Number(lineForm.tva) || 0,
    };
    setSavingLine(true);
    try {
      const url = editingLineId ? `/api/devis-lines/${editingLineId}` : `/api/devis/${devis.id}/lines`;
      const res = await fetchWithAuth(url, {
        method: editingLineId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible d'enregistrer cette ligne.");
        return;
      }
      const data = await res.json();
      const savedLine: DevisLine = data.line;
      setDevis((prev) =>
        prev
          ? {
              ...prev,
              lines: editingLineId
                ? prev.lines.map((l) => (l.id === savedLine.id ? savedLine : l))
                : [...prev.lines, savedLine],
            }
          : prev
      );
      toast.success(editingLineId ? "Ligne modifiée" : "Ligne ajoutée");
      router.refresh();
      closeLineModal();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingLine(false);
    }
  }

  async function confirmDeleteLine() {
    if (!deleteLineTarget) return;
    setDeletingLine(true);
    try {
      const res = await fetchWithAuth(`/api/devis-lines/${deleteLineTarget.id}`, { method: "DELETE" });
      setDeletingLine(false);
      if (res.ok) {
        const deletedId = deleteLineTarget.id;
        setDevis((prev) => (prev ? { ...prev, lines: prev.lines.filter((l) => l.id !== deletedId) } : prev));
        toast.success("Ligne supprimée");
        router.refresh();
      } else {
        toast.error("Erreur lors de la suppression de la ligne.");
      }
    } catch {
      setDeletingLine(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteLineTarget(null);
  }

  async function handleSaveSettings() {
    if (!devis) return;
    setSavingSettings(true);
    try {
      const res = await fetchWithAuth(`/api/devis/${devis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remise: Number(remiseInput) || 0,
          notesDevis: notesInput,
        }),
      });
      if (!res.ok) {
        toast.error("Impossible d'enregistrer la remise et les notes.");
        return;
      }
      const data = await res.json();
      setDevis(data.devis);
      toast.success("Remise et notes enregistrées");
      router.refresh();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingSettings(false);
    }
  }

  if (error) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/devis" label="Retour aux devis" />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!devis) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/devis" label="Retour aux devis" />
        <Card>
          <p className="nova-page-subtitle">Chargement...</p>
        </Card>
      </div>
    );
  }

  const remisePct = devis.remise || 0;
  const totals = computeDevisTotals(devis.lines, remisePct);

  const lineColumns: TableColumn<DevisLine>[] = [
    {
      key: "type",
      label: "Type",
      render: (l) => <Badge tone={LINE_TYPE_TONE[l.type]}>{LINE_TYPE_LABEL[l.type] || l.type}</Badge>,
    },
    { key: "description", label: "Description" },
    { key: "quantite", label: "Qté", align: "right", render: (l) => l.quantite.toLocaleString("fr-FR") },
    { key: "unite", label: "Unité", render: (l) => l.unite || "—" },
    {
      key: "prixUnitaire",
      label: "Prix unitaire HT",
      align: "right",
      render: (l) => `${l.prixUnitaire.toLocaleString("fr-FR")} €`,
    },
    { key: "tva", label: "TVA %", align: "right", render: (l) => `${l.tva}%` },
    {
      key: "totalHT",
      label: "Total HT",
      align: "right",
      render: (l) => `${lineTotalHT(l).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (l) => (
        <div className="nova-table-row-actions">
          <button
            type="button"
            className="nova-icon-btn nova-icon-btn-edit"
            onClick={() => openEditLine(l)}
            aria-label="Modifier la ligne"
          >
            <Pencil size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="nova-icon-btn"
            onClick={() => setDeleteLineTarget(l)}
            aria-label="Supprimer la ligne"
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="nova-page">
      <Breadcrumb items={[{ label: "Devis", href: "/dashboard/devis" }, { label: devis.label }]} />

      <header className="nova-page-header-row">
        <div>
          <h1>{devis.label}</h1>
          <p className="nova-page-subtitle">
            {devis.client ? (
              <Link href={`/dashboard/clients/${devis.client.id}`} className="nova-inline-link">
                {devis.client.name}
              </Link>
            ) : (
              "Sans client rattaché"
            )}
            {devis.amount != null && <> · {devis.amount.toLocaleString("fr-FR")} €</>}
          </p>
        </div>
        <div className="nova-page-header-badges">
          <Badge tone={STATUS_TONE[devis.status] || "neutral"}>{STATUS_LABEL[devis.status] || devis.status}</Badge>
          {devis.paymentStatus === "payee" && <Badge tone="success">Payé</Badge>}
          <RelanceIndicator status={devis.status} updatedAt={devis.updatedAt} />
        </div>
      </header>

      <div className="nova-status-actions">
        {STATUS_ACTIONS.filter((a) => a.status !== devis.status).map((a) => (
          <Button key={a.status} variant={a.variant} disabled={updating} onClick={() => handleStatusChange(a.status)}>
            {a.label}
          </Button>
        ))}
        {devis.status === "accepte" && (
          <Link href={`/dashboard/facturation/${devis.id}`} className="nova-btn nova-btn-secondary">
            <FileText size={16} strokeWidth={1.75} />
            Voir la facture
          </Link>
        )}
        {devis.status === "envoye" && (
          <Button variant="secondary" disabled={generatingRelance} onClick={handleRelance}>
            <MessageCircle size={16} strokeWidth={1.75} />
            {generatingRelance ? "Génération..." : "Relancer le client"}
          </Button>
        )}
        {devis.status === "accepte" && devis.amount != null && devis.paymentStatus !== "payee" && (
          <Button variant="secondary" disabled={requestingPayment} onClick={handleRequestPayment}>
            <Banknote size={16} strokeWidth={1.75} />
            {requestingPayment ? "Redirection..." : "Demander le paiement"}
          </Button>
        )}
        <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
          <Trash2 size={16} strokeWidth={1.75} />
          Supprimer
        </Button>
      </div>

      {devis.status === "accepte" && !chantierPromptDismissed && (
        <Card accent={false} className="nova-ai-zone">
          <p className="nova-ai-content">Ce devis est accepté. Souhaitez-vous créer le chantier correspondant ?</p>
          <div className="nova-status-actions">
            <Link
              href={`/dashboard/chantiers/nouveau?name=${encodeURIComponent(devis.label)}${
                devis.client ? `&clientId=${devis.client.id}` : ""
              }`}
              className="nova-btn nova-btn-primary"
            >
              <Building2 size={16} strokeWidth={1.75} />
              Créer le chantier
            </Link>
            <Button variant="ghost" onClick={() => setChantierPromptDismissed(true)}>
              Plus tard
            </Button>
          </div>
        </Card>
      )}

      {(generatingRelance || relanceMessage) && (
        <Card accent={false} className="nova-ai-zone">
          <div className="nova-ai-zone-header">
            <Badge tone="teal">Message de relance</Badge>
          </div>
          {generatingRelance ? (
            <div className="nova-ai-loading">
              <p className="nova-ai-loading-label">Nova rédige un message de relance...</p>
              <Skeleton style={{ height: 80 }} />
            </div>
          ) : (
            <p className="nova-ai-content">{relanceMessage}</p>
          )}
        </Card>
      )}

      {devis.description && (
        <Card>
          <CardTitle>Description de la prestation</CardTitle>
          <p className="nova-card-text">{devis.description}</p>
        </Card>
      )}

      <section>
        <div className="nova-section-header-row">
          <h2 className="nova-section-title">Lignes du devis</h2>
          <Button variant="secondary" onClick={openAddLine}>
            <Plus size={16} strokeWidth={1.75} />
            Ajouter une ligne
          </Button>
        </div>
        <Table
          columns={lineColumns}
          rows={devis.lines}
          emptyLabel="Aucune ligne pour le moment — ajoutez la première ligne du devis."
        />

        {devis.lines.length > 0 && (
          <div className="nova-devis-totals">
            <div className="nova-devis-totals-row">
              <span>Sous-total HT</span>
              <span>{totals.sousTotalHT.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
            </div>
            {remisePct > 0 && (
              <div className="nova-devis-totals-row">
                <span>Remise ({remisePct}%)</span>
                <span>− {totals.remiseMontant.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
              </div>
            )}
            <div className="nova-devis-totals-row">
              <span>Total HT</span>
              <span>{totals.totalHT.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
            </div>
            <div className="nova-devis-totals-row">
              <span>TVA</span>
              <span>{totals.totalTVA.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
            </div>
            <div className="nova-devis-totals-row nova-devis-totals-ttc">
              <span>Total TTC</span>
              <span>{totals.totalTTC.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
            </div>
          </div>
        )}
      </section>

      <Card>
        <CardTitle>Remise et notes</CardTitle>
        <Field
          label="Remise (%)"
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={remiseInput}
          onChange={(e) => setRemiseInput(e.target.value)}
        />
        <TextareaField
          label="Notes du devis"
          rows={3}
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          placeholder="Conditions, délais, remarques..."
          hint="Affiché sur le devis transmis au client."
        />
        <Button variant="secondary" disabled={savingSettings} onClick={handleSaveSettings}>
          {savingSettings ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </Card>

      {devis.content && (
        <Card>
          <CardTitle>Description générée (IA)</CardTitle>
          <div className="nova-ai-zone-header">
            <span className="nova-timestamp">
              Créé le <Timestamp date={devis.createdAt} />
            </span>
          </div>
          <p className="nova-card-text">{devis.content}</p>
        </Card>
      )}

      <ConfirmModal
        open={confirmingDelete}
        itemLabel={`le devis « ${devis.label} »`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
        confirming={deleting}
      />

      <EditModal
        open={lineForm !== null}
        title={editingLineId ? "Modifier la ligne" : "Ajouter une ligne"}
        onCancel={closeLineModal}
        onSave={confirmLineSave}
        saving={savingLine}
      >
        {lineForm && (
          <>
            <SelectField
              label="Type"
              value={lineForm.type}
              onChange={(e) => setLineForm({ ...lineForm, type: e.target.value as DevisLineType })}
            >
              {(Object.keys(LINE_TYPE_LABEL) as DevisLineType[]).map((t) => (
                <option key={t} value={t}>
                  {LINE_TYPE_LABEL[t]}
                </option>
              ))}
            </SelectField>
            <Field
              label="Description"
              required
              value={lineForm.description}
              onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
              placeholder="Pose de carrelage salle de bain"
            />
            <Field
              label="Quantité"
              type="number"
              min="0"
              step="0.01"
              value={lineForm.quantite}
              onChange={(e) => setLineForm({ ...lineForm, quantite: e.target.value })}
            />
            <Field
              label="Unité"
              value={lineForm.unite}
              onChange={(e) => setLineForm({ ...lineForm, unite: e.target.value })}
              placeholder="h, m², forfait..."
            />
            <Field
              label="Prix unitaire HT (€)"
              type="number"
              min="0"
              step="0.01"
              value={lineForm.prixUnitaire}
              onChange={(e) => setLineForm({ ...lineForm, prixUnitaire: e.target.value })}
            />
            <Field
              label="TVA (%)"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={lineForm.tva}
              onChange={(e) => setLineForm({ ...lineForm, tva: e.target.value })}
            />
          </>
        )}
      </EditModal>

      <ConfirmModal
        open={deleteLineTarget !== null}
        itemLabel={deleteLineTarget ? `la ligne « ${deleteLineTarget.description} »` : ""}
        onConfirm={confirmDeleteLine}
        onCancel={() => setDeleteLineTarget(null)}
        confirming={deletingLine}
      />
    </div>
  );
}
