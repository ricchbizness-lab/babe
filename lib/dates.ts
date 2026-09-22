/** Utilitaires de dates pour le planning — pas de librairie externe, calculs simples suffisants ici. */

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day; // ramène au lundi
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function weekDays(weekStart: Date): { date: Date; label: string }[] {
  return DAY_LABELS.map((label, i) => ({ date: addDays(weekStart, i), label }));
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Les n derniers mois (mois courant inclus), du plus ancien au plus récent. */
export function lastMonths(n: number): { key: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = addMonths(now, -(n - 1 - i));
    const raw = d.toLocaleDateString("fr-FR", { month: "short" });
    return { key: monthKey(d), label: raw.charAt(0).toUpperCase() + raw.slice(1) };
  });
}

/** Grille de 6 semaines (42 jours, lundi en première colonne) couvrant tout le mois de monthStart. */
export function monthGrid(monthStart: Date): { date: Date; inMonth: boolean }[] {
  const firstOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // lundi = 0
  const gridStart = addDays(firstOfMonth, -firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(gridStart, i);
    return { date, inMonth: date.getMonth() === monthStart.getMonth() };
  });
}

export type PeriodRange = { start: Date; end: Date; label: string };

/**
 * Parse une période saisie pour le rapport stratégique (module copilote).
 * Trois formats acceptés : trimestre ("2026-T3"), mois ("2026-09") ou année
 * ("2026"). `end` est exclusif (borne haute du lendemain de la fin de
 * période) pour des comparaisons `updatedAt < end` sans arrondi. Retourne
 * `null` si aucun format ne correspond — à l'appelant de refuser proprement
 * plutôt que de deviner une période par défaut.
 */
export function parsePeriod(period: string): PeriodRange | null {
  const trimmed = period.trim();

  const quarterMatch = trimmed.match(/^(\d{4})-T([1-4])$/);
  if (quarterMatch) {
    const year = Number(quarterMatch[1]);
    const quarter = Number(quarterMatch[2]);
    return {
      start: new Date(year, (quarter - 1) * 3, 1),
      end: new Date(year, quarter * 3, 1),
      label: `T${quarter} ${year}`,
    };
  }

  const monthMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    if (month < 1 || month > 12) return null;
    const start = new Date(year, month - 1, 1);
    const rawLabel = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return { start, end: new Date(year, month, 1), label: rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1) };
  }

  const yearMatch = trimmed.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1), label: String(year) };
  }

  return null;
}
