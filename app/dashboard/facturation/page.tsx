"use client";

import { useEffect, useState } from "react";
import { Badge, EmptyState, Table, TableSkeleton, Timestamp, type TableColumn } from "@/components/ui";
import { invoiceNumber, sortByAcceptedDate } from "@/lib/facturation";

type DevisRow = {
  id: string;
  label: string;
  amount: number | null;
  status: string;
  paymentStatus: string;
  updatedAt: string;
  client: { id: string; name: string } | null;
};

type InvoiceRow = DevisRow & { numero: string };

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  en_attente: "En attente",
  payee: "Payée",
  en_retard: "En retard",
};
const PAYMENT_STATUS_TONE: Record<string, "amber" | "success" | "danger"> = {
  en_attente: "amber",
  payee: "success",
  en_retard: "danger",
};
const PAYMENT_STATUS_ORDER: Record<string, number> = {
  en_attente: 0,
  en_retard: 1,
  payee: 2,
};

export default function FacturationPage() {
  const [devis, setDevis] = useState<DevisRow[] | null>(null);

  useEffect(() => {
    fetch("/api/devis")
      .then((res) => res.json())
      .then((data) => setDevis(data.devis ?? []));
  }, []);

  const accepted = devis === null ? null : devis.filter((d) => d.status === "accepte");
  const chronological = accepted ? sortByAcceptedDate(accepted) : [];
  const invoices: InvoiceRow[] = chronological.map((d, i) => ({ ...d, numero: invoiceNumber(i, d.updatedAt) }));
  const displayRows = [...invoices].reverse(); // plus récente en premier

  const columns: TableColumn<InvoiceRow>[] = [
    { key: "numero", label: "Facture", render: (d) => <span className="nova-timestamp">{d.numero}</span> },
    { key: "client", label: "Client", render: (d) => d.client?.name || "—" },
    {
      key: "amount",
      label: "Montant",
      align: "right",
      render: (d) => (d.amount != null ? `${d.amount.toLocaleString("fr-FR")} €` : "—"),
      sortable: true,
      sortValue: (d) => d.amount,
    },
    {
      key: "paymentStatus",
      label: "Statut paiement",
      render: (d) => (
        <Badge tone={PAYMENT_STATUS_TONE[d.paymentStatus] || "amber"}>
          {PAYMENT_STATUS_LABEL[d.paymentStatus] || d.paymentStatus}
        </Badge>
      ),
      sortable: true,
      sortValue: (d) => PAYMENT_STATUS_ORDER[d.paymentStatus] ?? 99,
    },
    {
      key: "updatedAt",
      label: "Acceptée le",
      render: (d) => <Timestamp date={d.updatedAt} />,
      sortable: true,
      sortValue: (d) => new Date(d.updatedAt).getTime(),
    },
  ];

  return (
    <div className="nova-page">
      <header className="nova-page-header">
        <h1>Facturation</h1>
        <p className="nova-page-subtitle">
          {accepted === null ? "…" : `${accepted.length} facture${accepted.length > 1 ? "s" : ""}`}
        </p>
      </header>

      {accepted === null ? (
        <TableSkeleton columns={5} />
      ) : accepted.length === 0 ? (
        <EmptyState
          icon="devis"
          title="Aucune facture pour l'instant"
          description="Un devis devient une facture dès qu'il passe au statut « accepté »."
          actionLabel="Voir les devis"
          actionHref="/dashboard/devis"
        />
      ) : (
        <Table columns={columns} rows={displayRows} getRowHref={(d) => `/dashboard/facturation/${d.id}`} />
      )}
    </div>
  );
}
