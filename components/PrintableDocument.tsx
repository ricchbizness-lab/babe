"use client";

import { computeDevisTotals, lineTotalHT, type DevisLineLike } from "@/lib/devisTotals";
import { initialsFromName } from "@/components/ui";

const CONDITIONS_VALIDITE = "Devis valable 30 jours à compter de sa date d'émission.";
const MODALITES_DEFAUT = "Paiement sous 30 jours";

export type PrintableLine = DevisLineLike & {
  id: string;
  description: string;
  unite?: string | null;
};

export type PrintableDocumentProps = {
  kind: "devis" | "facture";
  numero: string;
  date: string;
  business: {
    name: string;
    siret?: string | null;
    address?: string | null;
    logoBase64?: string | null;
    conditionsPaiement?: string | null;
  };
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  label: string;
  description?: string | null;
  lines: PrintableLine[];
  /** Utilisé quand il n'y a pas de lignes détaillées (devis en texte libre, ou montant global). */
  fallbackAmountHT?: number | null;
  remisePct?: number;
};

/**
 * Vue imprimable partagée entre le devis (/dashboard/devis/[id]) et la
 * facture (/dashboard/facturation/[id]) — même mise en page professionnelle,
 * seul le libellé ("DEVIS"/"FACTURE") et la source des lignes changent.
 */
export function PrintableDocument({
  kind,
  numero,
  date,
  business,
  client,
  label,
  description,
  lines,
  fallbackAmountHT,
  remisePct = 0,
}: PrintableDocumentProps) {
  const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const hasLines = lines.length > 0;
  const totals = hasLines
    ? computeDevisTotals(lines, remisePct)
    : fallbackAmountHT != null
      ? (() => {
          const totalTVA = fallbackAmountHT * 0.2;
          return { sousTotalHT: fallbackAmountHT, remiseMontant: 0, totalHT: fallbackAmountHT, totalTVA, totalTTC: fallbackAmountHT + totalTVA };
        })()
      : null;

  return (
    <div className="nova-invoice">
      <header className="nova-invoice-header">
        <div className="nova-invoice-identity">
          {business.logoBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoBase64} alt={business.name} className="nova-invoice-logo" />
          ) : (
            <div className="nova-invoice-logo nova-invoice-logo-fallback">{initialsFromName(business.name)}</div>
          )}
          <div>
            <div className="nova-invoice-business">{business.name}</div>
            {business.siret && <div className="nova-invoice-meta">SIRET : {business.siret}</div>}
            {business.address && <div className="nova-invoice-meta">{business.address}</div>}
          </div>
        </div>
        <div className="nova-invoice-number-block">
          <div className="nova-invoice-doc-title">{kind === "devis" ? "DEVIS" : "FACTURE"}</div>
          <div className="nova-invoice-number">{numero}</div>
          <div className="nova-invoice-meta">Date : {new Date(date).toLocaleDateString("fr-FR")}</div>
        </div>
      </header>

      {client && (
        <div className="nova-invoice-client nova-invoice-client-box">
          <div className="nova-invoice-meta">À l'attention de</div>
          <div className="nova-invoice-client-name">{client.name}</div>
          {client.address && <div>{client.address}</div>}
          {client.email && <div>{client.email}</div>}
          {client.phone && <div>{client.phone}</div>}
        </div>
      )}

      {hasLines ? (
        <table className="nova-table nova-invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ textAlign: "right" }}>Qté</th>
              <th>Unité</th>
              <th style={{ textAlign: "right" }}>Prix HT</th>
              <th style={{ textAlign: "right" }}>TVA %</th>
              <th style={{ textAlign: "right" }}>Total HT</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td>{l.description}</td>
                <td style={{ textAlign: "right" }}>{l.quantite.toLocaleString("fr-FR")}</td>
                <td>{l.unite || "—"}</td>
                <td style={{ textAlign: "right" }}>{fmt(l.prixUnitaire)} €</td>
                <td style={{ textAlign: "right" }}>{l.tva}%</td>
                <td style={{ textAlign: "right" }}>{fmt(lineTotalHT(l))} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="nova-invoice-client-box">
          <div className="nova-invoice-meta">Description des prestations</div>
          <div className="nova-invoice-label">{label}</div>
          {description && <p className="nova-card-text">{description}</p>}
        </div>
      )}

      {totals && (
        <div className="nova-invoice-totals-block">
          <div className="nova-invoice-totals-row">
            <span>Sous-total HT</span>
            <span>{fmt(totals.sousTotalHT)} €</span>
          </div>
          {remisePct > 0 && (
            <div className="nova-invoice-totals-row">
              <span>Remise ({remisePct}%)</span>
              <span>− {fmt(totals.remiseMontant)} €</span>
            </div>
          )}
          <div className="nova-invoice-totals-row">
            <span>TVA</span>
            <span>{fmt(totals.totalTVA)} €</span>
          </div>
          <div className="nova-invoice-totals-row nova-invoice-totals-ttc">
            <span>Total TTC</span>
            <span>{fmt(totals.totalTTC)} €</span>
          </div>
        </div>
      )}

      <div className="nova-invoice-closing">
        <footer className="nova-invoice-footer">
          <p>{CONDITIONS_VALIDITE}</p>
          <p>Modalités de paiement : {business.conditionsPaiement || MODALITES_DEFAUT}</p>
        </footer>

        <div className="nova-invoice-signatures">
          <div className="nova-invoice-signature-box">
            <div className="nova-invoice-meta">Bon pour accord — signature du client</div>
          </div>
          <div className="nova-invoice-signature-box">
            <div className="nova-invoice-meta">Signature de l'entreprise</div>
          </div>
        </div>
      </div>
    </div>
  );
}
