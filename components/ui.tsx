"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  ArrowLeft,
  Banknote,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Contact,
  FileBarChart,
  FileSignature,
  FileText,
  Info,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Mic,
  Phone,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  UserCog,
  UserPlus,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { addMonths, monthGrid, toDateKey } from "@/lib/dates";
import { relanceLevel } from "@/lib/relance";
import { SESSION_EXPIRED_EVENT } from "@/lib/fetchClient";

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
  facturation: Banknote,
  planning: CalendarDays,
  dispatch: UserCog,
  taches: CheckSquare,
  equipe: Contact,
  "rapports-vocaux": Mic,
  copilote: Bot,
  rapport: FileBarChart,
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

type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "danger";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`nova-btn nova-btn-${variant} ${className}`.trim()} {...props} />;
}

export function BackLink({ href, label = "Retour" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="nova-back-link">
      <ArrowLeft size={16} strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumb — fil d'Ariane pour les pages de détail et de création
// ---------------------------------------------------------------------------

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="nova-breadcrumb" aria-label="Fil d'Ariane">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="nova-breadcrumb-item">
            {item.href ? (
              <Link href={item.href} className="nova-breadcrumb-link">
                {item.label}
              </Link>
            ) : (
              <span className="nova-breadcrumb-current" aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight size={13} strokeWidth={1.75} className="nova-breadcrumb-sep" aria-hidden="true" />}
          </span>
        );
      })}
    </nav>
  );
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
// EmptyState — état vide soigné pour les listes sans données
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon?: IconKey;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  const Icon = icon ? ICONS[icon] : undefined;
  return (
    <div className="nova-empty-state">
      {Icon && <Icon size={28} strokeWidth={1.5} className="nova-empty-state-icon" />}
      <p className="nova-empty-state-title">{title}</p>
      {description && <p className="nova-empty-state-description">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="nova-btn nova-btn-primary">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfirmModal — confirmation obligatoire avant toute suppression
// ---------------------------------------------------------------------------

export function ConfirmModal({
  open,
  itemLabel,
  onConfirm,
  onCancel,
  confirming = false,
}: {
  open: boolean;
  itemLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="nova-modal-overlay" onClick={onCancel}>
      <div className="nova-modal" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <p className="nova-modal-message">Supprimer {itemLabel} ? Cette action est irréversible.</p>
        <div className="nova-modal-actions">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={confirming}>
            Annuler
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={confirming}>
            {confirming ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditModal — modale générique de modification (réutilise le chrome de ConfirmModal)
// ---------------------------------------------------------------------------

export function EditModal({
  open,
  title,
  onCancel,
  onSave,
  saving = false,
  children,
}: {
  open: boolean;
  title: string;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="nova-modal-overlay" onClick={onCancel}>
      <div
        className="nova-modal nova-modal-edit"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="nova-modal-title">{title}</h3>
        {children}
        <div className="nova-modal-actions">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toasts — feedback global de succès/erreur, empilés en bas à droite
// ---------------------------------------------------------------------------

type ToastVariant = "success" | "error" | "info";
type ToastItem = { id: number; message: string; variant: ToastVariant; leaving: boolean };
type ToastAPI = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastAPI | null>(null);
const TOAST_DURATION = 3000;
const TOAST_EXIT_DURATION = 200;

let toastIdSeq = 0;

const TOAST_ICON: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_EXIT_DURATION);
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = ++toastIdSeq;
      setToasts((prev) => [...prev, { id, message, variant, leaving: false }]);
      setTimeout(() => dismiss(id), TOAST_DURATION);
    },
    [dismiss]
  );

  const api = useMemo<ToastAPI>(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
      info: (message: string) => push("info", message),
    }),
    [push]
  );

  useEffect(() => {
    function handleSessionExpired() {
      push("error", "Votre session a expirée, reconnectez-vous.");
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé à l'intérieur d'un ToastProvider.");
  return ctx;
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="nova-toast-container">
      {toasts.map((t) => (
        <Toast key={t.id} variant={t.variant} message={t.message} leaving={t.leaving} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

export function Toast({
  variant,
  message,
  leaving = false,
  onDismiss,
}: {
  variant: ToastVariant;
  message: string;
  leaving?: boolean;
  onDismiss: () => void;
}) {
  const Icon = TOAST_ICON[variant];
  return (
    <div className={`nova-toast nova-toast-${variant} ${leaving ? "nova-toast-leaving" : ""}`.trim()} role="status">
      <Icon size={16} strokeWidth={1.75} />
      <span className="nova-toast-message">{message}</span>
      <button type="button" className="nova-toast-close" onClick={onDismiss} aria-label="Fermer">
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavigationProgress — barre fine en haut de page pendant la navigation.
// L'App Router n'expose aucun événement public de "début de navigation" :
// on la déclenche donc au clic sur un lien interne, et on la complète dès
// que pathname/searchParams changent (preuve que la nouvelle route a fini
// de se rendre).
// ---------------------------------------------------------------------------

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParamsString = useSearchParams().toString();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const currentUrl = pathname + (searchParamsString ? `?${searchParamsString}` : "");
      if (href === currentUrl) return;

      if (intervalRef.current) clearInterval(intervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      setVisible(true);
      setProgress(8);
      intervalRef.current = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + Math.random() * 10));
      }, 200);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname, searchParamsString]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress((p) => (p > 0 ? 100 : 0));
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 200);
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParamsString]);

  return (
    <div
      className={`nova-nav-progress ${visible ? "nova-nav-progress-active" : ""}`}
      style={{ width: `${progress}%` }}
      aria-hidden="true"
    />
  );
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

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatDateDisplay(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMonthYear(date: Date): string {
  const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function DatePickerField({
  label,
  value,
  onChange,
  hint,
  error,
}: FieldChrome & {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = value ? new Date(`${value}T00:00:00`) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const todayKey = toDateKey(new Date());

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function openPicker() {
    const d = value ? new Date(`${value}T00:00:00`) : new Date();
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setOpen((o) => !o);
  }

  return (
    <div className="nova-field" ref={containerRef}>
      <label>{label}</label>
      <div className="nova-datepicker">
        <button
          type="button"
          className="nova-datepicker-trigger"
          onClick={openPicker}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={value ? "" : "nova-datepicker-placeholder"}>
            {value ? formatDateDisplay(value) : "jj/mm/aaaa"}
          </span>
          <CalendarDays size={16} strokeWidth={1.75} />
        </button>
        {open && (
          <div className="nova-datepicker-panel" role="dialog" aria-label={label}>
            <div className="nova-datepicker-header">
              <button
                type="button"
                className="nova-datepicker-nav"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
                aria-label="Mois précédent"
              >
                <ChevronLeft size={16} strokeWidth={1.75} />
              </button>
              <span className="nova-datepicker-month">{formatMonthYear(viewMonth)}</span>
              <button
                type="button"
                className="nova-datepicker-nav"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                aria-label="Mois suivant"
              >
                <ChevronRight size={16} strokeWidth={1.75} />
              </button>
            </div>
            <div className="nova-datepicker-weekdays">
              {WEEKDAY_LABELS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="nova-datepicker-grid">
              {monthGrid(viewMonth).map(({ date, inMonth }) => {
                const dateKey = toDateKey(date);
                const selected = dateKey === value;
                const isToday = dateKey === todayKey;
                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={[
                      "nova-datepicker-day",
                      inMonth ? "" : "nova-datepicker-day-muted",
                      selected ? "nova-datepicker-day-selected" : "",
                      isToday && !selected ? "nova-datepicker-day-today" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      onChange(dateKey);
                      setOpen(false);
                    }}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {hint && !error && <div className="nova-hint">{hint}</div>}
      {error && <div className="nova-field-error">{error}</div>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Rechercher...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="nova-search">
      <Search size={16} strokeWidth={1.75} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge — statuts et timestamps, toujours en police mono (IBM Plex Mono)
// ---------------------------------------------------------------------------

type BadgeTone = "neutral" | "teal" | "amber" | "success" | "danger";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`nova-badge nova-badge-${tone}`}>{children}</span>;
}

export function RelanceIndicator({ status, updatedAt }: { status: string; updatedAt: string }) {
  const { days, level } = relanceLevel(status, updatedAt);
  if (level === "none") return null;
  return (
    <span className={level === "danger" ? "nova-relance nova-relance-danger" : "nova-relance nova-relance-orange"}>
      {level === "danger" && <AlertTriangle size={13} strokeWidth={2} />}
      Envoyé il y a {days} jours
    </span>
  );
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
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
};

type SortState = { key: string; direction: "asc" | "desc" };

export function Table<T extends { id: string | number }>({
  columns,
  rows,
  emptyLabel = "Aucune donnée pour le moment.",
  getRowHref,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  emptyLabel?: string;
  getRowHref?: (row: T) => string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const getValue = (row: T): string | number | null | undefined =>
      col.sortValue ? col.sortValue(row) : ((row as Record<string, unknown>)[col.key] as string | number | null | undefined);
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "fr", { sensitivity: "base" }) * dir;
    });
  }, [rows, sort, columns]);

  if (rows.length === 0) {
    return <div className="nova-table-empty">{emptyLabel}</div>;
  }

  function toggleSort(col: TableColumn<T>) {
    if (!col.sortable) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, direction: "asc" };
      if (prev.direction === "asc") return { key: col.key, direction: "desc" };
      return null;
    });
  }

  return (
    <div className="nova-table-wrap">
      <table className="nova-table">
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th key={col.key} style={{ textAlign: col.align || "left" }}>
                  {col.sortable ? (
                    <button
                      type="button"
                      className={`nova-table-sort-btn ${active ? "nova-table-sort-btn-active" : ""}`}
                      onClick={() => toggleSort(col)}
                    >
                      {col.label}
                      {active ? (
                        sort?.direction === "asc" ? (
                          <ChevronUp size={13} strokeWidth={2} />
                        ) : (
                          <ChevronDown size={13} strokeWidth={2} />
                        )
                      ) : null}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={row.id}
              className={getRowHref ? "nova-table-row-clickable" : ""}
              onClick={getRowHref ? () => router.push(getRowHref(row)) : undefined}
            >
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

export function TableSkeleton({ columns = 4, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="nova-table-wrap" aria-hidden="true">
      <table className="nova-table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((__, c) => (
                <td key={c}>
                  <Skeleton style={{ width: c === 0 ? "60%" : "40%", height: 14 }} />
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
  { href: "/dashboard/clients", label: "Clients", icon: "crm" },
  { href: "/dashboard/devis", label: "Devis", icon: "devis" },
  { href: "/dashboard/chantiers", label: "Chantiers", icon: "chantiers" },
  { href: "/dashboard/facturation", label: "Facturation", icon: "facturation" },
  { href: "/dashboard/taches", label: "Tâches", icon: "taches" },
  { href: "/dashboard/equipe", label: "Équipe", icon: "equipe" },
  { href: "/dashboard/planning", label: "Planning", icon: "planning" },
  { href: "/dashboard/planning/dispatch", label: "Dispatch équipe", icon: "dispatch" },
  { href: "/dashboard/rapports-vocaux", label: "Rapports vocaux", icon: "rapports-vocaux" },
  { href: "/dashboard/copilote", label: "Copilote", icon: "copilote" },
  { href: "/dashboard/copilote/rapport", label: "Rapport stratégique", icon: "rapport" },
  { href: "/dashboard/parametres", label: "Paramètres", icon: "parametres" },
];

/**
 * Fonctionnalités hors scope de la phase en cours (voir CLAUDE.md /
 * consigne du porteur de projet) — jamais cliquables, jamais de route
 * derrière. Uniquement là pour montrer la direction du produit.
 */
const SOON_ITEMS: { label: string; icon: LucideIcon }[] = [
  { label: "Facturation électronique conforme", icon: Receipt },
  { label: "E-signature de devis", icon: FileSignature },
  { label: "Système téléphonique intégré", icon: Phone },
  { label: "WhatsApp Business", icon: MessageCircle },
  { label: "GPS tracking équipe", icon: MapPin },
  { label: "Synchronisation comptable", icon: RefreshCw },
];

export function Sidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  // Plusieurs hrefs peuvent être des préfixes les uns des autres (ex.
  // /dashboard/planning et /dashboard/planning/dispatch) — ne marquer actif
  // que le lien le plus spécifique, jamais les deux à la fois.
  const activeHref = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) =>
      item.href === "/dashboard" ? pathname === item.href : pathname === item.href || pathname?.startsWith(`${item.href}/`)
    )?.href;
  return (
    <aside className="nova-sidebar">
      <div className="nova-sidebar-logo">
        <span className="nova-sidebar-logo-mark">N</span>
        <span>NOVA</span>
      </div>
      <div className="nova-sidebar-scroll">
        <nav className="nova-sidebar-nav">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const Icon = ICONS[icon];
            const active = href === activeHref;
            return (
              <Link key={href} href={href} className={`nova-sidebar-link ${active ? "nova-sidebar-link-active" : ""}`}>
                <Icon size={18} strokeWidth={1.75} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="nova-sidebar-soon-title">Bientôt disponible</div>
        <div className="nova-sidebar-soon">
          {SOON_ITEMS.map(({ label, icon: Icon }) => (
            <div key={label} className="nova-sidebar-soon-item">
              <Icon size={16} strokeWidth={1.75} />
              <div className="nova-sidebar-soon-item-text">
                <span className="nova-sidebar-soon-item-label">{label}</span>
                <Badge tone="neutral">Prochainement</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
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
