import type { AlertLevel, HistoryEntry, PropertyConfig, RatesEntry } from '../types';
import { quarterLabel, dualKeyShared, ratesBilledElsewhere } from '../types';
import { latestEntry, sortedEntries, entryStatus } from '../ratesLogic';
import { daysUntil, dueDateAlertLevel, formatDate, formatDueLabel, urgency as dueUrgency } from './dueDate';

export const label = 'Rates & Charges';

// Council rates run on a FIXED quarterly schedule (unlike the water estimate,
// which is derived). NSW councils bill instalments due 31 Aug / 30 Nov / 28 Feb
// / 31 May, the same dates for every property — so the "next instalment" is a
// known calendar date, not a calculation. We surface a heads-up in the lead
// window below, mirroring the water 3-week reminder.
const RATES_INSTALMENTS: [number, number][] = [[8, 31], [11, 30], [2, 28], [5, 31]]; // [month, day]
export const RATES_LOOKAHEAD_DAYS = 21;

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** The next fixed council instalment due date (YYYY-MM-DD) on/after today. */
export function nextRatesInstalmentDue(fromIso?: string): string {
  const from = fromIso ? new Date(fromIso) : new Date();
  const today = ymd(from.getFullYear(), from.getMonth() + 1, from.getDate());
  const y = from.getFullYear();
  const candidates = [y, y + 1].flatMap(yy => RATES_INSTALMENTS.map(([m, d]) => ymd(yy, m, d)));
  return candidates.filter(c => c >= today).sort()[0];
}

/** Next instalment date for THIS property, or null when rates aren't tracked here. */
export function ratesNextInstalment(cfg: PropertyConfig): string | null {
  if (cfg.ratesCategory === 'purple') return null;
  if (ratesBilledElsewhere(cfg)) return null;
  // Only surface for properties we actually track rates on (something logged).
  if (!cfg.attributes.trackers.rates?.entries.length) return null;
  return nextRatesInstalmentDue();
}

/** True once we're within the lead window of the next fixed instalment. */
export function isRatesUpcoming(cfg: PropertyConfig): boolean {
  const next = ratesNextInstalment(cfg);
  return next != null && daysUntil(next) <= RATES_LOOKAHEAD_DAYS;
}

export function computeAlertLevel(cfg: PropertyConfig): AlertLevel {
  if (cfg.ratesCategory === 'purple') return 'none';
  if (ratesBilledElsewhere(cfg)) return 'none';
  const data = cfg.attributes.trackers.rates;
  if (!data) return 'none';
  const latest = latestEntry(data.entries);
  if (!latest) return 'none';
  // dueDate is optional — when absent, fall back to the original paid/unpaid-only logic
  // so the 60 pre-existing entries (no dueDate) keep behaving exactly as before.
  const own = dueDateAlertLevel(latest.dueDate, latest.paid) ?? (latest.paid ? 'ok' : 'missing');
  // A real unpaid/overdue instalment outranks the schedule heads-up. Once settled,
  // flag the next fixed instalment as it approaches.
  if (own === 'ok' && isRatesUpcoming(cfg)) return 'due-soon';
  return own;
}

export function urgency(cfg: PropertyConfig): number {
  if (cfg.ratesCategory === 'purple') return 0;
  if (ratesBilledElsewhere(cfg)) return 0;
  const data = cfg.attributes.trackers.rates;
  const latest = data ? latestEntry(data.entries) : null;
  if (!latest) return 0;
  // Unpaid with no due date reads as 'missing' (Critical) — give it the same
  // baseline urgency as "just went overdue" so the severity score agrees
  // with the alert colour instead of scoring 0.
  if (!latest.paid && !latest.dueDate) return 1;
  const own = dueUrgency(latest.dueDate, latest.paid);
  if (own > 0) return own;
  // Settled — let the approaching fixed instalment ramp urgency so it sorts up.
  const next = ratesNextInstalment(cfg);
  return next ? dueUrgency(next, false, RATES_LOOKAHEAD_DAYS) : 0;
}

export function describe(cfg: PropertyConfig): string {
  if (cfg.ratesExternalBill) {
    const note = cfg.ratesExternalBillNote?.trim();
    return note ? `Billed with ${note}` : 'Billed under another property';
  }
  if (dualKeyShared(cfg, 'rates')) return 'Billed with DK primary';
  if (cfg.ratesCategory === 'purple') return 'Not tracked';
  const data = cfg.attributes.trackers.rates;
  const latest = data ? latestEntry(data.entries) : null;
  if (!latest) return 'No rates logged';
  if (latest.paid) {
    const next = ratesNextInstalment(cfg);
    if (next && isRatesUpcoming(cfg)) return `Next instalment due ${formatDate(next)}`;
    return 'Up to date';
  }
  const dueLabel = formatDueLabel(latest.dueDate, latest.paid);
  return dueLabel ? `${dueLabel} · ${quarterLabel(latest)}` : `Unpaid · ${quarterLabel(latest)}`;
}

export function historyRows(cfg: PropertyConfig): HistoryEntry[] {
  const data = cfg.attributes.trackers.rates;
  if (!data) return [];
  const today = new Date().toISOString().slice(0, 10);
  return sortedEntries(data.entries).map(e => {
    const status = entryStatus(e, cfg.ratesCategory);
    return {
      id: e.id,
      title: quarterLabel(e),
      subtitle: e.amount != null ? `$${e.amount.toLocaleString()}` : undefined,
      badge: status.label,
      badgeHex: status.hex,
      isToday: e.createdAt.slice(0, 10) === today,
    };
  });
}

// ─── Activity log phrasing (used by lib/store.ts) ─────────────────────────

export function describeAdd(entry: RatesEntry): string {
  return `Added ${quarterLabel(entry)} rates entry`;
}

export function describeUpdate(before: RatesEntry, after: RatesEntry): string {
  if (before.paid !== after.paid) {
    return `Marked ${quarterLabel(after)} as ${after.paid ? 'paid' : 'unpaid'}`;
  }
  if (before.dueDate !== after.dueDate) return `Set due date for ${quarterLabel(after)}`;
  if (before.dateReceived !== after.dateReceived) return `Set date received for ${quarterLabel(after)}`;
  if (before.dateForwarded !== after.dateForwarded) return `Set date forwarded for ${quarterLabel(after)}`;
  if (before.dateChecked !== after.dateChecked) return `Set date checked-in for ${quarterLabel(after)}`;
  return `Updated ${quarterLabel(after)} details`;
}

export function describeDelete(entry: RatesEntry): string {
  return `Removed ${quarterLabel(entry)} entry`;
}
