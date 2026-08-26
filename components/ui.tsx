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
  HelpCircle,
  Info,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Phone,
  Plus,
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
import { addDays, addMonths, monthGrid, startOfWeek, toDateKey } from "@/lib/dates";
import { relanceLevel } from "@/lib/relance";
import { SESSION_EXPIRED_EVENT, fetchWithAuth } from "@/lib/fetchClient";

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
      {Icon && <Icon size={48} strokeWidth={1.5} className="nova-empty-state-icon" />}
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

export type BadgeTone = "neutral" | "teal" | "blue" | "amber" | "success" | "danger";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`nova-badge nova-badge-${tone}`}>
      <span className="nova-badge-dot" aria-hidden="true">
        •
      </span>
      {children}
    </span>
  );
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
// Avatar — initiales dans un cercle teal, réutilisé partout (clients,
// équipe, chantiers, planning) à la place d'un texte simple.
// ---------------------------------------------------------------------------

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Couleur stable générée depuis un nom — utilisée pour les blocs du planning (une couleur par collaborateur, sans configuration). */
export function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 40%)`;
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="nova-avatar"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)) }}
      aria-hidden="true"
    >
      {initialsFromName(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 3, size = 24 }: { names: string[]; max?: number; size?: number }) {
  if (names.length === 0) return <span className="nova-ink-faint">—</span>;
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span className="nova-avatar-stack">
      {shown.map((name, i) => (
        <span key={`${name}-${i}`} className="nova-avatar-stack-item" style={{ zIndex: shown.length - i }} title={name}>
          <Avatar name={name} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span className="nova-avatar-stack-more" style={{ width: size, height: size }}>
          +{extra}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ProgressBar — barre de progression 0-100% (chantiers, tâches)
// ---------------------------------------------------------------------------

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="nova-progress" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className="nova-progress-track">
        <div className="nova-progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      <span className="nova-progress-label">{label ?? `${clamped}%`}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs — onglets horizontaux réutilisés sur les pages liste et fiche
// ---------------------------------------------------------------------------

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="nova-view-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          className={`nova-view-tab ${active === tab.key ? "nova-view-tab-active" : ""}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
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
  emphasis?: "title" | "subtitle" | "amount";
};

type SortState = { key: string; direction: "asc" | "desc" };

export function Table<T extends { id: string | number }>({
  columns,
  rows,
  emptyLabel = "Aucune donnée pour le moment.",
  getRowHref,
  pageSize,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  emptyLabel?: string;
  getRowHref?: (row: T) => string;
  /** Active la pagination interne (triée puis paginée, dans cet ordre). */
  pageSize?: number;
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

  const { page, setPage, totalPages, start, end } = usePagination(sortedRows.length, pageSize || sortedRows.length || 1);
  const pageRows = pageSize ? sortedRows.slice(start, end) : sortedRows;

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
    <>
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
          {pageRows.map((row) => (
            <tr
              key={row.id}
              className={getRowHref ? "nova-table-row-clickable" : ""}
              onClick={getRowHref ? () => router.push(getRowHref(row)) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{ textAlign: col.align || "left" }}
                  className={col.emphasis ? `nova-cell-${col.emphasis}` : undefined}
                >
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {pageSize && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={sortedRows.length}
          start={start}
          end={end}
        />
      )}
    </>
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
// StatCard — cartes de métriques du nouveau tableau de bord (icône pastel)
// ---------------------------------------------------------------------------

type StatTone = "teal" | "amber" | "danger" | "neutral" | "blue" | "orange";

export function StatCard({
  icon,
  tone = "teal",
  value,
  label,
  sublabel,
}: {
  icon: ReactNode;
  tone?: StatTone;
  value: number | string;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="nova-stat-card">
      <span className={`nova-stat-icon nova-stat-icon-${tone}`}>{icon}</span>
      <div className="nova-stat-body">
        <div className="nova-stat-value">{value}</div>
        <div className="nova-stat-label">{label}</div>
        {sublabel && <div className={`nova-stat-sublabel nova-stat-sublabel-${tone}`}>{sublabel}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PriorityBadge — "Urgent" / "Important" / "Aujourd'hui" (À faire)
// ---------------------------------------------------------------------------

export type PriorityLevel = "urgent" | "important" | "today";

const PRIORITY_LABEL: Record<PriorityLevel, string> = {
  urgent: "Urgent",
  important: "Important",
  today: "Aujourd'hui",
};

export function PriorityBadge({ level }: { level: PriorityLevel }) {
  return <span className={`nova-priority-badge nova-priority-${level}`}>{PRIORITY_LABEL[level]}</span>;
}

// ---------------------------------------------------------------------------
// RowActionsMenu — bouton "..." avec menu Voir / Modifier / Supprimer
// ---------------------------------------------------------------------------

export function RowActionsMenu({
  onView,
  onEdit,
  onDelete,
}: {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="nova-row-actions" ref={ref}>
      <button
        type="button"
        className="nova-icon-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Actions"
      >
        <MoreHorizontal size={16} strokeWidth={1.75} />
      </button>
      {open && (
        <div className="nova-row-actions-panel" role="menu" onClick={(e) => e.stopPropagation()}>
          <button type="button" role="menuitem" className="nova-row-actions-item" onClick={() => { setOpen(false); onView(); }}>
            Voir
          </button>
          <button type="button" role="menuitem" className="nova-row-actions-item" onClick={() => { setOpen(false); onEdit(); }}>
            Modifier
          </button>
          <button
            type="button"
            role="menuitem"
            className="nova-row-actions-item nova-row-actions-item-danger"
            onClick={() => { setOpen(false); onDelete(); }}
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricBar — bandeau de métriques compactes en haut d'une page liste
// ---------------------------------------------------------------------------

export function MetricBar({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="nova-metric-bar">
      {items.map((item) => (
        <div className="nova-metric-bar-item" key={item.label}>
          <div className="nova-metric-bar-value">{item.value}</div>
          <div className="nova-metric-bar-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination — pagination côté client pour les listes principales
// ---------------------------------------------------------------------------

export function usePagination(totalItems: number, pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const clampedPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== clampedPage) setPage(clampedPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedPage]);

  const start = (clampedPage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalItems);
  return { page: clampedPage, setPage, totalPages, start, end, pageSize };
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  start,
  end,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  start: number;
  end: number;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="nova-pagination">
      <span className="nova-pagination-summary">
        Affichage de {totalItems === 0 ? 0 : start + 1} à {end} sur {totalItems} élément{totalItems > 1 ? "s" : ""}
      </span>
      <div className="nova-pagination-controls">
        <button
          type="button"
          className="nova-pagination-btn"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={15} strokeWidth={1.75} />
          Précédent
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`nova-pagination-page ${p === page ? "nova-pagination-page-active" : ""}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="nova-pagination-btn"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
          <ChevronRight size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MiniLineChart — graphique d'activité récente, SVG maison (pas de lib de
// charting externe : deux séries simples ne justifient pas une dépendance).
// ---------------------------------------------------------------------------

function niceCeiling(value: number): number {
  if (value <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / pow;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * pow;
}

function formatCompactEuro(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${Math.round(value)}`;
}

export function MiniLineChart({
  data,
  seriesALabel,
  seriesBLabel,
}: {
  data: { month: string; ca: number; encaisse: number }[];
  seriesALabel: string;
  seriesBLabel: string;
}) {
  const width = 600;
  const height = 220;
  const paddingLeft = 40;
  const paddingBottom = 22;
  const paddingTop = 10;
  const paddingRight = 8;
  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const maxRaw = Math.max(1, ...data.map((d) => Math.max(d.ca, d.encaisse)));
  const niceMax = niceCeiling(maxRaw);
  const steps = 4;

  function x(i: number) {
    return paddingLeft + (data.length <= 1 ? innerWidth / 2 : (innerWidth * i) / (data.length - 1));
  }
  function y(value: number) {
    return paddingTop + innerHeight - (innerHeight * value) / niceMax;
  }

  const caPoints = data.map((d, i) => `${x(i)},${y(d.ca)}`).join(" ");
  const encaissePoints = data.map((d, i) => `${x(i)},${y(d.encaisse)}`).join(" ");

  return (
    <div className="nova-chart">
      <div className="nova-chart-legend">
        <span className="nova-chart-legend-item">
          <span className="nova-chart-legend-swatch nova-chart-legend-swatch-solid" />
          {seriesALabel}
        </span>
        <span className="nova-chart-legend-item">
          <span className="nova-chart-legend-swatch nova-chart-legend-swatch-dashed" />
          {seriesBLabel}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="nova-chart-svg" role="img" aria-label="Graphique d'activité récente">
        {Array.from({ length: steps + 1 }).map((_, i) => {
          const value = (niceMax / steps) * i;
          const yy = y(value);
          return (
            <g key={i}>
              <line x1={paddingLeft} x2={width - paddingRight} y1={yy} y2={yy} className="nova-chart-gridline" />
              <text x={paddingLeft - 8} y={yy + 3} className="nova-chart-axis-label" textAnchor="end">
                {formatCompactEuro(value)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => (
          <text key={d.month} x={x(i)} y={height - 4} className="nova-chart-axis-label" textAnchor="middle">
            {d.month}
          </text>
        ))}
        <polyline points={encaissePoints} className="nova-chart-line nova-chart-line-dashed" fill="none" />
        <polyline points={caPoints} className="nova-chart-line nova-chart-line-solid" fill="none" />
        {data.map((d, i) => (
          <circle key={`dot-${d.month}`} cx={x(i)} cy={y(d.ca)} r={3} className="nova-chart-dot" />
        ))}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewMenu — bouton "+ Nouveau" avec dropdown de création rapide (dashboard)
// ---------------------------------------------------------------------------

export function NewMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const items: { label: string; href: string }[] = [
    { label: "Nouveau devis", href: "/dashboard/devis/nouveau" },
    { label: "Nouveau client", href: "/dashboard/clients/nouveau" },
    { label: "Nouveau chantier", href: "/dashboard/chantiers/nouveau" },
  ];

  return (
    <div className="nova-new-menu" ref={ref}>
      <Button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <Plus size={16} strokeWidth={1.75} />
        Nouveau
        <ChevronDown size={14} strokeWidth={1.75} />
      </Button>
      {open && (
        <div className="nova-new-menu-panel" role="menu">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="nova-new-menu-item" role="menuitem" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WeekRangePicker — sélecteur de période affiché en en-tête du dashboard
// ---------------------------------------------------------------------------

export function WeekRangePicker() {
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const weekStart = addDays(startOfWeek(new Date()), offset * 7);
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const label = sameMonth
    ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${weekEnd.toLocaleDateString("fr-FR", { month: "long" })}`
    : `${weekStart.getDate()} ${weekStart.toLocaleDateString("fr-FR", { month: "short" })} – ${weekEnd.getDate()} ${weekEnd.toLocaleDateString("fr-FR", { month: "short" })}`;

  return (
    <div className="nova-week-picker" ref={ref}>
      <button type="button" className="nova-week-picker-trigger" onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open}>
        <CalendarDays size={15} strokeWidth={1.75} />
        <span>{offset === 0 ? `Cette semaine · ${label}` : label}</span>
        <ChevronDown size={14} strokeWidth={1.75} />
      </button>
      {open && (
        <div className="nova-week-picker-panel" role="dialog" aria-label="Choisir une période">
          <button type="button" className="nova-week-picker-option" onClick={() => setOffset((o) => o - 1)}>
            <ChevronLeft size={15} strokeWidth={1.75} />
            Semaine précédente
          </button>
          <button type="button" className="nova-week-picker-option" onClick={() => setOffset(0)}>
            Cette semaine
          </button>
          <button type="button" className="nova-week-picker-option" onClick={() => setOffset((o) => o + 1)}>
            Semaine suivante
            <ChevronRight size={15} strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GlobalSearch — recherche transverse Clients / Chantiers / Devis
// ---------------------------------------------------------------------------

type GlobalSearchResults = {
  clients: { id: string; name: string; email: string | null }[];
  projects: { id: string; name: string }[];
  devis: { id: string; label: string }[];
};

const SEARCH_MIN_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

function useGlobalSearchResults(query: string) {
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < SEARCH_MIN_LENGTH) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const qs = `?search=${encodeURIComponent(q)}`;
        const [clientsRes, projectsRes, devisRes] = await Promise.all([
          fetchWithAuth(`/api/clients${qs}`),
          fetchWithAuth(`/api/projects${qs}`),
          fetchWithAuth(`/api/devis${qs}`),
        ]);
        const [clientsData, projectsData, devisData] = await Promise.all([
          clientsRes.json(),
          projectsRes.json(),
          devisRes.json(),
        ]);
        if (!cancelled) {
          setResults({
            clients: clientsData.clients ?? [],
            projects: projectsData.projects ?? [],
            devis: devisData.devis ?? [],
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  return { results, loading };
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading } = useGlobalSearchResults(query);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const hasQuery = query.trim().length >= SEARCH_MIN_LENGTH;
  const resultCount = results ? results.clients.length + results.projects.length + results.devis.length : 0;

  return (
    <div className="nova-global-search">
      <div className="nova-global-search-trigger">
        <Search size={15} strokeWidth={1.75} />
        <input
          type="text"
          placeholder="Rechercher..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          aria-label="Recherche globale"
        />
      </div>

      {open && (
        <div className="nova-search-overlay">
          <div className="nova-search-palette" ref={paletteRef} role="dialog" aria-modal="true" aria-label="Recherche globale">
            <div className="nova-search-palette-input">
              <Search size={18} strokeWidth={1.75} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Rechercher un client, un chantier, un devis..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className="nova-icon-btn" onClick={() => setQuery("")} aria-label="Effacer la recherche">
                  <X size={15} strokeWidth={1.75} />
                </button>
              )}
            </div>

            <div className="nova-search-results">
              {!hasQuery ? (
                <p className="nova-search-hint">Tapez au moins {SEARCH_MIN_LENGTH} caractères pour rechercher.</p>
              ) : loading ? (
                <p className="nova-search-hint">Recherche...</p>
              ) : resultCount === 0 ? (
                <p className="nova-search-hint">Aucun résultat pour « {query.trim()} ».</p>
              ) : (
                <>
                  {results!.clients.length > 0 && (
                    <div className="nova-search-group">
                      <div className="nova-search-group-title">Clients</div>
                      {results!.clients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="nova-search-result"
                          onClick={() => goTo(`/dashboard/clients/${c.id}`)}
                        >
                          <span>{c.name}</span>
                          {c.email && <span className="nova-search-result-sub">{c.email}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {results!.projects.length > 0 && (
                    <div className="nova-search-group">
                      <div className="nova-search-group-title">Chantiers</div>
                      {results!.projects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="nova-search-result"
                          onClick={() => goTo(`/dashboard/chantiers/${p.id}`)}
                        >
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {results!.devis.length > 0 && (
                    <div className="nova-search-group">
                      <div className="nova-search-group-title">Devis</div>
                      {results!.devis.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          className="nova-search-result"
                          onClick={() => goTo(`/dashboard/devis/${d.id}`)}
                        >
                          <span>{d.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
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

export function Sidebar({
  businessName,
  logoBase64,
  userName,
  userInitials,
}: {
  businessName: string;
  logoBase64?: string | null;
  userName?: string;
  userInitials?: string;
}) {
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
        {logoBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoBase64} alt="" className="nova-sidebar-logo-image" />
        ) : (
          <span className="nova-sidebar-logo-mark">N</span>
        )}
        <span>NOVA</span>
      </div>
      <GlobalSearch />
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
      <Link href="/dashboard/aide" className="nova-sidebar-help">
        <HelpCircle size={17} strokeWidth={1.75} />
        <span>Aide &amp; support</span>
      </Link>
      <Link href="/dashboard/compte" className="nova-sidebar-account">
        {userInitials && <span className="nova-sidebar-avatar">{userInitials}</span>}
        <div className="nova-sidebar-account-text">
          {userName && <span className="nova-sidebar-account-name">{userName}</span>}
          <span className="nova-sidebar-business">{businessName}</span>
        </div>
      </Link>
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
