import { daysUntil } from './dueDate';

interface DueDated {
  dueDate: string | null;
  createdAt: string;
}

export function sortedByDueDate<T extends DueDated>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.dueDate && b.dueDate) return daysUntil(a.dueDate) - daysUntil(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function latestByDueDate<T extends DueDated>(entries: T[]): T | null {
  return sortedByDueDate(entries)[0] ?? null;
}

/**
 * The chronologically NEWEST entry — max dueDate, tie-broken by newest createdAt.
 * Distinct from latestByDueDate (which surfaces the most-overdue/soonest entry):
 * this is the anchor for projecting the *next* bill forward.
 */
export function newestByDueDate<T extends DueDated>(entries: T[]): T | null {
  let best: T | null = null;
  for (const e of entries) {
    if (!best) { best = e; continue; }
    if (e.dueDate && best.dueDate) {
      if (e.dueDate > best.dueDate) best = e;
      else if (e.dueDate === best.dueDate && e.createdAt > best.createdAt) best = e;
    } else if (e.dueDate && !best.dueDate) {
      best = e; // a dated entry beats an undated one as an anchor
    } else if (!e.dueDate && !best.dueDate) {
      if (e.createdAt > best.createdAt) best = e;
    }
  }
  return best;
}

