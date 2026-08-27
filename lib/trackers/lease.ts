import type { AlertLevel, HistoryEntry, LeaseEntry, PropertyConfig } from '../types';
import { color } from '../tokens';
import { addMonths, daysUntil, formatDate } from './dueDate';

export const label = 'Rent Agreement';

// Renewal windows, keyed off the lease END date (calendar months, not a fixed
// day count): 3 months out the property enters "Needs oversight" ('due-soon'),
// 2 months out it escalates to "Needs attention" ('missing') and stays there
// through expiry until a new agreement is logged.
export const LEASE_OVERSIGHT_MONTHS = 3;
export const LEASE_ATTENTION_MONTHS = 2;

/** The current agreement = the one with the LATEST end date (undated ones lose; ties → newest created). */
export function currentLease(entries: LeaseEntry[]): LeaseEntry | null {
  let best: LeaseEntry | null = null;
  for (const e of entries) {
    if (!best) { best = e; continue; }
    if (e.endDate && best.endDate) {
      if (e.endDate > best.endDate || (e.endDate === best.endDate && e.createdAt > best.createdAt)) best = e;
    } else if (e.endDate && !best.endDate) {
      best = e;
    } else if (!e.endDate && !best.endDate) {
      if (e.createdAt > best.createdAt) best = e;
    }
  }
  return best;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function computeAlertLevel(cfg: PropertyConfig): AlertLevel {
  const data = cfg.attributes.trackers.lease;
  if (!data) return 'none';
  const latest = currentLease(data.entries);
  if (!latest) return 'none';
  // Open-ended/periodic agreement — nothing to count down to.
  if (!latest.endDate) return 'ok';
  const today = todayIso();
  if (today >= addMonths(latest.endDate, -LEASE_ATTENTION_MONTHS)) return 'missing';
  if (today >= addMonths(latest.endDate, -LEASE_OVERSIGHT_MONTHS)) return 'due-soon';
  return 'ok';
}

export function urgency(cfg: PropertyConfig): number {
  const data = cfg.attributes.trackers.lease;
  const latest = data ? currentLease(data.entries) : null;
  if (!latest?.endDate) return 0;
  const days = daysUntil(latest.endDate);
  // Expired ramps past the attention baseline, capped at 2 like every tracker.
  if (days < 0) return Math.min(2, 1 + -days / 30);
  const level = computeAlertLevel(cfg);
  // Inside the attention window score like "just overdue" (matches the
  // unpaid-with-no-due-date convention elsewhere); oversight ramps 0 → 1
  // as the attention threshold approaches.
  if (level === 'missing') return 1;
  if (level === 'due-soon') {
    // Ramp 0 → 1 across the oversight window (from 3 months out to 2 months out).
    const intoWindow = -daysUntil(addMonths(latest.endDate, -LEASE_OVERSIGHT_MONTHS));
    const windowSpan = Math.max(1, daysUntil(addMonths(latest.endDate, -LEASE_ATTENTION_MONTHS)) + intoWindow);
    return Math.min(1, Math.max(0, intoWindow / windowSpan));
  }
  return 0;
}

export function describe(cfg: PropertyConfig): string {
  const data = cfg.attributes.trackers.lease;
  const latest = data ? currentLease(data.entries) : null;
  if (!latest) return 'No rent agreement logged';
  const rent = latest.rent != null ? ` · $${latest.rent.toLocaleString()}/wk` : '';
  if (!latest.endDate) {
    return latest.startDate
      ? `Since ${formatDate(latest.startDate)} — no end date${rent}`
      : `No end date set${rent}`;
  }
  const days = daysUntil(latest.endDate);
  if (days < 0) return `Lease expired ${formatDate(latest.endDate)} (${-days}d ago)${rent}`;
  if (days === 0) return `Lease ends today${rent}`;
  const level = computeAlertLevel(cfg);
  if (level === 'missing') return `Lease ends ${formatDate(latest.endDate)} (in ${days}d) — renewal needed${rent}`;
  if (level === 'due-soon') return `Lease ends ${formatDate(latest.endDate)} (in ${days}d)${rent}`;
  return `Leased to ${formatDate(latest.endDate)}${rent}`;
}

function periodLabel(e: LeaseEntry): string {
  if (e.startDate && e.endDate) return `${formatDate(e.startDate)} → ${formatDate(e.endDate)}`;
  if (e.endDate) return `To ${formatDate(e.endDate)}`;
  if (e.startDate) return `From ${formatDate(e.startDate)}`;
  return 'No dates set';
}

export function historyRows(cfg: PropertyConfig): HistoryEntry[] {
  const data = cfg.attributes.trackers.lease;
  if (!data) return [];
  const today = new Date().toISOString().slice(0, 10);
  // Newest agreement first (mirrors currentLease's ordering).
  const sorted = [...data.entries].sort((a, b) => {
    if (a.endDate && b.endDate) return b.endDate.localeCompare(a.endDate);
    if (a.endDate) return -1;
    if (b.endDate) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
  return sorted.map(e => {
    let badge = 'Open-ended';
    let badgeHex: string = color.sky;
    if (e.endDate) {
      const days = daysUntil(e.endDate);
      if (days < 0) { badge = 'Expired'; badgeHex = color.red; }
      else if (days <= 62) { badge = `Ends in ${days}d`; badgeHex = color.red; }
      else if (days <= 93) { badge = `Ends in ${days}d`; badgeHex = color.orange; }
      else { badge = 'Active'; badgeHex = color.green; }
    }
    const subtitleParts = [
      e.rent != null ? `$${e.rent.toLocaleString()}/wk` : null,
      e.tenant?.trim() || null,
    ].filter(Boolean);
    return {
      id: e.id,
      title: periodLabel(e),
      subtitle: subtitleParts.length ? subtitleParts.join(' · ') : undefined,
      badge,
      badgeHex,
      isToday: e.createdAt.slice(0, 10) === today,
    };
  });
}

// ─── Activity log phrasing (used by lib/store.ts) ─────────────────────────

export function describeAdd(entry: LeaseEntry): string {
  return `Added rent agreement (${periodLabel(entry)})`;
}

export function describeUpdate(before: LeaseEntry, after: LeaseEntry): string {
  if (before.endDate !== after.endDate) return `Set lease end date (${periodLabel(after)})`;
  if (before.startDate !== after.startDate) return `Set lease start date (${periodLabel(after)})`;
  if (before.rent !== after.rent) return 'Updated rent amount';
  if (before.tenant !== after.tenant) return 'Updated tenant';
  return 'Updated rent agreement details';
}

export function describeDelete(entry: LeaseEntry): string {
  return `Removed rent agreement (${periodLabel(entry)})`;
}
