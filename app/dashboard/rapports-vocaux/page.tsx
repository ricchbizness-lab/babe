"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic, Trash2 } from "lucide-react";
import { ConfirmModal, EmptyState, Table, TableSkeleton, Timestamp, useToast, type TableColumn } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type ReportRow = {
  id: string;
  authorLabel: string;
  summary: string;
  createdAt: string;
  project: { id: string; name: string } | null;
};

export default function RapportsVocauxPage() {
  const router = useRouter();
  const toast = useToast();
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReportRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchWithAuth("/api/voice-reports")
      .then((res) => res.json())
      .then((data) => setReports(data.reports ?? []));
  }, []);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/voice-reports/${deleteTarget.id}`, { method: "DELETE" });
      setDeleting(false);
      if (res.ok) {
        setReports((prev) => (prev ?? []).filter((r) => r.id !== deleteTarget.id));
        toast.success("Rapport supprimé");
        router.refresh();
      } else {
        toast.error("Erreur lors de la suppression du rapport.");
      }
    } catch {
      setDeleting(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteTarget(null);
  }

  const columns: TableColumn<ReportRow>[] = [
    { key: "authorLabel", label: "Auteur" },
    {
      key: "project",
      label: "Chantier",
      render: (r) =>
        r.project ? (
          <Link href={`/dashboard/chantiers/${r.project.id}`} className="nova-inline-link">
            {r.project.name}
          </Link>
        ) : (
          "—"
        ),
    },
    { key: "summary", label: "Résumé", render: (r) => <span className="nova-truncate">{r.summary}</span> },
    { key: "createdAt", label: "Le", render: (r) => <Timestamp date={r.createdAt} /> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          className="nova-icon-btn"
          onClick={() => setDeleteTarget(r)}
          aria-label={`Supprimer le rapport de ${r.authorLabel}`}
        >
          <Trash2 size={15} strokeWidth={1.75} />
        </button>
      ),
    },
  ];

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Rapports vocaux</h1>
          <p className="nova-page-subtitle">
            {reports === null ? "…" : `${reports.length} rapport${reports.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/dashboard/rapports-vocaux/nouveau" className="nova-btn nova-btn-primary">
          <Mic size={16} strokeWidth={1.75} />
          Nouveau rapport
        </Link>
      </header>

      {reports === null ? (
        <TableSkeleton columns={4} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon="rapports-vocaux"
          title="Aucun rapport vocal pour l'instant"
          description="Les comptes rendus terrain de vos équipes apparaîtront ici, résumés automatiquement."
          actionLabel="Ajouter un rapport"
          actionHref="/dashboard/rapports-vocaux/nouveau"
        />
      ) : (
        <Table columns={columns} rows={reports} />
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        itemLabel={deleteTarget ? `le rapport de ${deleteTarget.authorLabel}` : ""}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
