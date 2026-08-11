"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackLink, Badge, Card, CardTitle, Table, TableSkeleton, Timestamp, type TableColumn } from "@/components/ui";

type ChantierDetail = {
  id: string;
  name: string;
  address: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  client: { id: string; name: string } | null;
  tasks: { id: string; text: string; done: boolean; createdAt: string }[];
  voiceReports: { id: string; authorLabel: string; summary: string; createdAt: string }[];
};

const STATUS_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};
const STATUS_TONE: Record<string, "neutral" | "teal" | "success" | "danger"> = {
  planifie: "neutral",
  en_cours: "teal",
  termine: "success",
  annule: "danger",
};

export default function ChantierDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<ChantierDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${params.id}`).then(async (res) => {
      if (!res.ok) {
        setError("Chantier introuvable.");
        return;
      }
      const data = await res.json();
      setProject(data.project);
    });
  }, [params.id]);

  if (error) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/chantiers" label="Retour aux chantiers" />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/chantiers" label="Retour aux chantiers" />
        <TableSkeleton columns={3} rows={3} />
      </div>
    );
  }

  const taskColumns: TableColumn<ChantierDetail["tasks"][number]>[] = [
    { key: "text", label: "Tâche" },
    {
      key: "done",
      label: "Statut",
      render: (t) => <Badge tone={t.done ? "success" : "neutral"}>{t.done ? "Faite" : "À faire"}</Badge>,
    },
    { key: "createdAt", label: "Créé le", render: (t) => <Timestamp date={t.createdAt} /> },
  ];

  const reportColumns: TableColumn<ChantierDetail["voiceReports"][number]>[] = [
    { key: "authorLabel", label: "Auteur" },
    { key: "summary", label: "Résumé", render: (r) => <span className="nova-truncate">{r.summary}</span> },
    { key: "createdAt", label: "Le", render: (r) => <Timestamp date={r.createdAt} /> },
  ];

  return (
    <div className="nova-page">
      <BackLink href="/dashboard/chantiers" label="Retour aux chantiers" />

      <header className="nova-page-header-row">
        <div>
          <h1>{project.name}</h1>
          <p className="nova-page-subtitle">
            {project.client ? (
              <Link href={`/dashboard/clients/${project.client.id}`} className="nova-inline-link">
                {project.client.name}
              </Link>
            ) : (
              "Sans client rattaché"
            )}
          </p>
        </div>
        <Badge tone={STATUS_TONE[project.status] || "neutral"}>{STATUS_LABEL[project.status] || project.status}</Badge>
      </header>

      <Card>
        <CardTitle>Détails</CardTitle>
        <dl className="nova-detail-list">
          <div>
            <dt>Adresse</dt>
            <dd>{project.address || "—"}</dd>
          </div>
          <div>
            <dt>Début</dt>
            <dd>{project.startDate ? new Date(project.startDate).toLocaleDateString("fr-FR") : "—"}</dd>
          </div>
          <div>
            <dt>Fin</dt>
            <dd>{project.endDate ? new Date(project.endDate).toLocaleDateString("fr-FR") : "—"}</dd>
          </div>
        </dl>
      </Card>

      <section>
        <h2 className="nova-section-title">Tâches ({project.tasks.length})</h2>
        <Table columns={taskColumns} rows={project.tasks} emptyLabel="Aucune tâche rattachée à ce chantier." />
      </section>

      <section>
        <h2 className="nova-section-title">Rapports vocaux ({project.voiceReports.length})</h2>
        <Table columns={reportColumns} rows={project.voiceReports} emptyLabel="Aucun rapport vocal rattaché à ce chantier." />
      </section>
    </div>
  );
}
