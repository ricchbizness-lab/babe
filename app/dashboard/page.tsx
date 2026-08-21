"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, DollarSign, FileText, HardHat, Receipt, TrendingUp } from "lucide-react";
import {
  Badge,
  Card,
  CardTitle,
  ConfirmModal,
  MiniLineChart,
  NewMenu,
  PriorityBadge,
  RowActionsMenu,
  Skeleton,
  StatCard,
  Table,
  Timestamp,
  useToast,
  WeekRangePicker,
  type PriorityLevel,
  type TableColumn,
} from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type Metrics = {
  caFacture: number;
  devisEnCours: number;
  chantiersActifs: number;
  facturesAEncaisser: number;
};

type ChartPoint = { month: string; ca: number; encaisse: number };

type AFaireItem = {
  id: string;
  kind: "devis" | "facture" | "chantier" | "tache";
  title: string;
  subtitle: string;
  date: string | null;
  priority: PriorityLevel;
  href: string;
};

type ActivityRow = {
  id: string;
  rawId: string;
  kind: "devis" | "facture" | "chantier";
  reference: string;
  clientOrChantier: string;
  amount: number | null;
  status: string;
  date: string;
  href: string;
};

type Overview = {
  businessName: string;
  firstName: string | null;
  metrics: Metrics;
  chart: ChartPoint[];
  aFaire: AFaireItem[];
  activites: ActivityRow[];
};

const DEVIS_STATUS_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  refuse: "Refusé",
};
const DEVIS_STATUS_TONE: Record<string, "neutral" | "teal" | "success" | "danger" | "amber"> = {
  brouillon: "neutral",
  envoye: "teal",
  refuse: "danger",
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
const PROJECT_STATUS_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};
const PROJECT_STATUS_TONE: Record<string, "neutral" | "teal" | "success" | "danger"> = {
  planifie: "neutral",
  en_cours: "teal",
  termine: "success",
  annule: "danger",
};

const AFAIRE_KIND_ICON: Record<AFaireItem["kind"], { icon: typeof FileText; tone: "teal" | "amber" | "neutral" | "blue" }> = {
  devis: { icon: FileText, tone: "blue" },
  facture: { icon: Receipt, tone: "amber" },
  chantier: { icon: HardHat, tone: "teal" },
  tache: { icon: FileText, tone: "neutral" },
};

const ACTIVITY_KIND_ICON: Record<ActivityRow["kind"], { icon: typeof FileText; tone: "teal" | "amber" | "blue" }> = {
  devis: { icon: FileText, tone: "blue" },
  facture: { icon: Receipt, tone: "amber" },
  chantier: { icon: HardHat, tone: "teal" },
};

function statusBadge(row: ActivityRow) {
  if (row.kind === "devis") {
    return <Badge tone={DEVIS_STATUS_TONE[row.status] || "neutral"}>{DEVIS_STATUS_LABEL[row.status] || row.status}</Badge>;
  }
  if (row.kind === "facture") {
    return <Badge tone={PAYMENT_STATUS_TONE[row.status] || "amber"}>{PAYMENT_STATUS_LABEL[row.status] || row.status}</Badge>;
  }
  return <Badge tone={PROJECT_STATUS_TONE[row.status] || "neutral"}>{PROJECT_STATUS_LABEL[row.status] || row.status}</Badge>;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const PERIOD_OPTIONS: { value: number; label: string }[] = [
  { value: 3, label: "3 derniers mois" },
  { value: 6, label: "6 derniers mois" },
  { value: 12, label: "12 derniers mois" },
];

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<Overview | null>(null);
  const [months, setMonths] = useState(6);
  const [deleteTarget, setDeleteTarget] = useState<ActivityRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchWithAuth(`/api/dashboard-overview?months=${months}`)
      .then((res) => res.json())
      .then((json) => setData(json));
  }, [months]);

  async function confirmDeleteRow() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const url = deleteTarget.kind === "chantier" ? `/api/projects/${deleteTarget.rawId}` : `/api/devis/${deleteTarget.rawId}`;
      const res = await fetchWithAuth(url, { method: "DELETE" });
      setDeleting(false);
      if (res.ok) {
        setData((prev) => (prev ? { ...prev, activites: prev.activites.filter((a) => a.id !== deleteTarget.id) } : prev));
        toast.success("Élément supprimé");
        router.refresh();
      } else {
        toast.error("Erreur lors de la suppression.");
      }
    } catch {
      setDeleting(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteTarget(null);
  }

  const columns: TableColumn<ActivityRow>[] = [
    {
      key: "kind",
      label: "Type",
      render: (row) => {
        const { icon: Icon, tone } = ACTIVITY_KIND_ICON[row.kind];
        return (
          <span className="nova-activity-type">
            <span className={`nova-activity-type-icon nova-stat-icon-${tone}`}>
              <Icon size={14} strokeWidth={1.75} />
            </span>
          </span>
        );
      },
    },
    { key: "reference", label: "Référence" },
    { key: "clientOrChantier", label: "Client / Chantier" },
    {
      key: "amount",
      label: "Montant",
      align: "right",
      render: (row) => (row.amount != null ? `${row.amount.toLocaleString("fr-FR")} €` : "—"),
    },
    { key: "status", label: "Statut", render: statusBadge },
    { key: "date", label: "Date", render: (row) => <Timestamp date={row.date} /> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <RowActionsMenu
          onView={() => router.push(row.href)}
          onEdit={() => router.push(row.href)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ];

  return (
    <div className="nova-page">
      <header className="nova-overview-header">
        <div>
          <h1 className="nova-overview-greeting">
            Bonjour{data ? ` ${data.firstName || data.businessName}` : ""} 👋
          </h1>
          <p className="nova-page-subtitle">Voici un aperçu de votre activité.</p>
        </div>
        <div className="nova-overview-header-actions">
          <WeekRangePicker />
          <NewMenu />
        </div>
      </header>

      {data === null ? (
        <div className="nova-stats-grid" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="nova-stat-card" key={i}>
              <Skeleton style={{ width: 44, height: 44, borderRadius: "50%" }} />
              <div style={{ flex: 1 }}>
                <Skeleton style={{ width: 40, height: 28, marginBottom: 8 }} />
                <Skeleton style={{ width: 88, height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="nova-stats-grid">
          <StatCard
            icon={<TrendingUp size={20} strokeWidth={1.75} />}
            tone="teal"
            value={`${data.metrics.caFacture.toLocaleString("fr-FR")} €`}
            label="CA facturé"
            sublabel="Devis acceptés"
          />
          <StatCard
            icon={<FileText size={20} strokeWidth={1.75} />}
            tone="blue"
            value={data.metrics.devisEnCours}
            label="Devis en cours"
            sublabel={
              data.metrics.devisEnCours > 0
                ? `${data.metrics.devisEnCours} en attente de réponse`
                : "Aucun devis en attente"
            }
          />
          <StatCard
            icon={<HardHat size={20} strokeWidth={1.75} />}
            tone="amber"
            value={data.metrics.chantiersActifs}
            label="Chantiers actifs"
            sublabel={
              data.metrics.chantiersActifs > 0
                ? `${data.metrics.chantiersActifs} chantier${data.metrics.chantiersActifs > 1 ? "s" : ""} actif${data.metrics.chantiersActifs > 1 ? "s" : ""}`
                : "Aucun chantier actif"
            }
          />
          <StatCard
            icon={<DollarSign size={20} strokeWidth={1.75} />}
            tone="orange"
            value={data.metrics.facturesAEncaisser}
            label="Factures à encaisser"
            sublabel={
              data.metrics.facturesAEncaisser > 0
                ? `${data.metrics.facturesAEncaisser} à encaisser`
                : "Aucune facture en attente"
            }
          />
        </div>
      )}

      <div className="nova-overview-grid">
        <Card>
          <div className="nova-section-header-row">
            <CardTitle>Activité récente</CardTitle>
            <select
              className="nova-chart-period-select"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              aria-label="Période du graphique"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {data === null ? (
            <Skeleton style={{ height: 220 }} />
          ) : (
            <MiniLineChart data={data.chart} seriesALabel="Chiffre d'affaires" seriesBLabel="Factures encaissées" />
          )}
        </Card>

        <Card>
          <div className="nova-section-header-row">
            <CardTitle>À faire aujourd&apos;hui</CardTitle>
            <Link href="/dashboard/taches" className="nova-inline-link">
              Voir tout
            </Link>
          </div>
          {data === null ? (
            <Skeleton style={{ height: 220 }} />
          ) : data.aFaire.length === 0 ? (
            <p className="nova-todo-empty">Rien d'urgent pour le moment.</p>
          ) : (
            <div className="nova-todo-list">
              {data.aFaire.map((item) => {
                const { icon: Icon, tone } = AFAIRE_KIND_ICON[item.kind];
                return (
                  <Link key={item.id} href={item.href} className="nova-todo-item">
                    <span className={`nova-todo-icon nova-stat-icon-${tone}`}>
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <div className="nova-todo-body">
                      <div className="nova-todo-title">{item.title}</div>
                      <div className="nova-todo-subtitle">{item.subtitle}</div>
                    </div>
                    <PriorityBadge level={item.priority} />
                    <ChevronRight size={16} strokeWidth={1.75} className="nova-todo-chevron" />
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle>Dernières activités</CardTitle>
        {data === null ? (
          <Skeleton style={{ height: 220 }} />
        ) : (
          <>
            <Table
              columns={columns}
              rows={data.activites}
              getRowHref={(row) => row.href}
              emptyLabel="Aucune activité pour le moment."
            />
            {data.activites.length > 0 && (
              <div className="nova-table-footer-link">
                <Link href="/dashboard/devis" className="nova-inline-link">
                  Voir toutes les activités →
                </Link>
              </div>
            )}
          </>
        )}
      </Card>

      <ConfirmModal
        open={deleteTarget !== null}
        itemLabel={deleteTarget ? `« ${deleteTarget.reference} »` : ""}
        onConfirm={confirmDeleteRow}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
