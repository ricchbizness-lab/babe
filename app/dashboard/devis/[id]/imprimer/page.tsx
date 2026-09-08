"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { BackLink, Breadcrumb, Button, Card } from "@/components/ui";
import { PrintableDocument } from "@/components/PrintableDocument";
import { devisReference } from "@/lib/facturation";
import { fetchWithAuth } from "@/lib/fetchClient";

type DevisLine = { id: string; description: string; quantite: number; unite: string | null; prixUnitaire: number; tva: number };

type DevisDetail = {
  id: string;
  label: string;
  description: string | null;
  amount: number | null;
  remise: number | null;
  createdAt: string;
  client: { id: string; name: string; email: string | null; phone: string | null; address: string | null } | null;
  lines: DevisLine[];
};

type Business = {
  name: string;
  siret: string | null;
  address: string | null;
  logoBase64: string | null;
  conditionsPaiement: string | null;
};

export default function DevisImprimerPage({ params }: { params: { id: string } }) {
  const [devis, setDevis] = useState<DevisDetail | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchWithAuth(`/api/devis/${params.id}`), fetchWithAuth("/api/devis"), fetchWithAuth("/api/business")]).then(
      async ([devisRes, listRes, businessRes]) => {
        if (!devisRes.ok) {
          setError("Devis introuvable.");
          return;
        }
        const devisData = await devisRes.json();
        const listData = await listRes.json();
        const businessData = await businessRes.json();

        setDevis(devisData.devis);
        setBusiness(businessData.business);
        setReference(devisReference(listData.devis ?? [], params.id));
      }
    );
  }, [params.id]);

  if (error) {
    return (
      <div className="nova-page">
        <BackLink href={`/dashboard/devis/${params.id}`} label="Retour au devis" />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!devis || !business || !reference) {
    return (
      <div className="nova-page">
        <BackLink href={`/dashboard/devis/${params.id}`} label="Retour au devis" />
        <Card>
          <p className="nova-page-subtitle">Chargement...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="nova-page">
      <div className="nova-no-print">
        <Breadcrumb items={[{ label: "Devis", href: "/dashboard/devis" }, { label: devis.label, href: `/dashboard/devis/${devis.id}` }, { label: "Impression" }]} />
      </div>

      <div className="nova-invoice-actions nova-no-print">
        <Button onClick={() => window.print()}>
          <Printer size={16} strokeWidth={1.75} />
          Imprimer / Télécharger PDF
        </Button>
      </div>

      <PrintableDocument
        kind="devis"
        numero={reference}
        date={devis.createdAt}
        business={business}
        client={devis.client}
        label={devis.label}
        description={devis.description}
        lines={devis.lines}
        fallbackAmountHT={devis.amount}
        remisePct={devis.remise || 0}
      />
    </div>
  );
}
