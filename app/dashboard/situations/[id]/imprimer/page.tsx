"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { BackLink, Breadcrumb, Button, Card } from "@/components/ui";
import { PrintableDocument } from "@/components/PrintableDocument";
import { invoiceNumber, sortByAcceptedDate } from "@/lib/facturation";
import { fetchWithAuth } from "@/lib/fetchClient";

type SituationDetail = {
  id: string;
  numero: number;
  pourcentageAvancement: number;
  montantHT: number;
  statut: string;
  createdAt: string;
  devis: {
    id: string;
    label: string;
    updatedAt: string;
    client: { id: string; name: string; email: string | null; phone: string | null; address: string | null } | null;
  };
};

type Business = {
  name: string;
  siret: string | null;
  address: string | null;
  logoBase64: string | null;
  conditionsPaiement: string | null;
};

export default function SituationImprimerPage({ params }: { params: { id: string } }) {
  const [situation, setSituation] = useState<SituationDetail | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [numero, setNumero] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchWithAuth(`/api/situations/${params.id}`), fetchWithAuth("/api/devis"), fetchWithAuth("/api/business")]).then(
      async ([situationRes, listRes, businessRes]) => {
        if (!situationRes.ok) {
          setError("Situation introuvable.");
          return;
        }
        const situationData = await situationRes.json();
        const listData = await listRes.json();
        const businessData = await businessRes.json();

        const accepted = (listData.devis ?? []).filter((d: { status: string }) => d.status === "accepte");
        const chronological = sortByAcceptedDate(accepted);
        const index = chronological.findIndex((d: { id: string }) => d.id === situationData.situation.devis.id);
        const devisNumero = invoiceNumber(index === -1 ? 0 : index, situationData.situation.devis.updatedAt);

        setSituation(situationData.situation);
        setBusiness(businessData.business);
        setNumero(`${devisNumero}-S${situationData.situation.numero}`);
      }
    );
  }, [params.id]);

  if (error) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/devis" label="Retour aux devis" />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!situation || !business || !numero) {
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
      <div className="nova-no-print">
        <Breadcrumb
          items={[
            { label: "Devis", href: "/dashboard/devis" },
            { label: situation.devis.label, href: `/dashboard/devis/${situation.devis.id}` },
            { label: `Situation n°${situation.numero}` },
          ]}
        />
      </div>

      <div className="nova-invoice-actions nova-no-print">
        <Button onClick={() => window.print()}>
          <Printer size={16} strokeWidth={1.75} />
          Imprimer / Télécharger PDF
        </Button>
      </div>

      <PrintableDocument
        kind="facture"
        numero={numero}
        date={situation.createdAt}
        business={business}
        client={situation.devis.client}
        label={`${situation.devis.label} — situation n°${situation.numero} (${situation.pourcentageAvancement}% d'avancement)`}
        description={null}
        lines={[]}
        fallbackAmountHT={situation.montantHT}
      />
    </div>
  );
}
