"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { Badge, EmptyState, Table, TableSkeleton, Timestamp, type TableColumn } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type AttestationRow = {
  id: string;
  adresseTravaux: string;
  signedAt: string | null;
  createdAt: string;
  client: { id: string; name: string } | null;
  devis: { id: string; label: string } | null;
};

export default function AttestationsPage() {
  const [attestations, setAttestations] = useState<AttestationRow[] | null>(null);

  useEffect(() => {
    fetchWithAuth("/api/attestations")
      .then((res) => res.json())
      .then((data) => setAttestations(data.attestations ?? []));
  }, []);

  const columns: TableColumn<AttestationRow>[] = [
    { key: "client", label: "Client", render: (a) => a.client?.name || "—" },
    { key: "adresse", label: "Adresse des travaux", render: (a) => a.adresseTravaux },
    {
      key: "createdAt",
      label: "Date",
      render: (a) => <Timestamp date={a.createdAt} />,
      sortable: true,
      sortValue: (a) => new Date(a.createdAt).getTime(),
    },
    {
      key: "statut",
      label: "Statut",
      render: (a) => (a.signedAt ? <Badge tone="success">Signée</Badge> : <Badge tone="amber">En attente de signature</Badge>),
    },
  ];

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Attestations TVA</h1>
          <p className="nova-page-subtitle">
            {attestations === null ? "…" : `${attestations.length} attestation${attestations.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="nova-header-actions">
          <Link href="/dashboard/attestations/nouveau" className="nova-btn nova-btn-primary">
            <FileCheck2 size={16} strokeWidth={1.75} />
            Nouvelle attestation
          </Link>
        </div>
      </header>

      {attestations === null ? (
        <TableSkeleton columns={4} />
      ) : attestations.length === 0 ? (
        <EmptyState
          icon="attestations"
          title="Aucune attestation pour l'instant"
          description="Créez une attestation de TVA à taux réduit lorsqu'un devis applique un taux de 10% — elle doit être signée par le client avant facturation."
          actionLabel="Nouvelle attestation"
          actionHref="/dashboard/attestations/nouveau"
        />
      ) : (
        <Table
          columns={columns}
          rows={attestations}
          getRowHref={(a) => `/dashboard/attestations/${a.id}/imprimer`}
          emptyLabel="Aucun résultat."
          pageSize={10}
        />
      )}
    </div>
  );
}
