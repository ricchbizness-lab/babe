"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Badge, BackLink, Breadcrumb, Button, Card, useToast } from "@/components/ui";
import { computeInvoiceAmounts, invoiceNumber, sortByAcceptedDate } from "@/lib/facturation";

type DevisDetail = {
  id: string;
  label: string;
  description: string | null;
  amount: number | null;
  status: string;
  paymentStatus: string;
  updatedAt: string;
  client: { id: string; name: string; email: string | null; phone: string | null; address: string | null } | null;
};

type Business = {
  name: string;
  siret: string | null;
  conditionsPaiement: string | null;
};

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

export default function FactureDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [devis, setDevis] = useState<DevisDetail | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [numero, setNumero] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/devis/${params.id}`),
      fetch("/api/devis"),
      fetch("/api/business"),
    ]).then(async ([devisRes, listRes, businessRes]) => {
      if (!devisRes.ok) {
        setError("Devis introuvable.");
        return;
      }
      const devisData = await devisRes.json();
      const listData = await listRes.json();
      const businessData = await businessRes.json();

      const current: DevisDetail = devisData.devis;
      if (current.status !== "accepte") {
        setError("Ce devis n'est pas encore accepté — pas de facture tant que le statut n'est pas « accepté ».");
        return;
      }

      const accepted = (listData.devis ?? []).filter((d: DevisDetail) => d.status === "accepte");
      const chronological = sortByAcceptedDate(accepted);
      const index = chronological.findIndex((d) => d.id === current.id);

      setDevis(current);
      setBusiness(businessData.business);
      setNumero(invoiceNumber(index === -1 ? 0 : index, current.updatedAt));
    });
  }, [params.id]);

  async function handleMarkPaid() {
    setMarkingPaid(true);
    try {
      const res = await fetch(`/api/devis/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "payee" }),
      });
      if (!res.ok) {
        toast.error("Erreur lors de la mise à jour du statut de paiement.");
        return;
      }
      const data = await res.json();
      setDevis((prev) => (prev ? { ...prev, paymentStatus: data.devis.paymentStatus } : prev));
      toast.success("Facture marquée comme payée");
      router.refresh();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setMarkingPaid(false);
    }
  }

  if (error) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/facturation" label="Retour à la facturation" />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!devis || !business || !numero) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/facturation" label="Retour à la facturation" />
        <Card>
          <p className="nova-page-subtitle">Chargement...</p>
        </Card>
      </div>
    );
  }

  const amounts = computeInvoiceAmounts(devis.amount);
  const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="nova-page">
      <div className="nova-no-print">
        <Breadcrumb items={[{ label: "Facturation", href: "/dashboard/facturation" }, { label: numero }]} />
      </div>

      <div className="nova-invoice-actions nova-no-print">
        <Badge tone={PAYMENT_STATUS_TONE[devis.paymentStatus] || "amber"}>
          {PAYMENT_STATUS_LABEL[devis.paymentStatus] || devis.paymentStatus}
        </Badge>
        {devis.paymentStatus !== "payee" && (
          <Button variant="success" onClick={handleMarkPaid} disabled={markingPaid}>
            {markingPaid ? "Mise à jour..." : "Marquer comme payée"}
          </Button>
        )}
        <Button onClick={() => window.print()}>
          <Printer size={16} strokeWidth={1.75} />
          Imprimer / Télécharger PDF
        </Button>
      </div>

      <div className="nova-invoice">
        <header className="nova-invoice-header">
          <div>
            <div className="nova-invoice-business">{business.name}</div>
            {business.siret && <div className="nova-invoice-meta">SIRET : {business.siret}</div>}
          </div>
          <div className="nova-invoice-number-block">
            <div className="nova-invoice-number">{numero}</div>
            <div className="nova-invoice-meta">
              Date d'acceptation : {new Date(devis.updatedAt).toLocaleDateString("fr-FR")}
            </div>
          </div>
        </header>

        {devis.client && (
          <div className="nova-invoice-client">
            <div className="nova-invoice-meta">Facturé à</div>
            <div className="nova-invoice-client-name">{devis.client.name}</div>
            {devis.client.address && <div>{devis.client.address}</div>}
            {devis.client.email && <div>{devis.client.email}</div>}
            {devis.client.phone && <div>{devis.client.phone}</div>}
          </div>
        )}

        <table className="nova-table nova-invoice-table">
          <thead>
            <tr>
              <th>Prestation</th>
              <th style={{ textAlign: "right" }}>Montant HT</th>
              <th style={{ textAlign: "right" }}>TVA (20%)</th>
              <th style={{ textAlign: "right" }}>Montant TTC</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="nova-invoice-label">{devis.label}</div>
                {devis.description && <div className="nova-invoice-meta">{devis.description}</div>}
              </td>
              <td style={{ textAlign: "right" }}>{amounts ? `${fmt(amounts.ht)} €` : "—"}</td>
              <td style={{ textAlign: "right" }}>{amounts ? `${fmt(amounts.tva)} €` : "—"}</td>
              <td style={{ textAlign: "right" }}>
                <strong>{amounts ? `${fmt(amounts.ttc)} €` : "—"}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        <footer className="nova-invoice-footer">
          <p>{business.conditionsPaiement || "Paiement sous 30 jours"}</p>
        </footer>
      </div>
    </div>
  );
}
