import type { AlertLevel, HistoryEntry, PropertyConfig, WaterEntry } from '../types';
import { dualKeyShared, waterBilledElsewhere } from '../types';
import { entryStatus } from '../ratesLogic';
import { sortedByDueDate, latestByDueDate, newestByDueDate } from './entryLogic';
import { addWeeks, daysUntil, dueDateAlertLevel, formatDate, formatMonthYear, formatDueLabel, urgency as dueUrgency } from './dueDate';

export const label = 'Water Bills';

// Water bills arrive quarterly (~13 weeks). We can't see the next bill until it's
// issued, so we ESTIMATE it: newest logged bill's due date + one cycle. The estimate
// is derived on read (never stored) — logging a new bill re-anchors it automatically.
export const WATER_CYCLE_WEEKS = 13;
// How early (before the estimate) a property starts flagging as "due soon" — a
// ~2-3 week heads-up so the next bill is never a surprise.
export const WATER_LOOKAHEAD_WEEKS = 3;

/** Estimated due date (YYYY-MM-DD) of the NEXT water bill, or null when there's nothing to project from. */
export function estimatedNextDueDate(cfg: PropertyConfig): string | null {
  if (cfg.waterCategory === 'purple') return null;
  if (waterBilledElsewhere(cfg)) return null;
  const anchor = cfg.attributes.trackers.water ? newestByDueDate(cfg.attributes.trackers.water.entries) : null;
  if (!anchor?.dueDate) return null;
  return addWeeks(anchor.dueDate, WATER_CYCLE_WEEKS);
}

/** Within the lead window but NOT yet past the estimated date — a forward-looking heads-up. */
export function isWaterUpcoming(cfg: PropertyConfig): boolean {
  const est = estimatedNextDueDate(cfg);
  if (!est) return false;
  const days = daysUntil(est);
  return days >= 0 && days <= WATER_LOOKAHEAD_WEEKS * 7;
}

/** The estimated next-bill date has passed with nothing new logged — the bill is overdue to arrive. */
export function isWaterEstimateOverdue(cfg: PropertyConfig): boolean {
  const est = estimatedNextDueDate(cfg);
  return est != null && daysUntil(est) < 0;
}

// Water has its own category (independent of rates): green = agent receives
// the bill & forwards it, orange = owner handles it directly, purple = not
// tracked at all. Same workflow model as rates, gated on cfg.waterCategory.
export function computeAlertLevel(cfg: PropertyConfig): AlertLevel {
  if (cfg.waterCategory === 'purple') return 'none';
  if (waterBilledElsewhere(cfg)) return 'none';
  const data = cfg.attributes.trackers.water;
  if (!data) return 'none';
  const latest = latestByDueDate(data.entries);
  if (!latest) return 'none';
  const own = dueDateAlertLevel(latest.dueDate, latest.paid) ?? (latest.paid ? 'ok' : 'missing');
  // A real unpaid/overdue bill outranks the estimate. Only when the logged bill is
  // settled do we look ahead to the next (estimated) one:
  //   past the estimated date, nothing logged → overdue to arrive ('missing');
  //   within the lead window → heads-up ('due-soon').
  if (own === 'ok') {
    if (isWaterEstimateOverdue(cfg)) return 'missing';
    if (isWaterUpcoming(cfg)) return 'due-soon';
  }
  return own;
}

export function urgency(cfg: PropertyConfig): number {
  if (cfg.waterCategory === 'purple') return 0;
  if (waterBilledElsewhere(cfg)) return 0;
  const data = cfg.attributes.trackers.water;
  const latest = data ? latestByDueDate(data.entries) : null;
  if (!latest) return 0;
  // Unpaid with no due date shows as Critical — score it like "just overdue".
  if (!latest.paid && !latest.dueDate) return 1;
  const own = dueUrgency(latest.dueDate, latest.paid);
  if (own > 0) return own;
  // Settled bill — let an upcoming estimate ramp its urgency so it sorts above plain "ok".
  const est = estimatedNextDueDate(cfg);
  return est ? dueUrgency(est, false, WATER_LOOKAHEAD_WEEKS * 7) : 0;
}

export function describe(cfg: PropertyConfig): string {
  if (cfg.waterExternalBill) {
    const note = cfg.waterExternalBillNote?.trim();
    return note ? `Billed with ${note}` : 'Billed under another property';
  }
  if (dualKeyShared(cfg, 'water')) return 'Billed with DK primary';
  if (cfg.waterCategory === 'purple') return 'Not tracked';
  const data = cfg.attributes.trackers.water;
  const latest = data ? latestByDueDate(data.entries) : null;
  if (!latest) return 'No water bill logged';
  if (latest.paid) {
    const est = estimatedNextDueDate(cfg);
    if (est) {
      if (isWaterEstimateOverdue(cfg)) return `Expected bill overdue (~${formatMonthYear(est)})`;
      if (isWaterUpcoming(cfg)) return `Next bill expected ~${formatMonthYear(est)}`;
    }
    return 'Up to date';
  }
  const dueLabel = formatDueLabel(latest.dueDate, latest.paid);
  return dueLabel ?? 'Unpaid';
}

export function historyRows(cfg: PropertyConfig): HistoryEntry[] {
  const data = cfg.attributes.trackers.water;
  if (!data) return [];
  const today = new Date().toISOString().slice(0, 10);
  return sortedByDueDate(data.entries).map(e => {
    // Same workflow badges as rates ("Not received yet", "Forwarded — awaiting
    // payment", ...) — the due date is already in the row title.
    const status = entryStatus(e, cfg.waterCategory);
    return {
      id: e.id,
      title: e.dueDate ? `Due ${formatDate(e.dueDate)}` : 'No due date',
      subtitle: e.amount != null ? `$${e.amount.toLocaleString()}` : undefined,
      badge: status.label,
      badgeHex: status.hex,
      isToday: e.createdAt.slice(0, 10) === today,
    };
  });
}

// ─── Activity log phrasing (used by lib/store.ts) ─────────────────────────

export function describeAdd(entry: WaterEntry): string {
  return 'Added water bill entry';
}

export function describeUpdate(before: WaterEntry, after: WaterEntry): string {
  if (before.paid !== after.paid) return `Marked water bill as ${after.paid ? 'paid' : 'unpaid'}`;
  if (before.dueDate !== after.dueDate) return 'Set water bill due date';
  if (before.dateReceived !== after.dateReceived) return 'Set water bill date received';
  if (before.dateForwarded !== after.dateForwarded) return 'Set water bill date forwarded';
  if (before.dateChecked !== after.dateChecked) return 'Set water bill date checked-in';
  return 'Updated water bill details';
}

export function describeDelete(entry: WaterEntry): string {
  return 'Removed water bill entry';
}
