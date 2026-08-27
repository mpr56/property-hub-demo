import type { AlertLevel, HistoryEntry, PropertyConfig, TrackerType } from '../types';
import { color } from '../tokens';
import * as lease from './lease';
import * as rates from './rates';
import * as water from './water';
import { inspectionTracker, termiteTracker } from './inspection';

export const ALERT_RANK: Record<AlertLevel, number> = { missing: 0, 'due-soon': 1, ok: 2, none: 3 };

export const ALERT_META: Record<AlertLevel, { label: string; hex: string }> = {
  missing: { label: 'Critical', hex: color.red },
  'due-soon': { label: 'Due soon', hex: color.orange },
  ok: { label: 'Up to date', hex: color.green },
  none: { label: 'Not tracked', hex: color.purple },
};

// "Needs attention" = something is actually PAST its due date ('missing'/overdue).
// 'due-soon' is a forward-looking heads-up (e.g. the estimated next water bill), so
// it surfaces via the "Due soon" severity bucket and the Upcoming tile — NOT here.
export const NEEDS_ATTENTION_LEVELS: AlertLevel[] = ['missing'];

// How much each tracker type contributes to a property's severity score,
// relative to the others — financial/compliance trackers outweigh informational ones.
// Tune freely; this is the single source of truth for the weighting.
export const TRACKER_WEIGHT: Record<TrackerType, number> = {
  lease: 2,
  rates: 1,
  water: 1,
  inspection: 2,
  termite: 3,
};

export const TRACKER_SHORT_LABEL: Record<TrackerType, string> = {
  lease: 'Lease',
  rates: 'Rates',
  water: 'Water',
  inspection: 'Insp.',
  termite: 'Termite',
};

interface TrackerDefinition {
  label: string;
  computeAlertLevel(cfg: PropertyConfig): AlertLevel;
  urgency(cfg: PropertyConfig): number;
  describe(cfg: PropertyConfig): string;
  historyRows(cfg: PropertyConfig): HistoryEntry[];
}

// The one place a new tracker type (water, inspections, termite...) registers itself.
// All 4 tracker types fully participate in the alert/severity system.
const registry: Record<TrackerType, TrackerDefinition> = {
  lease: { label: lease.label, computeAlertLevel: lease.computeAlertLevel, urgency: lease.urgency, describe: lease.describe, historyRows: lease.historyRows },
  rates: { label: rates.label, computeAlertLevel: rates.computeAlertLevel, urgency: rates.urgency, describe: rates.describe, historyRows: rates.historyRows },
  water: { label: water.label, computeAlertLevel: water.computeAlertLevel, urgency: water.urgency, describe: water.describe, historyRows: water.historyRows },
  inspection: inspectionTracker,
  termite: termiteTracker,
};

function activeTypes(cfg: PropertyConfig): TrackerType[] {
  return Object.keys(cfg.attributes.trackers) as TrackerType[];
}

/** The worst (most severe) alert level across all trackers present on a property. */
export function propertyAlertLevel(cfg: PropertyConfig): AlertLevel {
  let worst: AlertLevel = 'none';
  for (const type of activeTypes(cfg)) {
    const level = registry[type].computeAlertLevel(cfg);
    if (ALERT_RANK[level] < ALERT_RANK[worst]) worst = level;
  }
  return worst;
}

/** Which tracker is driving the property's current alert level — used for the card's status text. */
export function worstTracker(cfg: PropertyConfig): TrackerType | null {
  const types = activeTypes(cfg);
  if (types.length === 0) return null;
  const level = propertyAlertLevel(cfg);
  return types.find(t => registry[t].computeAlertLevel(cfg) === level) ?? types[0];
}

// Urgency caps at 2 (see dueDate.ts) — this is the highest raw score all 4 trackers
// could jointly produce, used to normalize propertySeverityScore onto a 0-100 scale.
const MAX_RAW_SCORE = Object.values(TRACKER_WEIGHT).reduce((a, b) => a + b, 0) * 2;

/**
 * A property's overall severity score = Σ(tracker weight × tracker urgency),
 * normalized to ~0-100. Sums across trackers (not max) so a property with
 * multiple overdue attributes scores worse than one overdue on a single attribute.
 */
export function propertySeverityScore(cfg: PropertyConfig): number {
  const raw = activeTypes(cfg).reduce((sum, type) => sum + TRACKER_WEIGHT[type] * registry[type].urgency(cfg), 0);
  return (raw / MAX_RAW_SCORE) * 100;
}

/** Whether a property's overall status is one that should surface as needing action. */
export function propertyNeedsAttention(cfg: PropertyConfig): boolean {
  return NEEDS_ATTENTION_LEVELS.includes(propertyAlertLevel(cfg));
}

/** Whether one specific tracker on a property currently needs action. */
export function trackerNeedsAttention(cfg: PropertyConfig, type: TrackerType): boolean {
  return NEEDS_ATTENTION_LEVELS.includes(trackerAlertLevel(cfg, type));
}

export function trackerLabel(type: TrackerType): string {
  return registry[type].label;
}

export function trackerDescribe(cfg: PropertyConfig, type: TrackerType): string {
  return registry[type].describe(cfg);
}

export function trackerAlertLevel(cfg: PropertyConfig, type: TrackerType): AlertLevel {
  return registry[type].computeAlertLevel(cfg);
}

export function trackerUrgency(cfg: PropertyConfig, type: TrackerType): number {
  return registry[type].urgency(cfg);
}

/**
 * Whether a property's rent agreement is inside the ~3-month renewal window —
 * i.e. ending soon ('due-soon') or already within the final stretch / expired
 * ('missing'). Backs the "Leases expiring" dashboard tile and its quick filter.
 * Safely false for properties with no lease tracker (level is 'none').
 */
export function leaseExpiringSoon(cfg: PropertyConfig): boolean {
  const level = trackerAlertLevel(cfg, 'lease');
  return level === 'due-soon' || level === 'missing';
}

export function trackerHistoryRows(cfg: PropertyConfig, type: TrackerType): HistoryEntry[] {
  return registry[type].historyRows(cfg);
}

// Lease first — it renders as the full-width card above the grid on the
// property page, matching its prominence in the day-to-day workflow.
export const ALL_TRACKER_TYPES: TrackerType[] = ['lease', 'rates', 'water', 'inspection', 'termite'];

// Water-specific estimate helpers (the only tracker that projects a future bill for now).
export const estimatedNextWaterDue = water.estimatedNextDueDate;
export const isWaterUpcoming = water.isWaterUpcoming;
export const isWaterEstimateOverdue = water.isWaterEstimateOverdue;

// Rates run on a fixed council instalment schedule (not a derived estimate).
export const ratesNextInstalment = rates.ratesNextInstalment;
export const isRatesUpcoming = rates.isRatesUpcoming;
