"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckSquare,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import {
  Badge,
  Card,
  CardTitle,
  MiniLineChart,
  NewMenu,
  Skeleton,
  StatCard,
  Table,
  Timestamp,
  WeekRangePicker,
  type TableColumn,
} from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type Metrics = {
  devisEnCours: number;
  facturesEnAttente: number;
  relancesActives: number;
  chantiersEnCours: number;
};

type ChartPoint = { month: string; ca: number; encaisse: number };

type AFaireItem = {
  id: string;
  kind: "devis" | "facture" | "chantier" | "tache";
  title: string;
  subtitle: string;
  date: string | null;
  urgent: boolean;
  href: string;
};

type ActivityRow = {
  id: string;
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

const KIND_ICON: Record<AFaireItem["kind"], { icon: typeof FileText; tone: "teal" | "amber" | "neutral" | "danger" }> = {
  devis: { icon: FileText, tone: "teal" },
  facture: { icon: Banknote, tone: "amber" },
  chantier: { icon: Building2, tone: "neutral" },
  tache: { icon: CheckSquare, tone: "danger" },
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

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetchWithAuth("/api/dashboard-overview")
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  const columns: TableColumn<ActivityRow>[] = [
    {
      key: "kind",
      label: "Type",
      render: (row) => {
        const { icon: Icon, tone } = KIND_ICON[row.kind];
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
      render: () => (
        <span className="nova-icon-btn" aria-hidden="true">
          <MoreHorizontal size={16} strokeWidth={1.75} />
        </span>
      ),
    },
  ];

  return (
    <div className="nova-page">
      <header className="nova-overview-header">
        <div>
          <h1 className="nova-overview-greeting">Bonjour{data?.firstName ? ` ${data.firstName}` : ""} 👋</h1>
          <p className="nova-page-subtitle">Voici un aperçu de votre activité</p>
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
            icon={<FileText size={20} strokeWidth={1.75} />}
            tone="teal"
            value={data.metrics.devisEnCours}
            label="Devis en cours"
            sublabel={
              data.metrics.devisEnCours > 0
                ? `${data.metrics.devisEnCours} en attente de réponse`
                : "Aucun devis en attente"
            }
          />
          <StatCard
            icon={<Banknote size={20} strokeWidth={1.75} />}
            tone="amber"
            value={data.metrics.facturesEnAttente}
            label="Factures en attente"
            sublabel={
              data.metrics.facturesEnAttente > 0
                ? `${data.metrics.facturesEnAttente} facture${data.metrics.facturesEnAttente > 1 ? "s" : ""} impayée${data.metrics.facturesEnAttente > 1 ? "s" : ""}`
                : "Aucune facture impayée"
            }
          />
          <StatCard
            icon={<AlertTriangle size={20} strokeWidth={1.75} />}
            tone="danger"
            value={data.metrics.relancesActives}
            label="Relances actives"
            sublabel={data.metrics.relancesActives > 0 ? `${data.metrics.relancesActives} relance${data.metrics.relancesActives > 1 ? "s" : ""} en cours` : "Aucune relance en cours"}
          />
          <StatCard
            icon={<Building2 size={20} strokeWidth={1.75} />}
            tone="neutral"
            value={data.metrics.chantiersEnCours}
            label="Chantiers en cours"
            sublabel={data.metrics.chantiersEnCours > 0 ? `${data.metrics.chantiersEnCours} chantier${data.metrics.chantiersEnCours > 1 ? "s" : ""} actif${data.metrics.chantiersEnCours > 1 ? "s" : ""}` : "Aucun chantier actif"}
          />
        </div>
      )}

      <div className="nova-overview-grid">
        <Card>
          <CardTitle>Activité récente</CardTitle>
          {data === null ? (
            <Skeleton style={{ height: 220 }} />
          ) : (
            <MiniLineChart data={data.chart} seriesALabel="Chiffre d'affaires" seriesBLabel="Factures encaissées" />
          )}
        </Card>

        <Card>
          <CardTitle>À faire</CardTitle>
          {data === null ? (
            <Skeleton style={{ height: 220 }} />
          ) : data.aFaire.length === 0 ? (
            <p className="nova-todo-empty">Rien d'urgent pour le moment.</p>
          ) : (
            <div className="nova-todo-list">
              {data.aFaire.map((item) => {
                const { icon: Icon, tone } = KIND_ICON[item.kind];
                return (
                  <Link key={item.id} href={item.href} className="nova-todo-item">
                    <span className={`nova-todo-icon nova-stat-icon-${tone}`}>
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <div className="nova-todo-body">
                      <div className="nova-todo-title">{item.title}</div>
                      <div className="nova-todo-subtitle">{item.subtitle}</div>
                    </div>
                    {item.date && (
                      <span className={`nova-todo-date ${item.urgent ? "nova-todo-date-urgent" : ""}`}>
                        {formatShortDate(item.date)}
                      </span>
                    )}
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
    </div>
  );
}
