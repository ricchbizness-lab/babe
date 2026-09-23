"use client";

import { useEffect, useState, type FormEvent } from "react";
import * as XLSX from "xlsx";
import { Calculator, Download } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  EmptyState,
  Table,
  TableSkeleton,
  Tabs,
  useToast,
  type BadgeTone,
  type TableColumn,
} from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { generateCSV, downloadCSV } from "@/lib/csv";
import { buildFecRows, buildSimplifiedRows, FEC_COLUMNS, SIMPLIFIED_COLUMNS } from "@/lib/comptabiliteExport";

type VenteRow = {
  id: string;
  devisId: string;
  date: string;
  reference: string;
  label: string;
  clientName: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  paymentStatus: string;
};

type AchatRow = {
  id: string;
  purchaseId: string;
  date: string;
  description: string;
  supplierName: string;
  montant: number;
  status: string;
};

type ComptaData = { periode: { label: string; debut: string; fin: string }; ventes: VenteRow[]; achats: AchatRow[] };

const FORMATS: { key: "fec" | "simplifie" | "excel"; label: string }[] = [
  { key: "fec", label: "FEC (CSV)" },
  { key: "simplifie", label: "CSV simplifié (Pennylane/QuickBooks)" },
  { key: "excel", label: "Excel (.xlsx)" },
];

const PAYMENT_STATUS_LABEL: Record<string, string> = { en_attente: "En attente", payee: "Payée", en_retard: "En retard" };
const PAYMENT_STATUS_TONE: Record<string, BadgeTone> = { en_attente: "amber", payee: "success", en_retard: "danger" };

function slug(label: string): string {
  return label.replace(/\s+/g, "_").replace(/[^\w-]/g, "");
}

export default function ComptabilitePage() {
  const toast = useToast();
  const [tab, setTab] = useState<"export" | "historique">("export");
  const [period, setPeriod] = useState(String(new Date().getFullYear()));
  const [format, setFormat] = useState<(typeof FORMATS)[number]["key"]>("fec");
  const [data, setData] = useState<ComptaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  async function fetchData(p: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth(`/api/comptabilite?period=${encodeURIComponent(p)}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Impossible de charger les données.");
        setData(null);
        return;
      }
      const json = await res.json();
      setData({
        ...json,
        ventes: json.ventes.map((v: Omit<VenteRow, "id">) => ({ ...v, id: v.devisId })),
        achats: json.achats.map((a: Omit<AchatRow, "id">) => ({ ...a, id: a.purchaseId })),
      });
    } catch {
      setError("Impossible de joindre le serveur — réessayez.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePeriodSubmit(e: FormEvent) {
    e.preventDefault();
    if (!period.trim()) return;
    fetchData(period.trim());
  }

  function handleExport() {
    if (!data) return;
    setExporting(true);
    try {
      const filenameBase = `${slug(data.periode.label)}`;
      if (format === "fec") {
        const rows = buildFecRows(data);
        const csv = generateCSV([...FEC_COLUMNS], rows.map((r) => FEC_COLUMNS.map((c) => r[c])));
        downloadCSV(`FEC_${filenameBase}.csv`, csv);
      } else if (format === "simplifie") {
        const rows = buildSimplifiedRows(data);
        const csv = generateCSV([...SIMPLIFIED_COLUMNS], rows);
        downloadCSV(`export-comptable-${filenameBase}.csv`, csv);
      } else {
        const rows = buildSimplifiedRows(data);
        const worksheet = XLSX.utils.aoa_to_sheet([[...SIMPLIFIED_COLUMNS], ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
        XLSX.writeFile(workbook, `export-comptable-${filenameBase}.xlsx`);
      }
      toast.success("Export généré");
    } catch {
      toast.error("Impossible de générer l'export.");
    } finally {
      setExporting(false);
    }
  }

  const venteColumns: TableColumn<VenteRow>[] = [
    { key: "date", label: "Date", render: (v) => v.date.slice(0, 10).split("-").reverse().join("/") },
    { key: "reference", label: "Référence" },
    { key: "client", label: "Client", render: (v) => v.clientName },
    { key: "ht", label: "Montant HT", align: "right", render: (v) => `${v.montantHT.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €` },
    { key: "tva", label: "TVA", align: "right", render: (v) => `${v.montantTVA.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €` },
    { key: "ttc", label: "TTC", align: "right", render: (v) => `${v.montantTTC.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`, emphasis: "amount" },
    {
      key: "statut",
      label: "Statut",
      render: (v) => <Badge tone={PAYMENT_STATUS_TONE[v.paymentStatus] || "neutral"}>{PAYMENT_STATUS_LABEL[v.paymentStatus] || v.paymentStatus}</Badge>,
    },
  ];

  const achatColumns: TableColumn<AchatRow>[] = [
    { key: "date", label: "Date", render: (a) => a.date.slice(0, 10).split("-").reverse().join("/") },
    { key: "fournisseur", label: "Fournisseur", render: (a) => a.supplierName },
    { key: "description", label: "Description" },
    { key: "montant", label: "Montant", align: "right", render: (a) => `${a.montant.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`, emphasis: "amount" },
  ];

  return (
    <div className="nova-page">
      <header className="nova-page-header">
        <h1>Comptabilité</h1>
        <p className="nova-page-subtitle">Export des écritures comptables et historique des ventes/achats par période.</p>
      </header>

      <Tabs tabs={[{ key: "export", label: "Export" }, { key: "historique", label: "Historique" }]} active={tab} onChange={setTab} />

      <Card>
        <form onSubmit={handlePeriodSubmit} className="nova-quick-add">
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="Période (ex. 2026-T3, 2026-09 ou 2026)"
            aria-label="Période"
          />
          <button type="submit" className="nova-btn nova-btn-secondary" disabled={loading || !period.trim()}>
            {loading ? "Chargement..." : "Charger"}
          </button>
        </form>
        <p className="nova-hint">Trimestre ("2026-T3"), mois ("2026-09") ou année complète ("2026").</p>
        {error && <div className="error">{error}</div>}
      </Card>

      {tab === "export" && (
        <Card>
          <CardTitle>
            <Calculator size={16} strokeWidth={1.75} />
            Exporter
          </CardTitle>
          <div className="nova-status-actions">
            {FORMATS.map((f) => (
              <Button key={f.key} variant={format === f.key ? "primary" : "secondary"} onClick={() => setFormat(f.key)}>
                {f.label}
              </Button>
            ))}
          </div>
          {data && (
            <p className="nova-page-subtitle" style={{ marginTop: 16 }}>
              {data.ventes.length} vente{data.ventes.length !== 1 ? "s" : ""} et {data.achats.length} achat
              {data.achats.length !== 1 ? "s" : ""} sur la période {data.periode.label}.
            </p>
          )}
          <Button onClick={handleExport} disabled={!data || loading || exporting} style={{ marginTop: 16 }}>
            <Download size={16} strokeWidth={1.75} />
            {exporting ? "Génération..." : "Exporter"}
          </Button>
        </Card>
      )}

      {tab === "historique" && (
        <>
          <section>
            <h2 className="nova-section-title">Ventes (devis acceptés)</h2>
            {loading ? (
              <TableSkeleton columns={7} />
            ) : !data || data.ventes.length === 0 ? (
              <EmptyState
                icon="comptabilite"
                title="Aucune vente sur cette période"
                description="Les devis acceptés dans la période sélectionnée apparaîtront ici."
              />
            ) : (
              <Table columns={venteColumns} rows={data.ventes} emptyLabel="Aucune vente." pageSize={10} />
            )}
          </section>

          <section>
            <h2 className="nova-section-title">Achats</h2>
            {loading ? (
              <TableSkeleton columns={4} />
            ) : !data || data.achats.length === 0 ? (
              <EmptyState
                icon="achats"
                title="Aucun achat sur cette période"
                description="Les commandes fournisseurs de la période sélectionnée apparaîtront ici."
              />
            ) : (
              <Table columns={achatColumns} rows={data.achats} emptyLabel="Aucun achat." pageSize={10} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
