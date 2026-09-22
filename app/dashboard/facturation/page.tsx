"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Download, FileCheck2, Send, X } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  FilterSelect,
  MetricBar,
  Table,
  TableSkeleton,
  Tabs,
  Timestamp,
  useToast,
  type TableColumn,
} from "@/components/ui";
import { computeInvoiceAmounts, invoiceNumber, sortByAcceptedDate } from "@/lib/facturation";
import { isPaiementEnRetard, joursRetardPaiement } from "@/lib/relance";
import { fetchWithAuth } from "@/lib/fetchClient";
import { downloadCSV, generateCSV } from "@/lib/csv";

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

const PAYMENT_TERMS_DAYS = 30;

function echeanceDate(d: DevisRow): Date {
  const d2 = new Date(d.updatedAt);
  d2.setDate(d2.getDate() + PAYMENT_TERMS_DAYS);
  return d2;
}

/**
 * Statut de paiement affiché, calculé plutôt que lu tel quel depuis
 * paymentStatus : ce champ vaut "en_retard" uniquement s'il a été
 * positionné à la main, aucun processus automatique ne le fait — sans ce
 * calcul, une facture réellement en retard restait affichée "En attente"
 * partout (onglet, badge, bouton Relancer, styles d'échéance).
 */
function displayPaymentStatus(d: DevisRow): "en_attente" | "payee" | "en_retard" {
  if (d.paymentStatus === "payee") return "payee";
  return isPaiementEnRetard(d.paymentStatus, d.updatedAt) ? "en_retard" : "en_attente";
}

type PeriodeFilter = "all" | "mois" | "trimestre" | "annee";

function matchesPeriode(dateStr: string, filter: PeriodeFilter): boolean {
  if (filter === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (filter === "mois") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (filter === "trimestre") {
    const quarterOf = (m: number) => Math.floor(m / 3);
    return quarterOf(d.getMonth()) === quarterOf(now.getMonth()) && d.getFullYear() === now.getFullYear();
  }
  return d.getFullYear() === now.getFullYear();
}

const TABS: { key: "toutes" | "en_attente" | "payees" | "en_retard"; label: string }[] = [
  { key: "toutes", label: "Toutes" },
  { key: "en_attente", label: "En attente" },
  { key: "payees", label: "Payées" },
  { key: "en_retard", label: "En retard" },
];

export default function FacturationPage() {
  const toast = useToast();
  const [devis, setDevis] = useState<DevisRow[] | null>(null);
  const [tab, setTab] = useState<"toutes" | "en_attente" | "payees" | "en_retard">("toutes");
  const [relanceTarget, setRelanceTarget] = useState<InvoiceRow | null>(null);
  const [relanceText, setRelanceText] = useState<string | null>(null);
  const [relanceLoading, setRelanceLoading] = useState(false);
  const [clientFilter, setClientFilter] = useState("all");
  const [periodeFilter, setPeriodeFilter] = useState<PeriodeFilter>("all");

  useEffect(() => {
    fetchWithAuth("/api/devis")
      .then((res) => res.json())
      .then((data) => setDevis(data.devis ?? []));
  }, []);

  const accepted = devis === null ? null : devis.filter((d) => d.status === "accepte");
  const chronological = accepted ? sortByAcceptedDate(accepted) : [];
  const invoices: InvoiceRow[] = chronological.map((d, i) => ({ ...d, numero: invoiceNumber(i, d.updatedAt) }));
  const displayRows = [...invoices].reverse(); // plus récente en premier

  const clientOptions = Array.from(
    new Map(displayRows.filter((d) => d.client).map((d) => [d.client!.id, d.client!.name])).entries()
  );

  const filteredRows = displayRows.filter((d) => {
    const status = displayPaymentStatus(d);
    const matchesTab =
      tab === "toutes" ||
      (tab === "en_attente" && status === "en_attente") ||
      (tab === "payees" && status === "payee") ||
      (tab === "en_retard" && status === "en_retard");
    const matchesClient = clientFilter === "all" || d.client?.id === clientFilter;
    const matchesPeriodeFilter = matchesPeriode(d.updatedAt, periodeFilter);
    return matchesTab && matchesClient && matchesPeriodeFilter;
  });

  const filtersActive = clientFilter !== "all" || periodeFilter !== "all";
  function resetFilters() {
    setClientFilter("all");
    setPeriodeFilter("all");
  }

  function handleExport() {
    const csv = generateCSV(
      ["Facture", "Client", "Montant HT", "TVA 20%", "TTC", "Statut paiement", "Échéance", "Date"],
      filteredRows.map((d) => {
        const amounts = computeInvoiceAmounts(d.amount);
        return [
          d.numero,
          d.client?.name || "",
          amounts ? amounts.ht : "",
          amounts ? amounts.tva.toFixed(2) : "",
          amounts ? amounts.ttc.toFixed(2) : "",
          PAYMENT_STATUS_LABEL[d.paymentStatus] || d.paymentStatus,
          d.paymentStatus === "payee" ? "" : echeanceDate(d).toLocaleDateString("fr-FR"),
          new Date(d.updatedAt).toLocaleDateString("fr-FR"),
        ];
      })
    );
    downloadCSV("facturation.csv", csv);
  }

  async function handleRelancer(d: InvoiceRow) {
    setRelanceTarget(d);
    setRelanceText(null);
    setRelanceLoading(true);
    try {
      const amounts = computeInvoiceAmounts(d.amount);
      const res = await fetchWithAuth("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "relance",
          input: {
            client: d.client?.name || "client",
            montant: amounts ? `${amounts.ttc.toLocaleString("fr-FR")} €` : "",
            echeance: echeanceDate(d).toLocaleDateString("fr-FR"),
            joursRetard: joursRetardPaiement(d.updatedAt),
          },
        }),
      });
      if (!res.ok) {
        toast.error("Erreur de génération IA — impossible de préparer la relance.");
        setRelanceTarget(null);
        return;
      }
      const data = await res.json();
      setRelanceText(data.result || "");
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
      setRelanceTarget(null);
    } finally {
      setRelanceLoading(false);
    }
  }

  async function handleCopyRelance() {
    if (!relanceText) return;
    await navigator.clipboard.writeText(relanceText);
    toast.success("Message copié !");
  }

  const now = new Date();
  const caEncaisseCeMois = invoices
    .filter(
      (d) =>
        d.paymentStatus === "payee" &&
        new Date(d.updatedAt).getMonth() === now.getMonth() &&
        new Date(d.updatedAt).getFullYear() === now.getFullYear()
    )
    .reduce((sum, d) => sum + (d.amount || 0), 0);
  const enAttenteMontant = invoices
    .filter((d) => displayPaymentStatus(d) === "en_attente")
    .reduce((sum, d) => sum + (d.amount || 0), 0);
  const enRetardMontant = invoices
    .filter((d) => displayPaymentStatus(d) === "en_retard")
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  const columns: TableColumn<InvoiceRow>[] = [
    {
      key: "numero",
      label: "Référence",
      render: (d) => <span className="nova-timestamp">{d.numero}</span>,
      emphasis: "title",
    },
    { key: "client", label: "Client", render: (d) => d.client?.name || "—" },
    {
      key: "ht",
      label: "Montant HT",
      align: "right",
      render: (d) => {
        const amounts = computeInvoiceAmounts(d.amount);
        return amounts ? `${amounts.ht.toLocaleString("fr-FR")} €` : "—";
      },
      sortable: true,
      sortValue: (d) => d.amount,
    },
    {
      key: "tva",
      label: "TVA",
      align: "right",
      render: (d) => {
        const amounts = computeInvoiceAmounts(d.amount);
        return amounts ? `${amounts.tva.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €` : "—";
      },
    },
    {
      key: "ttc",
      label: "TTC",
      align: "right",
      render: (d) => {
        const amounts = computeInvoiceAmounts(d.amount);
        return amounts ? `${amounts.ttc.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €` : "—";
      },
      emphasis: "amount",
    },
    {
      key: "facturx",
      label: "Factur-X",
      render: () => (
        <span className="nova-facturx-indicator" title="Factur-X disponible">
          <FileCheck2 size={16} strokeWidth={1.75} />
        </span>
      ),
    },
    {
      key: "paymentStatus",
      label: "Statut paiement",
      render: (d) => (
        <Badge tone={PAYMENT_STATUS_TONE[displayPaymentStatus(d)]}>{PAYMENT_STATUS_LABEL[displayPaymentStatus(d)]}</Badge>
      ),
      sortable: true,
      sortValue: (d) => PAYMENT_STATUS_ORDER[displayPaymentStatus(d)],
    },
    {
      key: "echeance",
      label: "Échéance",
      render: (d) =>
        d.paymentStatus === "payee" ? (
          "—"
        ) : (
          <span className={displayPaymentStatus(d) === "en_retard" ? "nova-task-due-date-late" : undefined}>
            {echeanceDate(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
        ),
      sortable: true,
      sortValue: (d) => echeanceDate(d).getTime(),
    },
    {
      key: "updatedAt",
      label: "Date",
      render: (d) => <Timestamp date={d.updatedAt} />,
      sortable: true,
      sortValue: (d) => new Date(d.updatedAt).getTime(),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (d) =>
        displayPaymentStatus(d) === "en_retard" ? (
          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleRelancer(d);
            }}
          >
            <Send size={13} strokeWidth={1.75} />
            Relancer
          </Button>
        ) : (
          <ChevronRight size={16} strokeWidth={1.75} className="nova-ink-faint" />
        ),
    },
  ];

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Facturation</h1>
          <p className="nova-page-subtitle">
            {accepted === null ? "…" : `${accepted.length} facture${accepted.length > 1 ? "s" : ""}`}
          </p>
        </div>
        {accepted !== null && accepted.length > 0 && (
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} strokeWidth={1.75} />
            Exporter CSV
          </Button>
        )}
      </header>

      {accepted !== null && accepted.length > 0 && (
        <p className="nova-page-subtitle">
          Format Factur-X — conforme à la réforme française de facturation électronique (réception obligatoire
          depuis le 1er septembre 2026, émission via plateforme agréée prévue avant septembre 2027).
        </p>
      )}

      {accepted !== null && accepted.length > 0 && (
        <MetricBar
          items={[
            { label: "CA encaissé ce mois", value: `${caEncaisseCeMois.toLocaleString("fr-FR")} €` },
            { label: "À encaisser", value: `${enAttenteMontant.toLocaleString("fr-FR")} €` },
            { label: "En retard", value: `${enRetardMontant.toLocaleString("fr-FR")} €` },
            { label: "Total factures", value: invoices.length },
          ]}
        />
      )}

      {accepted !== null && accepted.length > 0 && <Tabs tabs={TABS} active={tab} onChange={setTab} />}

      {accepted !== null && accepted.length > 0 && (
        <FilterBar onReset={resetFilters} active={filtersActive}>
          <FilterSelect label="Client" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
            <option value="all">Tous</option>
            {clientOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Période" value={periodeFilter} onChange={(e) => setPeriodeFilter(e.target.value as PeriodeFilter)}>
            <option value="all">Toutes</option>
            <option value="mois">Ce mois</option>
            <option value="trimestre">Ce trimestre</option>
            <option value="annee">Cette année</option>
          </FilterSelect>
        </FilterBar>
      )}

      {accepted === null ? (
        <TableSkeleton columns={10} />
      ) : accepted.length === 0 ? (
        <EmptyState
          icon="devis"
          title="Aucune facture pour l'instant"
          description="Un devis devient une facture dès qu'il passe au statut « accepté »."
          actionLabel="Voir les devis"
          actionHref="/dashboard/devis"
        />
      ) : (
        <Table
          columns={columns}
          rows={filteredRows}
          getRowHref={(d) => `/dashboard/facturation/${d.id}`}
          emptyLabel="Aucune facture pour cet onglet."
          pageSize={10}
        />
      )}

      {relanceTarget && (
        <div className="nova-modal-overlay" onClick={() => setRelanceTarget(null)}>
          <div
            className="nova-modal nova-modal-edit"
            role="dialog"
            aria-modal="true"
            aria-label="Message de relance"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nova-planning-detail-header">
              <h3 className="nova-modal-title">Relance — {relanceTarget.client?.name || "client"}</h3>
              <button type="button" className="nova-icon-btn" onClick={() => setRelanceTarget(null)} aria-label="Fermer">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            {relanceLoading ? (
              <p className="nova-page-subtitle">Nova rédige le message...</p>
            ) : (
              <p className="nova-ai-content">{relanceText}</p>
            )}
            <div className="nova-modal-actions">
              <Button variant="secondary" onClick={() => setRelanceTarget(null)}>
                Fermer
              </Button>
              <Button onClick={handleCopyRelance} disabled={!relanceText}>
                Copier le message
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
