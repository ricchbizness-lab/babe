"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, MessageCircle, Trash2 } from "lucide-react";
import { BackLink, Badge, Breadcrumb, Card, CardTitle, Button, ConfirmModal, RelanceIndicator, Skeleton, Timestamp, useToast } from "@/components/ui";
import { daysSinceSent } from "@/lib/relance";

type DevisDetail = {
  id: string;
  label: string;
  description: string | null;
  amount: number | null;
  status: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string } | null;
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

export default function DevisDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [devis, setDevis] = useState<DevisDetail | null>(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [relanceMessage, setRelanceMessage] = useState<string | null>(null);
  const [generatingRelance, setGeneratingRelance] = useState(false);

  useEffect(() => {
    fetch(`/api/devis/${params.id}`).then(async (res) => {
      if (!res.ok) {
        setError("Devis introuvable.");
        return;
      }
      const data = await res.json();
      setDevis(data.devis);
    });
  }, [params.id]);

  async function handleStatusChange(status: string) {
    if (!devis) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/devis/${devis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setDevis(data.devis);
        toast.success(`Devis marqué comme ${STATUS_LABEL[status]?.toLowerCase() || status}`);
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

  async function handleRelance() {
    if (!devis) return;
    setGeneratingRelance(true);
    setRelanceMessage(null);
    try {
      const res = await fetch("/api/agent", {
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
      const res = await fetch(`/api/devis/${params.id}`, { method: "DELETE" });
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
        <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
          <Trash2 size={16} strokeWidth={1.75} />
          Supprimer
        </Button>
      </div>

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

      <Card accent={false} className="nova-ai-zone">
        <div className="nova-ai-zone-header">
          <span className="nova-page-subtitle">Contenu du devis</span>
          <span className="nova-timestamp">
            Créé le <Timestamp date={devis.createdAt} />
          </span>
        </div>
        <p className="nova-ai-content">{devis.content || "Aucun contenu rédigé."}</p>
      </Card>

      <ConfirmModal
        open={confirmingDelete}
        itemLabel={`le devis « ${devis.label} »`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
        confirming={deleting}
      />
    </div>
  );
}
