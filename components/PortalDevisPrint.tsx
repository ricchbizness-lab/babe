"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { PrintableDocument, type PrintableLine } from "@/components/PrintableDocument";
import { devisReference } from "@/lib/facturation";

type Props = {
  token: string;
  devis: {
    id: string;
    label: string;
    description: string | null;
    amount: number | null;
    remise: number | null;
    createdAt: string;
    updatedAt: string;
    lines: PrintableLine[];
    client: { name: string; email: string | null; phone: string | null; address: string | null } | null;
  };
  business: {
    name: string;
    siret: string | null;
    address: string | null;
    logoBase64: string | null;
    conditionsPaiement: string | null;
  };
};

export function PortalDevisPrint({ token, devis, business }: Props) {
  // Numérotation calculée sur ce seul devis (pas d'accès public à la liste
  // complète de l'entreprise) — cohérente en soi mais pas garantie
  // identique à la référence vue côté dashboard.
  const numero = devisReference([devis], devis.id);

  return (
    <div className="nova-portal-print-page">
      <div className="nova-no-print nova-portal-print-actions">
        <Link href={`/portail/${token}`} className="nova-back-link">
          ← Retour au suivi de chantier
        </Link>
        <Button onClick={() => window.print()}>
          <Printer size={16} strokeWidth={1.75} />
          Télécharger en PDF
        </Button>
      </div>
      <PrintableDocument
        kind="devis"
        numero={numero}
        date={devis.updatedAt}
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
