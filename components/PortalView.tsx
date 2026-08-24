import { CheckCircle2, Circle } from "lucide-react";
import { Badge, Timestamp } from "@/components/ui";
import type { PortalData } from "@/lib/portal";

const STATUS_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};
const STATUS_TONE: Record<string, "neutral" | "teal" | "blue" | "success" | "danger"> = {
  planifie: "neutral",
  en_cours: "blue",
  termine: "success",
  annule: "neutral",
};

/**
 * Rendu pur du portail client — séparé de app/portail/[token]/page.tsx pour
 * que la récupération des données (Prisma) et l'affichage soient
 * indépendants l'un de l'autre.
 */
export function PortalView({ project }: { project: PortalData }) {
  return (
    <div className="nova-portal">
      <div className="nova-portal-card">
        <div className="nova-portal-business">{project.business.name}</div>
        <h1 className="nova-portal-project">{project.name}</h1>
        <div className="nova-portal-status">
          <Badge tone={STATUS_TONE[project.status] || "neutral"}>{STATUS_LABEL[project.status] || project.status}</Badge>
        </div>

        <section className="nova-portal-section">
          <h2>Tâches</h2>
          {project.tasks.length === 0 ? (
            <p className="nova-portal-empty">Aucune tâche renseignée pour le moment.</p>
          ) : (
            <ul className="nova-portal-tasks">
              {project.tasks.map((t) => (
                <li key={t.id} className={t.done ? "nova-portal-task-done" : ""}>
                  {t.done ? <CheckCircle2 size={20} strokeWidth={1.75} /> : <Circle size={20} strokeWidth={1.75} />}
                  <span>{t.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="nova-portal-section">
          <h2>Suivi terrain</h2>
          {project.voiceReports.length === 0 ? (
            <p className="nova-portal-empty">Aucun rapport pour le moment.</p>
          ) : (
            <div className="nova-portal-reports">
              {project.voiceReports.map((r) => (
                <div key={r.id} className="nova-portal-report">
                  <div className="nova-portal-report-meta">
                    {r.authorLabel} · <Timestamp date={r.createdAt} />
                  </div>
                  <p>{r.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <footer className="nova-portal-footer">Suivi de chantier par Nova</footer>
    </div>
  );
}
