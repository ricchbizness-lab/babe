"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  FilterSelect,
  FilterToggle,
  MetricBar,
  RelanceIndicator,
  SearchInput,
  Table,
  TableSkeleton,
  Timestamp,
  type TableColumn,
} from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { downloadCSV, generateCSV } from "@/lib/csv";
import { daysSinceSent } from "@/lib/relance";
import { Download } from "lucide-react";
import { DevisKanban, KanbanSkeleton } from "./DevisKanban";

export type DevisRow = {
  id: string;
  label: string;
  description: string | null;
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

type MontantFilter = "all" | "lt1k" | "1k-5k" | "gt5k";
type PeriodeFilter = "all" | "mois" | "trimestre" | "annee";

function matchesMontant(amount: number | null, filter: MontantFilter): boolean {
  if (filter === "all") return true;
  const a = amount || 0;
  if (filter === "lt1k") return a < 1000;
  if (filter === "1k-5k") return a >= 1000 && a <= 5000;
  return a > 5000;
}

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

function isRelanceEnRetard(d: DevisRow): boolean {
  return d.status === "envoye" && daysSinceSent(d.updatedAt) >= 7;
}

export default function DevisPage() {
  const [devis, setDevis] = useState<DevisRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"pipeline" | "liste">("pipeline");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [montantFilter, setMontantFilter] = useState<MontantFilter>("all");
  const [periodeFilter, setPeriodeFilter] = useState<PeriodeFilter>("all");
  const [retardOnly, setRetardOnly] = useState(false);

  useEffect(() => {
    fetchWithAuth("/api/devis")
      .then((res) => res.json())
      .then((data) => setDevis(data.devis ?? []));
  }, []);

  const clientOptions = Array.from(
    new Map((devis ?? []).filter((d) => d.client).map((d) => [d.client!.id, d.client!.name])).entries()
  );

  const filtered = (devis ?? []).filter((d) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || d.label.toLowerCase().includes(q) || (d.client?.name || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesClient = clientFilter === "all" || d.client?.id === clientFilter;
    const matchesMontantFilter = matchesMontant(d.amount, montantFilter);
    const matchesPeriodeFilter = matchesPeriode(d.createdAt, periodeFilter);
    const matchesRetard = !retardOnly || isRelanceEnRetard(d);
    return matchesQuery && matchesStatus && matchesClient && matchesMontantFilter && matchesPeriodeFilter && matchesRetard;
  });

  const filtersActive =
    statusFilter !== "all" || clientFilter !== "all" || montantFilter !== "all" || periodeFilter !== "all" || retardOnly;

  function resetFilters() {
    setStatusFilter("all");
    setClientFilter("all");
    setMontantFilter("all");
    setPeriodeFilter("all");
    setRetardOnly(false);
  }

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

      <div className="nova-view-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={view === "pipeline"}
          className={`nova-view-tab ${view === "pipeline" ? "nova-view-tab-active" : ""}`}
          onClick={() => setView("pipeline")}
        >
          Vue pipeline
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "liste"}
          className={`nova-view-tab ${view === "liste" ? "nova-view-tab-active" : ""}`}
          onClick={() => setView("liste")}
        >
          Vue liste
        </button>
      </div>

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

      {view === "pipeline" ? (
        devis === null ? (
          <KanbanSkeleton />
        ) : devis.length === 0 ? (
          <EmptyState
            icon="devis"
            title="Aucun devis pour l'instant — créez votre premier devis"
            description="Nova peut générer le contenu à votre place à partir de quelques informations."
            actionLabel="Créer un devis"
            actionHref="/dashboard/devis/nouveau"
          />
        ) : (
          <DevisKanban devis={devis} />
        )
      ) : (
        <>
          <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un devis..." />

          {devis !== null && devis.length > 0 && (
            <FilterBar onReset={resetFilters} active={filtersActive}>
              <FilterSelect label="Statut" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Tous</option>
                <option value="brouillon">Brouillon</option>
                <option value="envoye">Envoyé</option>
                <option value="accepte">Accepté</option>
                <option value="refuse">Refusé</option>
              </FilterSelect>
              <FilterSelect label="Client" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
                <option value="all">Tous</option>
                {clientOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Montant"
                value={montantFilter}
                onChange={(e) => setMontantFilter(e.target.value as MontantFilter)}
              >
                <option value="all">Tous</option>
                <option value="lt1k">Moins de 1k €</option>
                <option value="1k-5k">1k – 5k €</option>
                <option value="gt5k">Plus de 5k €</option>
              </FilterSelect>
              <FilterSelect
                label="Période"
                value={periodeFilter}
                onChange={(e) => setPeriodeFilter(e.target.value as PeriodeFilter)}
              >
                <option value="all">Toutes</option>
                <option value="mois">Ce mois</option>
                <option value="trimestre">Ce trimestre</option>
                <option value="annee">Cette année</option>
              </FilterSelect>
              <FilterToggle label="En retard de relance" active={retardOnly} onClick={() => setRetardOnly((v) => !v)} />
            </FilterBar>
          )}

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
        </>
      )}
    </div>
  );
}
