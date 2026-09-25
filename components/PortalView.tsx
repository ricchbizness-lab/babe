"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Mail } from "lucide-react";
import { Badge, ProgressBar, Timestamp, initialsFromName } from "@/components/ui";
import type { PortalData } from "@/lib/portal";

const STATUS_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};
const STATUS_DESCRIPTION: Record<string, string> = {
  planifie: "Votre chantier est planifié.",
  en_cours: "Vos travaux sont en cours.",
  termine: "Vos travaux sont terminés.",
  annule: "Ce chantier a été annulé.",
};
const STATUS_TONE: Record<string, "neutral" | "blue" | "success"> = {
  planifie: "neutral",
  en_cours: "blue",
  termine: "success",
  annule: "neutral",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  en_attente: "En attente",
  payee: "Payé",
  en_retard: "En retard",
};
const PAYMENT_STATUS_TONE: Record<string, "amber" | "success" | "danger"> = {
  en_attente: "amber",
  payee: "success",
  en_retard: "danger",
};

const ACOMPTE_STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente",
  recu: "Reçu",
  annule: "Annulé",
};
const ACOMPTE_STATUT_TONE: Record<string, "amber" | "success" | "neutral"> = {
  en_attente: "amber",
  recu: "success",
  annule: "neutral",
};

type Task = PortalData["tasks"][number];

/**
 * Le modèle Task n'a qu'un booléen `done`, pas de statut "en cours" — on
 * déduit le groupe d'affichage à partir de l'échéance : sans échéance ou
 * échéance dépassée/aujourd'hui, la tâche est présumée en cours ; une
 * échéance future la classe "à venir".
 */
function groupTasks(tasks: Task[]) {
  const done: Task[] = [];
  const enCours: Task[] = [];
  const aVenir: Task[] = [];
  const now = new Date();
  for (const t of tasks) {
    if (t.done) {
      done.push(t);
      continue;
    }
    if (t.dueDate && t.dueDate.getTime() > now.getTime()) {
      aVenir.push(t);
    } else {
      enCours.push(t);
    }
  }
  return { done, enCours, aVenir };
}

function TaskItem({ task, icon }: { task: Task; icon: ReactNode }) {
  return (
    <li className={task.done ? "nova-portal-task-done" : ""}>
      {icon}
      <span>{task.text}</span>
    </li>
  );
}

/**
 * Rendu pur du portail client — séparé de app/portail/[token]/page.tsx pour
 * que la récupération des données (Prisma) et l'affichage soient
 * indépendants l'un de l'autre.
 */
export function PortalView({ project, token }: { project: PortalData; token: string }) {
  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((t) => t.done).length;
  const avancement = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const { done, enCours, aVenir } = groupTasks(project.tasks);

  const acomptesRecus = project.devis?.acomptes ?? [];

  const contactSubject = encodeURIComponent(`Suivi de chantier — ${project.name}`);
  const contactHref = `mailto:${project.business.email}?subject=${contactSubject}`;

  return (
    <div className="nova-portal">
      <div className="nova-portal-card">
        <header className="nova-portal-header">
          {project.business.logoBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.business.logoBase64} alt={project.business.name} className="nova-portal-logo" />
          ) : (
            <div className="nova-portal-logo nova-portal-logo-fallback">{initialsFromName(project.business.name)}</div>
          )}
          <div>
            <div className="nova-portal-business">{project.business.name}</div>
            <div className="nova-portal-tagline">Suivi de votre chantier</div>
          </div>
        </header>

        <h1 className="nova-portal-project">{project.name}</h1>

        <div className="nova-portal-status">
          <Badge tone={STATUS_TONE[project.status] || "neutral"}>{STATUS_LABEL[project.status] || project.status}</Badge>
          <p className="nova-portal-status-desc">{STATUS_DESCRIPTION[project.status] || ""}</p>
        </div>

        {totalTasks > 0 && (
          <section className="nova-portal-section">
            <h2>Avancement</h2>
            <ProgressBar value={avancement} label={`${avancement}%`} />
          </section>
        )}

        <section className="nova-portal-section">
          <h2>Tâches</h2>
          {totalTasks === 0 ? (
            <p className="nova-portal-empty">Aucune tâche renseignée pour le moment.</p>
          ) : (
            <div className="nova-portal-task-groups">
              {done.length > 0 && (
                <div>
                  <h3 className="nova-portal-task-group-title">Terminées</h3>
                  <ul className="nova-portal-tasks">
                    {done.map((t) => (
                      <TaskItem key={t.id} task={t} icon={<CheckCircle2 size={20} strokeWidth={1.75} />} />
                    ))}
                  </ul>
                </div>
              )}
              {enCours.length > 0 && (
                <div>
                  <h3 className="nova-portal-task-group-title">En cours</h3>
                  <ul className="nova-portal-tasks">
                    {enCours.map((t) => (
                      <TaskItem key={t.id} task={t} icon={<Circle size={20} strokeWidth={1.75} />} />
                    ))}
                  </ul>
                </div>
              )}
              {aVenir.length > 0 && (
                <div>
                  <h3 className="nova-portal-task-group-title">À venir</h3>
                  <ul className="nova-portal-tasks">
                    {aVenir.map((t) => (
                      <TaskItem key={t.id} task={t} icon={<Circle size={20} strokeWidth={1.75} />} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {project.devis && (
          <section className="nova-portal-section">
            <h2>Votre devis</h2>
            <div className="nova-portal-devis-card">
              <div className="nova-portal-devis-row">
                <span>Montant TTC</span>
                <strong>{project.devis.montantTTC.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</strong>
              </div>
              <div className="nova-portal-devis-row">
                <span>Statut de paiement</span>
                <Badge tone={PAYMENT_STATUS_TONE[project.devis.paymentStatus] || "amber"}>
                  {PAYMENT_STATUS_LABEL[project.devis.paymentStatus] || project.devis.paymentStatus}
                </Badge>
              </div>
              <Link href={`/portail/${token}/devis`} className="nova-btn nova-btn-secondary nova-portal-devis-link">
                Télécharger le devis PDF
              </Link>
            </div>
          </section>
        )}

        {acomptesRecus.length > 0 && (
          <section className="nova-portal-section">
            <h2>Acomptes</h2>
            <ul className="nova-portal-acomptes">
              {acomptesRecus.map((a) => (
                <li key={a.id} className="nova-portal-acompte">
                  <div className="nova-portal-acompte-row">
                    <span>Acompte {a.pourcentage}%</span>
                    <Badge tone={ACOMPTE_STATUT_TONE[a.statut] || "neutral"}>
                      {ACOMPTE_STATUT_LABEL[a.statut] || a.statut}
                    </Badge>
                  </div>
                  <strong>{a.montantHT.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} € HT</strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        {project.photos.length > 0 && (
          <section className="nova-portal-section">
            <h2>Photos du chantier</h2>
            <div className="nova-portal-photos">
              {project.photos.map((p) => (
                <figure key={p.id} className="nova-portal-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageBase64} alt={p.caption || "Photo du chantier"} />
                  {p.caption && <figcaption>{p.caption}</figcaption>}
                  <span className="nova-portal-photo-date">
                    <Timestamp date={p.createdAt} />
                  </span>
                </figure>
              ))}
            </div>
          </section>
        )}

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

        <a href={contactHref} className="nova-btn nova-btn-primary nova-portal-contact-btn">
          <Mail size={18} strokeWidth={1.75} />
          Nous contacter
        </a>
      </div>
      <footer className="nova-portal-footer">Propulsé par Nova</footer>
    </div>
  );
}
