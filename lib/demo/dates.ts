// Date helpers for the demo dataset.
//
// Every date in lib/demo/seed.ts is expressed as an OFFSET from the moment the
// page loads — never as a hard-coded calendar date. A demo seeded with absolute
// dates looks correct the week it ships and then rots: six months later every
// bill is overdue, every lease has expired, and the whole board is red. Deriving
// the dataset on each load keeps the dashboard permanently well-composed —
// a few genuinely overdue items, a few due soon, the rest healthy — whenever
// somebody happens to open the portfolio.

/** Local-midnight Date for today. Matches the convention in lib/trackers/dueDate.ts. */
function startOfToday(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** YYYY-MM-DD from a Date, read in LOCAL time (no UTC shift). */
export function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD, N days from today. Negative = in the past. */
export function days(n: number): string {
  const d = startOfToday();
  return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** YYYY-MM-DD, N calendar months from today. Negative = in the past. */
export function months(n: number): string {
  const d = startOfToday();
  return iso(new Date(d.getFullYear(), d.getMonth() + n, d.getDate()));
}

/** Full ISO timestamp N days ago — for createdAt/updatedAt and activity events. */
export function stamp(daysAgo: number, hour = 9, minute = 0): string {
  const d = startOfToday();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysAgo, hour, minute).toISOString();
}

/** The calendar year of a date N months from now — used to label rates quarters. */
export function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}
