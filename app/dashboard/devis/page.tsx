"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, EmptyState, MetricBar, RelanceIndicator, SearchInput, Table, TableSkeleton, Timestamp, type TableColumn } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { downloadCSV, generateCSV } from "@/lib/csv";
import { Download } from "lucide-react";

type DevisRow = {
  id: string;
  label: string;
  status: string;
  paymentStatus: string;
  amount: number | null;
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
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  en_attente: "En attente",
  payee: "Payée",
  en_retard: "En retard",
};
const STATUS_TONE: Record<string, "neutral" | "teal" | "blue" | "success" | "danger"> = {
  brouillon: "neutral",
  envoye: "blue",
  accepte: "success",
  refuse: "danger",
};
const STATUS_ORDER: Record<string, number> = {
  brouillon: 0,
  envoye: 1,
  accepte: 2,
  refuse: 3,
};

export default function DevisPage() {
  const [devis, setDevis] = useState<DevisRow[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchWithAuth("/api/devis")
      .then((res) => res.json())
      .then((data) => setDevis(data.devis ?? []));
  }, []);

  const filtered = (devis ?? []).filter((d) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return d.label.toLowerCase().includes(q) || (d.client?.name || "").toLowerCase().includes(q);
  });

  function handleExport() {
    const csv = generateCSV(
      ["Devis", "Client", "Montant", "Statut", "Statut paiement", "Date"],
      filtered.map((d) => [
        d.label,
        d.client?.name || "",
        d.amount != null ? d.amount : "",
        STATUS_LABEL[d.status] || d.status,
        PAYMENT_STATUS_LABEL[d.paymentStatus] || d.paymentStatus,
        new Date(d.createdAt).toLocaleDateString("fr-FR"),
      ])
    );
    downloadCSV("devis.csv", csv);
  }

  const montantTotal = (devis ?? []).reduce((sum, d) => sum + (d.amount || 0), 0);
  const enAttenteMontant = (devis ?? [])
    .filter((d) => d.status === "envoye")
    .reduce((sum, d) => sum + (d.amount || 0), 0);
  const tauxConversion =
    devis && devis.length > 0
      ? Math.round((devis.filter((d) => d.status === "accepte").length / devis.length) * 100)
      : 0;

  const columns: TableColumn<DevisRow>[] = [
    { key: "label", label: "Devis", emphasis: "title" },
    { key: "client", label: "Client", render: (d) => d.client?.name || "—" },
    {
      key: "status",
      label: "Statut",
      render: (d) => <Badge tone={STATUS_TONE[d.status] || "neutral"}>{STATUS_LABEL[d.status] || d.status}</Badge>,
      sortable: true,
      sortValue: (d) => STATUS_ORDER[d.status] ?? 99,
    },
    {
      key: "amount",
      label: "Montant",
      align: "right",
      render: (d) => (d.amount != null ? `${d.amount.toLocaleString("fr-FR")} €` : "—"),
      sortable: true,
      sortValue: (d) => d.amount,
      emphasis: "amount",
    },
    {
      key: "createdAt",
      label: "Créé le",
      render: (d) => <Timestamp date={d.createdAt} />,
      sortable: true,
      sortValue: (d) => new Date(d.createdAt).getTime(),
    },
    {
      key: "relance",
      label: "Relance",
      render: (d) => <RelanceIndicator status={d.status} updatedAt={d.updatedAt} />,
    },
  ];

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Devis</h1>
          <p className="nova-page-subtitle">
            {devis === null ? "…" : `${devis.length} devis`}
          </p>
        </div>
        <div className="nova-header-actions">
          {devis !== null && devis.length > 0 && (
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} strokeWidth={1.75} />
              Exporter CSV
            </Button>
          )}
          <Link href="/dashboard/devis/nouveau" className="nova-btn nova-btn-primary">
            Nouveau devis
          </Link>
        </div>
      </header>

      {devis !== null && devis.length > 0 && (
        <MetricBar
          items={[
            { label: "Total devis", value: devis.length },
            { label: "Montant total", value: `${montantTotal.toLocaleString("fr-FR")} €` },
            { label: "En attente de réponse", value: `${enAttenteMontant.toLocaleString("fr-FR")} €` },
            { label: "Taux de conversion", value: `${tauxConversion}%` },
          ]}
        />
      )}

      <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un devis..." />

      {devis === null ? (
        <TableSkeleton columns={6} />
      ) : devis.length === 0 ? (
        <EmptyState
          icon="devis"
          title="Aucun devis pour l'instant — créez votre premier devis"
          description="Nova peut générer le contenu à votre place à partir de quelques informations."
          actionLabel="Créer un devis"
          actionHref="/dashboard/devis/nouveau"
        />
      ) : (
        <Table
          columns={columns}
          rows={filtered}
          getRowHref={(d) => `/dashboard/devis/${d.id}`}
          emptyLabel="Aucun résultat pour cette recherche."
          pageSize={10}
        />
      )}
    </div>
  );
}
