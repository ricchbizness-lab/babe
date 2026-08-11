"use client";

import { useEffect, useState } from "react";
import { BackLink, Badge, Card, CardTitle, Table, TableSkeleton, Timestamp, type TableColumn } from "@/components/ui";

type ClientDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  projects: { id: string; name: string; status: string; createdAt: string }[];
  devis: { id: string; label: string; status: string; amount: number | null; createdAt: string }[];
};

const PROJECT_STATUS_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};
const PROJECT_STATUS_TONE: Record<string, "neutral" | "teal" | "success" | "danger"> = {
  planifie: "neutral",
  en_cours: "teal",
  termine: "success",
  annule: "danger",
};
const DEVIS_STATUS_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
};
const DEVIS_STATUS_TONE: Record<string, "neutral" | "teal" | "success" | "danger"> = {
  brouillon: "neutral",
  envoye: "teal",
  accepte: "success",
  refuse: "danger",
};

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/clients/${params.id}`).then(async (res) => {
      if (!res.ok) {
        setError("Client introuvable.");
        return;
      }
      const data = await res.json();
      setClient(data.client);
    });
  }, [params.id]);

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
      <BackLink href="/dashboard/clients" label="Retour aux clients" />

      <header className="nova-page-header">
        <h1>{client.name}</h1>
        <p className="nova-page-subtitle">
          Client depuis le {new Date(client.createdAt).toLocaleDateString("fr-FR")}
        </p>
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
    </div>
  );
}
