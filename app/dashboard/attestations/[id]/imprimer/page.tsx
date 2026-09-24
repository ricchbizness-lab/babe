"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Printer } from "lucide-react";
import { Badge, BackLink, Breadcrumb, Button, useToast } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { TYPE_LOGEMENT_LABEL, USAGE_LOGEMENT_LABEL } from "@/lib/attestationTva";

type AttestationDetail = {
  id: string;
  adresseTravaux: string;
  dateConstruction: string;
  typeLogement: string;
  usageLogement: string;
  signedAt: string | null;
  createdAt: string;
  client: { id: string; name: string; address: string | null } | null;
  devis: { id: string; label: string } | null;
  business: { name: string; siret: string | null; address: string | null; logoBase64: string | null };
};

export default function AttestationImprimerPage({ params }: { params: { id: string } }) {
  const toast = useToast();
  const [attestation, setAttestation] = useState<AttestationDetail | null>(null);
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    fetchWithAuth(`/api/attestations/${params.id}`).then(async (res) => {
      if (!res.ok) {
        setError("Attestation introuvable.");
        return;
      }
      const data = await res.json();
      setAttestation(data.attestation);
    });
  }, [params.id]);

  async function handleToggleSigned() {
    if (!attestation) return;
    setSigning(true);
    try {
      const res = await fetchWithAuth(`/api/attestations/${attestation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signed: !attestation.signedAt }),
      });
      if (!res.ok) {
        toast.error("Impossible de mettre à jour l'attestation.");
        return;
      }
      const data = await res.json();
      setAttestation((prev) => (prev ? { ...prev, signedAt: data.attestation.signedAt } : prev));
      toast.success(data.attestation.signedAt ? "Attestation marquée comme signée" : "Attestation marquée comme non signée");
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSigning(false);
    }
  }

  if (error) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/attestations" label="Retour aux attestations" />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!attestation) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/attestations" label="Retour aux attestations" />
        <p className="nova-page-subtitle">Chargement...</p>
      </div>
    );
  }

  const dateAttestation = new Date(attestation.createdAt).toLocaleDateString("fr-FR");

  return (
    <div className="nova-page">
      <div className="nova-no-print">
        <Breadcrumb items={[{ label: "Attestations TVA", href: "/dashboard/attestations" }, { label: "Attestation" }]} />
      </div>

      <div className="nova-invoice-actions nova-no-print">
        {attestation.devis && (
          <Link href={`/dashboard/devis/${attestation.devis.id}`} className="nova-btn nova-btn-secondary">
            <ArrowLeft size={16} strokeWidth={1.75} />
            Retour au devis
          </Link>
        )}
        <Button onClick={() => window.print()}>
          <Printer size={16} strokeWidth={1.75} />
          Imprimer / Télécharger PDF
        </Button>
        <Button variant={attestation.signedAt ? "secondary" : "success"} onClick={handleToggleSigned} disabled={signing}>
          <CheckCircle2 size={16} strokeWidth={1.75} />
          {signing ? "..." : attestation.signedAt ? "Marquer comme non signée" : "Marquer comme signée"}
        </Button>
        {attestation.signedAt ? <Badge tone="success">Signée</Badge> : <Badge tone="amber">En attente de signature</Badge>}
      </div>

      <div className="nova-invoice">
        <header className="nova-invoice-header">
          <div className="nova-invoice-identity">
            <div>
              <div className="nova-invoice-business">{attestation.business.name}</div>
              {attestation.business.siret && <div className="nova-invoice-meta">SIRET : {attestation.business.siret}</div>}
              {attestation.business.address && <div className="nova-invoice-meta">{attestation.business.address}</div>}
            </div>
          </div>
          <div className="nova-invoice-number-block">
            <div className="nova-invoice-doc-title">ATTESTATION SIMPLIFIÉE</div>
            <div className="nova-invoice-meta">TVA à taux réduit — art. 279-0 bis du CGI</div>
            <div className="nova-invoice-meta">Date : {dateAttestation}</div>
          </div>
        </header>

        {attestation.client && (
          <div className="nova-invoice-client nova-invoice-client-box">
            <div className="nova-invoice-meta">Client</div>
            <div className="nova-invoice-client-name">{attestation.client.name}</div>
            {attestation.client.address && <div>{attestation.client.address}</div>}
          </div>
        )}

        <div className="nova-invoice-client-box">
          <div className="nova-invoice-meta">Logement concerné par les travaux</div>
          <p className="nova-card-text">{attestation.adresseTravaux}</p>
          <p className="nova-card-text">
            Type de logement : {TYPE_LOGEMENT_LABEL[attestation.typeLogement] || attestation.typeLogement}
            <br />
            Usage du logement : {USAGE_LOGEMENT_LABEL[attestation.usageLogement] || attestation.usageLogement}
            <br />
            Date de construction : {attestation.dateConstruction}
          </p>
        </div>

        <div className="nova-invoice-client-box">
          <div className="nova-invoice-meta">Déclaration du client</div>
          <p className="nova-card-text" style={{ whiteSpace: "pre-wrap" }}>
            {`Je soussigné(e), ${attestation.client?.name || "le client"}, atteste sur l'honneur que :

- le logement désigné ci-dessus est achevé depuis plus de deux ans,
- il est affecté ou destiné, après réalisation des travaux, à un usage d'habitation,
- les travaux réalisés n'ont pas pour effet d'augmenter la surface de plancher des locaux existants de plus de 10 % au cours des deux dernières années.

Je reconnais avoir été informé(e) que le taux réduit de TVA de 10 % applicable à ces travaux est susceptible d'entraîner à ma charge le paiement du complément de taxe si les mentions ci-dessus s'avèrent inexactes.`}
          </p>
          {attestation.devis && <p className="nova-invoice-meta">Devis concerné : {attestation.devis.label}</p>}
        </div>

        <div className="nova-invoice-closing">
          <div className="nova-invoice-signatures">
            <div className="nova-invoice-signature-box">
              <div className="nova-invoice-meta">
                Date et signature du client{attestation.signedAt ? ` — signée le ${new Date(attestation.signedAt).toLocaleDateString("fr-FR")}` : ""}
              </div>
            </div>
            <div className="nova-invoice-signature-box">
              <div className="nova-invoice-meta">Signature de l'entreprise</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
