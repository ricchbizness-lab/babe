"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import {
  Bot,
  Building2,
  CheckSquare,
  FileText,
  LayoutDashboard,
  Mic,
  Settings,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Registre d'icônes — les modules appelants passent une clé (string), jamais
 * un composant importé de lucide-react directement. Un composant serveur
 * (ex. app/dashboard/page.tsx) ne peut pas transmettre une référence de
 * fonction à un Client Component ("use client" plus bas dans ce fichier) :
 * React Server Components ne sait pas sérialiser ça. Passer par une clé
 * résolue ici évite le problème pour tous les modules futurs.
 */
const ICONS = {
  dashboard: LayoutDashboard,
  crm: Users,
  chantiers: Building2,
  devis: FileText,
  taches: CheckSquare,
  "rapports-vocaux": Mic,
  copilote: Bot,
  parametres: Settings,
  "user-plus": UserPlus,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;

/**
 * Design system NOVA v7 — composants réutilisables partagés par tous les
 * modules de la plateforme (boutons, cartes, champs, badges, tables,
 * sidebar). Un seul fichier volontairement : tout module futur importe
 * d'ici plutôt que de redéfinir son propre style. Les tokens de couleur et
 * de typographie vivent dans app/globals.css (préfixe --nova-*).
 */

// ---------------------------------------------------------------------------
// Bouton
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`nova-btn nova-btn-${variant} ${className}`.trim()} {...props} />;
}

// ---------------------------------------------------------------------------
// Carte — bordure teal en haut par défaut (identité NOVA v7)
// ---------------------------------------------------------------------------

export function Card({
  accent = true,
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { accent?: boolean }) {
  return (
    <div className={`nova-card ${accent ? "nova-card-accent" : ""} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`nova-card-title ${className}`.trim()}>{children}</h2>;
}

// ---------------------------------------------------------------------------
// Champs de formulaire
// ---------------------------------------------------------------------------

type FieldChrome = { label: string; error?: string; hint?: string };

export function Field({
  label,
  error,
  hint,
  ...props
}: FieldChrome & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="nova-field">
      <label>{label}</label>
      <input {...props} />
      {hint && !error && <div className="nova-hint">{hint}</div>}
      {error && <div className="nova-field-error">{error}</div>}
    </div>
  );
}

export function TextareaField({
  label,
  error,
  hint,
  ...props
}: FieldChrome & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="nova-field">
      <label>{label}</label>
      <textarea {...props} />
      {hint && !error && <div className="nova-hint">{hint}</div>}
      {error && <div className="nova-field-error">{error}</div>}
    </div>
  );
}

export function SelectField({
  label,
  error,
  hint,
  children,
  ...props
}: FieldChrome & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className="nova-field">
      <label>{label}</label>
      <select {...props}>{children}</select>
      {hint && !error && <div className="nova-hint">{hint}</div>}
      {error && <div className="nova-field-error">{error}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge — statuts et timestamps, toujours en police mono (IBM Plex Mono)
// ---------------------------------------------------------------------------

type BadgeTone = "neutral" | "teal" | "amber" | "danger";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`nova-badge nova-badge-${tone}`}>{children}</span>;
}

export function Timestamp({ date }: { date: Date | string }) {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return (
    <span className="nova-timestamp">
      {parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Table — un seul endroit pour le style de toutes les listes (CRM, devis...)
// ---------------------------------------------------------------------------

export type TableColumn<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  render?: (row: T) => ReactNode;
};

export function Table<T extends { id: string | number }>({
  columns,
  rows,
  emptyLabel = "Aucune donnée pour le moment.",
}: {
  columns: TableColumn<T>[];
  rows: T[];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <div className="nova-table-empty">{emptyLabel}</div>;
  }
  return (
    <div className="nova-table-wrap">
      <table className="nova-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: col.align || "left" }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key} style={{ textAlign: col.align || "left" }}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricCard — bandeau de métriques en haut du dashboard
// ---------------------------------------------------------------------------

export function MetricCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const content = (
    <div className="nova-metric">
      <div className="nova-metric-value">{value}</div>
      <div className="nova-metric-label">{label}</div>
    </div>
  );
  return href ? (
    <Link href={href} className="nova-metric-link">
      {content}
    </Link>
  ) : (
    content
  );
}

// ---------------------------------------------------------------------------
// QuickAction — accès rapide aux actions fréquentes
// ---------------------------------------------------------------------------

export function QuickAction({ label, href, icon }: { label: string; href: string; icon: IconKey }) {
  const Icon = ICONS[icon];
  return (
    <Link href={href} className="nova-quick-action">
      <Icon size={18} strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Sidebar — navigation fixe de la plateforme
// ---------------------------------------------------------------------------

const NAV_ITEMS: { href: string; label: string; icon: IconKey }[] = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: "dashboard" },
  { href: "/dashboard/clients", label: "CRM", icon: "crm" },
  { href: "/dashboard/chantiers", label: "Chantiers", icon: "chantiers" },
  { href: "/dashboard/devis", label: "Devis", icon: "devis" },
  { href: "/dashboard/taches", label: "Tâches", icon: "taches" },
  { href: "/dashboard/rapports-vocaux", label: "Rapports vocaux", icon: "rapports-vocaux" },
  { href: "/dashboard/copilote", label: "Copilote", icon: "copilote" },
  { href: "/dashboard/parametres", label: "Paramètres", icon: "parametres" },
];

export function Sidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  return (
    <aside className="nova-sidebar">
      <div className="nova-sidebar-logo">
        <span className="nova-sidebar-logo-mark">N</span>
        <span>NOVA</span>
      </div>
      <nav className="nova-sidebar-nav">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const Icon = ICONS[icon];
          const active = href === "/dashboard" ? pathname === href : pathname?.startsWith(href);
          return (
            <Link key={href} href={href} className={`nova-sidebar-link ${active ? "nova-sidebar-link-active" : ""}`}>
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="nova-sidebar-business">{businessName}</div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Skeletons — jamais afficher 0 ou vide pendant le chargement des données
// ---------------------------------------------------------------------------

export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`nova-skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}

export function MetricsBandSkeleton() {
  return (
    <div className="nova-metrics-band" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="nova-metric" key={i}>
          <Skeleton style={{ width: 48, height: 28, marginBottom: 8 }} />
          <Skeleton style={{ width: 88, height: 12 }} />
        </div>
      ))}
    </div>
  );
}

export function AnalyseNovaSkeleton() {
  return (
    <Card aria-hidden="true">
      <Skeleton style={{ width: 140, height: 16, marginBottom: 16 }} />
      <Skeleton style={{ width: "70%", height: 12, marginBottom: 24 }} />
      <div className="nova-analyse-grid">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton style={{ width: 80, height: 22, marginBottom: 8 }} />
            <Skeleton style={{ width: 120, height: 12 }} />
          </div>
        ))}
      </div>
    </Card>
  );
}
