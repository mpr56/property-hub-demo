import type { AlertLevel } from '../types';

export const DUE_SOON_WINDOW_DAYS = 14;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function daysUntil(dateIso: string): number {
  const ms = startOfDay(new Date(dateIso)) - startOfDay(new Date());
  return Math.round(ms / 86_400_000);
}

/** Shifts an ISO date by N days and returns a YYYY-MM-DD string (date-only, no TZ drift). */
export function addDays(dateIso: string, days: number): string {
  const d = new Date(dateIso);
  const shifted = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const day = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Shifts an ISO date by N weeks — used to project the next quarterly bill. */
export function addWeeks(dateIso: string, weeks: number): string {
  return addDays(dateIso, weeks * 7);
}

/** Shifts an ISO date by N calendar months (negative = earlier) — used for lease renewal windows. */
export function addMonths(dateIso: string, months: number): string {
  const d = new Date(dateIso);
  const shifted = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const day = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns null when there's no due date to reason about — the caller must fall
 * back to its own binary (done/not-done) logic in that case.
 */
export function dueDateAlertLevel(
  dueDate: string | null,
  isCompleted: boolean,
  windowDays: number = DUE_SOON_WINDOW_DAYS
): AlertLevel | null {
  if (isCompleted) return 'ok';
  if (!dueDate) return null;
  const days = daysUntil(dueDate);
  if (days < 0) return 'missing';
  if (days <= windowDays) return 'due-soon';
  return 'ok';
}

/**
 * A sort-tiebreak signal, not a color scale: 0 when not urgent, ramping up
 * toward/through 1 as the due date approaches, up to 2 the more overdue.
 */
export function urgency(
  dueDate: string | null,
  isCompleted: boolean,
  windowDays: number = DUE_SOON_WINDOW_DAYS
): number {
  if (isCompleted || !dueDate) return 0;
  const days = daysUntil(dueDate);
  if (days < 0) return Math.min(2, 1 + -days / 30);
  if (days <= windowDays) return (windowDays - days + 1) / (windowDays + 1);
  return 0;
}

/** "12 Aug 2026" — shared date formatting for history rows. */
export function formatDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "Aug 2026" — no day, used where only the month matters (e.g. "Tenanted since"). */
export function formatMonthYear(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/** "Due in 2d" / "Overdue 5d" / "Due today" — shared phrasing for all due-date trackers. */
export function formatDueLabel(dueDate: string | null, isCompleted: boolean): string | null {
  if (isCompleted || !dueDate) return null;
  const days = daysUntil(dueDate);
  if (days === 0) return 'Due today';
  if (days > 0) return `Due in ${days}d`;
  return `Overdue ${-days}d`;
}
