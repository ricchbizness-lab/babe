"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, X } from "lucide-react";
import { Badge, Button, EmptyState, MetricBar, Table, TableSkeleton, Tabs, useToast, type TableColumn } from "@/components/ui";
import { computeInvoiceAmounts } from "@/lib/facturation";
import { daysSinceSent, relanceLevel } from "@/lib/relance";
import { fetchWithAuth } from "@/lib/fetchClient";

type DevisRow = {
  id: string;
  label: string;
  amount: number | null;
  status: string;
  paymentStatus: string;
  updatedAt: string;
  client: { id: string; name: string; email: string | null } | null;
};

type TaskRow = {
  id: string;
  text: string;
  done: boolean;
  dueDate: string | null;
  project: { id: string; name: string } | null;
};

const PAYMENT_TERMS_DAYS = 30;

function joursRetardFacture(d: DevisRow): number {
  return Math.max(0, daysSinceSent(d.updatedAt) - PAYMENT_TERMS_DAYS);
}

function retardTone(days: number): "amber" | "danger" {
  return days >= 15 ? "danger" : "amber";
}

function isOverdueTask(t: TaskRow) {
  if (!t.dueDate || t.done) return false;
  return new Date(t.dueDate) < new Date(new Date().toDateString());
}

const TABS: { key: "factures" | "devis" | "rappels"; label: string }[] = [
  { key: "factures", label: "Factures" },
  { key: "devis", label: "Devis" },
  { key: "rappels", label: "Rappels" },
];

export default function RelancesPage() {
  const toast = useToast();
  const [devis, setDevis] = useState<DevisRow[] | null>(null);
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [tab, setTab] = useState<"factures" | "devis" | "rappels">("factures");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ client: string; email: string; message: string } | null>(null);

  useEffect(() => {
    fetchWithAuth("/api/devis")
      .then((res) => res.json())
      .then((data) => setDevis(data.devis ?? []));
    fetchWithAuth("/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks ?? []));
  }, []);

  const loading = devis === null || tasks === null;
  const devisList = devis ?? [];

  const facturesARelancer = devisList.filter((d) => d.status === "accepte" && d.paymentStatus === "en_retard");
  const devisARelancer = devisList.filter((d) => d.status === "envoye" && relanceLevel(d.status, d.updatedAt).level !== "none");
  const rappelsList = (tasks ?? [])
    .filter((t) => !t.done && t.dueDate)
    .sort((a, b) => new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime());

  const accepted = devisList.filter((d) => d.status === "accepte");
  const paidCount = accepted.filter((d) => d.paymentStatus === "payee").length;
  const tauxRecouvrement = accepted.length > 0 ? Math.round((paidCount / accepted.length) * 100) : 0;

  const montantTotal =
    facturesARelancer.reduce((sum, d) => sum + (d.amount || 0), 0) + devisARelancer.reduce((sum, d) => sum + (d.amount || 0), 0);
  const enRetard30j = facturesARelancer.filter((d) => joursRetardFacture(d) > 30).length;

  async function handleRelancer(d: DevisRow) {
    if (!d.client?.email) {
      toast.error("Ce client n'a pas d'adresse email renseignée.");
      return;
    }
    setSendingId(d.id);
    try {
      const res = await fetchWithAuth("/api/relances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId: d.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible d'envoyer la relance.");
        return;
      }
      const data = await res.json();
      setResult({ client: d.client.name, email: d.client.email, message: data.message || "" });
      toast.success("Relance envoyée");
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSendingId(null);
    }
  }

  async function handleToggleTask(t: TaskRow) {
    setTasks((prev) => (prev ?? []).map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    try {
      const res = await fetchWithAuth(`/api/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !t.done }),
      });
      if (!res.ok) {
        setTasks((prev) => (prev ?? []).map((x) => (x.id === t.id ? { ...x, done: t.done } : x)));
        toast.error("Erreur lors de la mise à jour de la tâche.");
      }
    } catch {
      setTasks((prev) => (prev ?? []).map((x) => (x.id === t.id ? { ...x, done: t.done } : x)));
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
  }

  const factureColumns: TableColumn<DevisRow>[] = [
    { key: "label", label: "Référence", emphasis: "title" },
    { key: "client", label: "Client", render: (d) => d.client?.name || "—" },
    {
      key: "montant",
      label: "Montant TTC",
      align: "right",
      render: (d) => {
        const amounts = computeInvoiceAmounts(d.amount);
        return amounts ? `${amounts.ttc.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €` : "—";
      },
      emphasis: "amount",
    },
    {
      key: "echeance",
      label: "Échéance",
      render: (d) => {
        const echeance = new Date(d.updatedAt);
        echeance.setDate(echeance.getDate() + PAYMENT_TERMS_DAYS);
        return echeance.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
      },
    },
    {
      key: "retard",
      label: "Retard",
      render: (d) => <Badge tone={retardTone(joursRetardFacture(d))}>{joursRetardFacture(d)} j</Badge>,
      sortable: true,
      sortValue: (d) => joursRetardFacture(d),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (d) => (
        <Button
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            handleRelancer(d);
          }}
          disabled={sendingId === d.id}
        >
          <Send size={13} strokeWidth={1.75} />
          {sendingId === d.id ? "Envoi..." : "Relancer"}
        </Button>
      ),
    },
  ];

  const devisColumns: TableColumn<DevisRow>[] = [
    { key: "label", label: "Devis", emphasis: "title" },
    { key: "client", label: "Client", render: (d) => d.client?.name || "—" },
    {
      key: "montant",
      label: "Montant",
      align: "right",
      render: (d) => (d.amount != null ? `${d.amount.toLocaleString("fr-FR")} €` : "—"),
      emphasis: "amount",
    },
    {
      key: "envoye",
      label: "Envoyé depuis",
      render: (d) => {
        const level = relanceLevel(d.status, d.updatedAt);
        return <Badge tone={level.level === "danger" ? "danger" : "amber"}>{level.days} j</Badge>;
      },
      sortable: true,
      sortValue: (d) => relanceLevel(d.status, d.updatedAt).days,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (d) => (
        <Button
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            handleRelancer(d);
          }}
          disabled={sendingId === d.id}
        >
          <Send size={13} strokeWidth={1.75} />
          {sendingId === d.id ? "Envoi..." : "Relancer"}
        </Button>
      ),
    },
  ];

  return (
    <div className="nova-page">
      <header className="nova-page-header">
        <h1>Relances</h1>
        <p className="nova-page-subtitle">Factures en retard, devis sans réponse et rappels à traiter.</p>
      </header>

      {!loading && (
        <MetricBar
          items={[
            { label: "À relancer", value: facturesARelancer.length + devisARelancer.length },
            { label: "Montant total", value: `${montantTotal.toLocaleString("fr-FR")} €` },
            { label: "En retard +30j", value: enRetard30j },
            { label: "Taux de recouvrement", value: `${tauxRecouvrement}%` },
          ]}
        />
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {loading ? (
        <TableSkeleton columns={5} />
      ) : tab === "factures" ? (
        facturesARelancer.length === 0 ? (
          <EmptyState
            icon="facturation"
            title="Aucune facture à relancer"
            description="Les factures en retard de paiement apparaîtront ici."
          />
        ) : (
          <Table columns={factureColumns} rows={facturesARelancer} getRowHref={(d) => `/dashboard/facturation/${d.id}`} pageSize={10} />
        )
      ) : tab === "devis" ? (
        devisARelancer.length === 0 ? (
          <EmptyState
            icon="devis"
            title="Aucun devis à relancer"
            description="Les devis envoyés depuis plus de 7 jours sans réponse apparaîtront ici."
          />
        ) : (
          <Table columns={devisColumns} rows={devisARelancer} getRowHref={(d) => `/dashboard/devis/${d.id}`} pageSize={10} />
        )
      ) : rappelsList.length === 0 ? (
        <EmptyState icon="taches" title="Aucun rappel en attente" description="Les tâches avec une échéance apparaîtront ici." />
      ) : (
        <ul className="nova-task-list">
          {rappelsList.map((t) => (
            <li key={t.id} className="nova-task-row" onClick={() => handleToggleTask(t)}>
              <input
                type="checkbox"
                className="nova-checkbox"
                checked={t.done}
                onChange={() => handleToggleTask(t)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Marquer comme faite"
              />
              <span className="nova-task-text">{t.text}</span>
              {t.dueDate && (
                <span className={isOverdueTask(t) ? "nova-task-due-date nova-task-due-date-late" : "nova-task-due-date"}>
                  {new Date(t.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
              )}
              {t.project && (
                <Link href={`/dashboard/chantiers/${t.project.id}`} className="nova-task-project" onClick={(e) => e.stopPropagation()}>
                  <Badge tone="teal">{t.project.name}</Badge>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {result && (
        <div className="nova-modal-overlay" onClick={() => setResult(null)}>
          <div className="nova-modal nova-modal-edit" role="dialog" aria-modal="true" aria-label="Relance envoyée" onClick={(e) => e.stopPropagation()}>
            <div className="nova-planning-detail-header">
              <h3 className="nova-modal-title">Relance envoyée à {result.client}</h3>
              <button type="button" className="nova-icon-btn" onClick={() => setResult(null)} aria-label="Fermer">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <p className="nova-page-subtitle">Envoyée à {result.email}</p>
            <p className="nova-ai-content">{result.message}</p>
            <div className="nova-modal-actions">
              <Button onClick={() => setResult(null)}>Fermer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
