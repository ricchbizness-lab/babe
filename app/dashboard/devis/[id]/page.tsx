"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Trash2 } from "lucide-react";
import { BackLink, Badge, Card, CardTitle, Button, ConfirmModal, Timestamp } from "@/components/ui";

type DevisDetail = {
  id: string;
  label: string;
  description: string | null;
  amount: number | null;
  status: string;
  content: string;
  createdAt: string;
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
  const [devis, setDevis] = useState<DevisDetail | null>(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    const res = await fetch(`/api/devis/${devis.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(false);
    if (res.ok) {
      const data = await res.json();
      setDevis(data.devis);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    const res = await fetch(`/api/devis/${params.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      router.push("/dashboard/devis");
      return;
    }
    setConfirmingDelete(false);
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
      <BackLink href="/dashboard/devis" label="Retour aux devis" />

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
        <Badge tone={STATUS_TONE[devis.status] || "neutral"}>{STATUS_LABEL[devis.status] || devis.status}</Badge>
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
        <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
          <Trash2 size={16} strokeWidth={1.75} />
          Supprimer
        </Button>
      </div>

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
