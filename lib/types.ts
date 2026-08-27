// ─── Categories ──────────────────────────────────────────────────────────
// Carried over from the rates & charges spreadsheet:
//   green  -> agent receives the notice directly and forwards it to the owner
//   orange -> owner deals with the biller directly, agent just checks in
//   purple -> no tracking needed, informational only
// Rates and water each carry their OWN category (they're independent):
// a property can be self-handled for rates but owner-handled for water.
export type Category = 'green' | 'orange' | 'purple';

export const CATEGORY_CONFIG: Record<Category, { label: string; shortLabel: string; hex: string; desc: string }> = {
  green:  { label: 'Self-handled', shortLabel: 'Self', hex: '#4ade80', desc: 'You receive it & forward it to the owner' },
  orange: { label: 'Owner-handled', shortLabel: 'Owner', hex: '#fb923c', desc: 'Owner deals with the biller directly' },
  purple: { label: 'No tracking',   shortLabel: 'None', hex: '#c084fc', desc: 'Reminder only, nothing to track' },
};

export interface RatesEntry {
  id: string;
  quarterPeriod: 'Aug' | 'Nov' | 'Feb' | 'May';
  year: number;
  amount: number | null;
  provider: string | null;
  dueDate: string | null;        // optional — null means "no opinion", falls back to paid/unpaid
  dateReceived: string | null;   // green workflow
  dateForwarded: string | null;  // green workflow
  dateChecked: string | null;    // orange workflow
  paid: boolean;
  paidDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatesTrackerData {
  entries: RatesEntry[];
}

export interface WaterEntry {
  id: string;
  dueDate: string | null;
  amount: number | null;
  provider: string | null;
  dateReceived: string | null;   // green workflow (mirrors rates)
  dateForwarded: string | null;  // green workflow
  dateChecked: string | null;    // orange workflow
  paid: boolean;
  paidDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaterTrackerData {
  entries: WaterEntry[];
}

// Rent agreement / lease. The lease PERIOD (start → end) is the tracked thing;
// renewal alerts key off endDate (3 months out = oversight, 2 months out or
// expired = needs attention — see lib/trackers/lease.ts).
export interface LeaseEntry {
  id: string;
  startDate: string | null;
  endDate: string | null;
  rent: number | null;        // optional, per week
  tenant: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaseTrackerData {
  entries: LeaseEntry[];
}

export type InspectionResult = 'pass' | 'fail' | 'pending';

// Shared shape for both 'inspection' and 'termite' — structurally identical.
export interface InspectionEntry {
  id: string;
  dueDate: string | null;
  completedDate: string | null;
  result: InspectionResult;
  provider: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionTrackerData {
  entries: InspectionEntry[];
}

// Every "thing to track" on a property lives here as a sibling key, keyed by its tracker type.
export interface TrackersMap {
  lease?: LeaseTrackerData;
  rates?: RatesTrackerData;
  water?: WaterTrackerData;
  inspection?: InspectionTrackerData;
  termite?: InspectionTrackerData; // reuses the inspection entry shape
}
export type TrackerType = keyof TrackersMap;

export interface PropertyAttributes {
  trackers: TrackersMap;
}

// ─── Alerts ──────────────────────────────────────────────────────────────
// The severity a tracker (or a whole property) is in, used to sort/highlight
// the home screen. 'due-soon' has no producer yet (rates has no due dates),
// but the plumbing supports a future tracker that does.
export type AlertLevel = 'missing' | 'due-soon' | 'ok' | 'none';

// ─── History (per-tracker "past entries" list, shown in the History sheet) ─
export interface HistoryEntry {
  id: string;
  title: string;      // e.g. "Aug 2026" or a formatted date
  subtitle?: string;   // e.g. "$450"
  badge: string;       // e.g. "Paid", "Unpaid", "Pass", "Fail", "Overdue 5d"
  badgeHex: string;
  isToday?: boolean;
}

// ─── Activity log ────────────────────────────────────────────────────────
export interface ActivityEvent {
  id: string;
  at: string; // ISO timestamp
  trackerType?: TrackerType; // absent for property-metadata edits
  summary: string;
}

// ─── Dual key ────────────────────────────────────────────────────────────
// Dual-key pairs (e.g. 1/24 + 2/24 Sandpiper Close) are two property records that
// receive ONE rates notice (and sometimes one water notice) for the whole lot,
// billed under the primary's address. The role is explicit — address formats
// are too inconsistent to pair units automatically — and alert suppression
// only ever happens on an explicit 'secondary', so an untagged dual key keeps
// alerting rather than silently missing an overdue notice.
export type DualKeyRole = 'primary' | 'secondary';

/** True when this tracker's bill arrives under the dual-key primary, so this record should stay silent for it. */
export function dualKeyShared(
  p: { dualKeyRole?: DualKeyRole | null; dualKeyRatesShared?: boolean; dualKeyWaterShared?: boolean },
  tracker: 'rates' | 'water'
): boolean {
  if (p.dualKeyRole !== 'secondary') return false;
  // Rates sharing is the point of the arrangement — default on; water meters
  // are often separate — default off. Both editable per pair.
  return tracker === 'rates' ? p.dualKeyRatesShared ?? true : p.dualKeyWaterShared ?? false;
}

/**
 * True when this property's water bill arrives under a DIFFERENT property, so
 * this record should stay silent for water. Covers both the dual-key case
 * (secondary billed with its primary) and the standalone `waterExternalBill`
 * flag (e.g. one lot's meter billed against a neighbouring property).
 */
export function waterBilledElsewhere(
  p: { dualKeyRole?: DualKeyRole | null; dualKeyWaterShared?: boolean; waterExternalBill?: boolean }
): boolean {
  return p.waterExternalBill === true || dualKeyShared(p, 'water');
}

/**
 * True when this property's council rates arrive under a DIFFERENT property, so
 * this record should stay silent for rates. Mirrors waterBilledElsewhere: covers
 * both the dual-key case and the standalone `ratesExternalBill` flag.
 */
export function ratesBilledElsewhere(
  p: { dualKeyRole?: DualKeyRole | null; dualKeyRatesShared?: boolean; ratesExternalBill?: boolean }
): boolean {
  return p.ratesExternalBill === true || dualKeyShared(p, 'rates');
}

export interface PropertySummary {
  id: string;
  address: string;
  suburb: string;
  council: string;
  ratesCategory: Category;
  waterCategory: Category;
  // Some properties don't need termite inspections at all — track that
  // explicitly so "not applicable" is distinguishable from "nothing logged".
  termiteApplicable: boolean;
  dwellingType: string;
  // Dual-key only (see DualKeyRole above); absent on other dwelling types.
  dualKeyRole?: DualKeyRole | null;
  dualKeyRatesShared?: boolean;
  dualKeyWaterShared?: boolean;
  // Water billed under a DIFFERENT property (not necessarily a dual-key pair) —
  // this record never receives its own water notice, so water tracking stays
  // silent for it. The note holds the human description of where it's billed
  // (e.g. "Comes with 62 Rosalind Way").
  waterExternalBill?: boolean;
  waterExternalBillNote?: string;
  // Same idea for council rates — billed under another property (e.g. a dual-key
  // secondary whose rates arrive under the primary's address).
  ratesExternalBill?: boolean;
  ratesExternalBillNote?: string;
  methodOfDelivery: string;
  owner: string;
  tenantedSince: string | null;
  dataIssue: boolean;
  notes: string;
  createdAt: string;
}

export interface PropertyConfig extends PropertySummary {
  attributes: PropertyAttributes;
  activity: ActivityEvent[];
}

// Quarter ordering helper — used for sorting entries & finding "latest"
export const QUARTER_ORDER: Record<string, number> = { Feb: 0, May: 1, Aug: 2, Nov: 3 };

export function quarterRank(q: { quarterPeriod: string; year: number }): number {
  return q.year * 10 + QUARTER_ORDER[q.quarterPeriod];
}

export function quarterLabel(q: { quarterPeriod: string; year: number }): string {
  return `${q.quarterPeriod} ${q.year}`;
}
