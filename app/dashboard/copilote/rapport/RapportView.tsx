"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, Download, Pencil } from "lucide-react";
import { Badge, Breadcrumb, Button, Card, CardTitle, EmptyState, Timestamp, useToast } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type Report = {
  id: string;
  period: string;
  status: string;
  content: string;
  reviewedBy: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  en_relecture: "En relecture",
  envoye: "Envoyé",
};
const STATUS_TONE: Record<string, "neutral" | "teal" | "success"> = {
  brouillon: "neutral",
  en_relecture: "teal",
  envoye: "success",
};

export function RapportView() {
  const toast = useToast();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [period, setPeriod] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingContent, setSavingContent] = useState(false);

  useEffect(() => {
    fetchWithAuth("/api/strategic-reports")
      .then((res) => res.json())
      .then((data) => setReports(data.reports ?? []));
  }, []);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!period.trim()) {
      toast.error("Indiquez une période (ex. 2026-T3).");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetchWithAuth("/api/strategic-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de générer le rapport.");
        return;
      }
      const data = await res.json();
      setReports((prev) => [data.report, ...(prev ?? [])]);
      setPeriod("");
      toast.success("Rapport généré");
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleReview(id: string) {
    setReviewingId(id);
    try {
      const res = await fetchWithAuth(`/api/strategic-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "en_relecture" }),
      });
      if (!res.ok) {
        toast.error("Impossible de mettre à jour ce rapport.");
        return;
      }
      const data = await res.json();
      setReports((prev) => (prev ?? []).map((r) => (r.id === data.report.id ? data.report : r)));
      toast.success("Rapport passé en relecture");
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setReviewingId(null);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
    setEditingId(null);
  }

  function openEditContent(r: Report) {
    setEditingId(r.id);
    setEditContent(r.content);
    setExpandedId(r.id);
  }

  async function handleSaveContent(id: string) {
    if (!editContent.trim()) {
      toast.error("Le contenu ne peut pas être vide.");
      return;
    }
    setSavingContent(true);
    try {
      const res = await fetchWithAuth(`/api/strategic-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) {
        toast.error("Impossible d'enregistrer les modifications.");
        return;
      }
      const data = await res.json();
      setReports((prev) => (prev ?? []).map((r) => (r.id === data.report.id ? data.report : r)));
      toast.success("Rapport modifié");
      setEditingId(null);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingContent(false);
    }
  }

  return (
    <div className="nova-page">
      <Breadcrumb items={[{ label: "Copilote", href: "/dashboard/copilote" }, { label: "Rapport stratégique" }]} />

      <header className="nova-page-header">
        <h1>Rapport stratégique</h1>
      </header>

      <div className="nova-notice">
        Ces rapports sont générés par Nova et doivent être relus par un professionnel avant d'être partagés.
      </div>

      <Card>
        <CardTitle>Générer un rapport</CardTitle>
        <form onSubmit={handleGenerate} className="nova-quick-add">
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="Période (ex. 2026-T3)"
            aria-label="Période"
          />
          <button type="submit" className="nova-btn nova-btn-primary" disabled={generating || !period.trim()}>
            {generating ? "Génération..." : "Générer le rapport"}
          </button>
        </form>
      </Card>

      {reports === null ? null : reports.length === 0 ? (
        <EmptyState
          icon="copilote"
          title="Aucun rapport pour l'instant"
          description="Générez votre premier rapport de synthèse ci-dessus."
        />
      ) : (
        <ul className="nova-report-list">
          {reports.map((r) => {
            const expanded = expandedId === r.id;
            const editing = editingId === r.id;
            return (
              <li key={r.id} className="nova-report-item">
                <div className="nova-report-row">
                  <div className="nova-report-info">
                    <div className="nova-report-period">{r.period}</div>
                    <Timestamp date={r.createdAt} />
                  </div>
                  <Badge tone={STATUS_TONE[r.status] || "neutral"}>{STATUS_LABEL[r.status] || r.status}</Badge>
                  <Button variant="secondary" onClick={() => toggleExpand(r.id)}>
                    {expanded ? <ChevronUp size={14} strokeWidth={1.75} /> : <ChevronDown size={14} strokeWidth={1.75} />}
                    {expanded ? "Masquer" : "Voir le rapport"}
                  </Button>
                  <a href={`/api/strategic-reports/${r.id}/pdf`} className="nova-btn nova-btn-secondary">
                    <Download size={14} strokeWidth={1.75} />
                    Télécharger PDF
                  </a>
                  {r.status === "brouillon" && (
                    <button
                      type="button"
                      className="nova-btn nova-btn-secondary"
                      onClick={() => handleReview(r.id)}
                      disabled={reviewingId === r.id}
                    >
                      {reviewingId === r.id ? "Mise à jour..." : "Passer en relecture"}
                    </button>
                  )}
                </div>

                {expanded && (
                  <div className="nova-report-expanded">
                    {r.status === "en_relecture" && (
                      <div className="nova-notice">Ce rapport attend une relecture humaine avant d'être partagé.</div>
                    )}
                    {r.reviewedBy && (
                      <p className="nova-page-subtitle" style={{ margin: 0 }}>
                        Relu par {r.reviewedBy}
                      </p>
                    )}
                    {editing ? (
                      <>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={12}
                          className="nova-report-edit-textarea"
                        />
                        <div className="nova-modal-actions" style={{ justifyContent: "flex-start" }}>
                          <Button onClick={() => handleSaveContent(r.id)} disabled={savingContent}>
                            {savingContent ? "Enregistrement..." : "Enregistrer"}
                          </Button>
                          <Button variant="secondary" onClick={() => setEditingId(null)}>
                            Annuler
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="nova-card-text">{r.content}</p>
                        <Button variant="secondary" onClick={() => openEditContent(r)}>
                          <Pencil size={14} strokeWidth={1.75} />
                          Modifier
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
