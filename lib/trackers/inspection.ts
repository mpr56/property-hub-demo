import type { AlertLevel, HistoryEntry, InspectionEntry, PropertyConfig, TrackerType } from '../types';
import { color } from '../tokens';
import { sortedByDueDate, latestByDueDate } from './entryLogic';
import { dueDateAlertLevel, formatDate, formatDueLabel, urgency as dueUrgency } from './dueDate';

export interface InspectionTracker {
  type: TrackerType;
  label: string;
  computeAlertLevel(cfg: PropertyConfig): AlertLevel;
  urgency(cfg: PropertyConfig): number;
  describe(cfg: PropertyConfig): string;
  historyRows(cfg: PropertyConfig): HistoryEntry[];
  describeAdd(entry: InspectionEntry): string;
  describeUpdate(before: InspectionEntry, after: InspectionEntry): string;
  describeDelete(entry: InspectionEntry): string;
}

// Inspection reports and termite inspections are structurally identical
// (due date, completed date, pass/fail/pending result) — one factory, two
// registered instances, rather than duplicating a near-identical module.
// `isApplicable` lets a tracker opt out per property (termite uses
// cfg.termiteApplicable); a non-applicable tracker reports 'none' everywhere.
export function makeInspectionTracker(
  type: 'inspection' | 'termite',
  label: string,
  isApplicable: (cfg: PropertyConfig) => boolean = () => true
): InspectionTracker {
  function data(cfg: PropertyConfig) {
    return cfg.attributes.trackers[type];
  }

  function computeAlertLevel(cfg: PropertyConfig): AlertLevel {
    if (!isApplicable(cfg)) return 'none';
    const d = data(cfg);
    if (!d) return 'none';
    const latest = latestByDueDate(d.entries);
    if (!latest) return 'none';
    if (latest.result === 'fail') return 'missing'; // needs attention now, regardless of due date
    const isDone = latest.result === 'pass';
    return dueDateAlertLevel(latest.dueDate, isDone) ?? (latest.result === 'pending' ? 'missing' : 'ok');
  }

  function urgency(cfg: PropertyConfig): number {
    if (!isApplicable(cfg)) return 0;
    const d = data(cfg);
    const latest = d ? latestByDueDate(d.entries) : null;
    if (!latest) return 0;
    if (latest.result === 'fail') return 2;
    // Pending with no due date shows as Critical — score it like "just overdue".
    if (latest.result === 'pending' && !latest.dueDate) return 1;
    return dueUrgency(latest.dueDate, latest.result === 'pass');
  }

  function describe(cfg: PropertyConfig): string {
    if (!isApplicable(cfg)) return 'Not applicable';
    const d = data(cfg);
    const latest = d ? latestByDueDate(d.entries) : null;
    if (!latest) return `No ${label.toLowerCase()} logged`;
    if (latest.result === 'fail') return 'Failed, needs attention';
    if (latest.result === 'pass') return 'Passed';
    const dueLabel = formatDueLabel(latest.dueDate, false);
    return dueLabel ?? 'Pending';
  }

  function historyRows(cfg: PropertyConfig): HistoryEntry[] {
    const d = data(cfg);
    if (!d) return [];
    const today = new Date().toISOString().slice(0, 10);
    return sortedByDueDate(d.entries).map(e => {
      const badge = e.result === 'pass' ? 'Pass' : e.result === 'fail' ? 'Fail' : 'Pending';
      const badgeHex = e.result === 'pass' ? color.green : e.result === 'fail' ? color.red : color.orange;
      const title = e.completedDate
        ? formatDate(e.completedDate)
        : e.dueDate
          ? `Due ${formatDate(e.dueDate)}`
          : 'No date set';
      return { id: e.id, title, badge, badgeHex, isToday: e.createdAt.slice(0, 10) === today };
    });
  }

  function describeAdd(): string {
    return `Added ${label.toLowerCase()} entry`;
  }

  function describeUpdate(before: InspectionEntry, after: InspectionEntry): string {
    if (before.result !== after.result) return `Marked ${label.toLowerCase()} as ${after.result}`;
    if (before.dueDate !== after.dueDate) return `Set ${label.toLowerCase()} due date`;
    if (before.completedDate !== after.completedDate) return `Set ${label.toLowerCase()} completed date`;
    return `Updated ${label.toLowerCase()} details`;
  }

  function describeDelete(): string {
    return `Removed ${label.toLowerCase()} entry`;
  }

  return { type, label, computeAlertLevel, urgency, describe, historyRows, describeAdd, describeUpdate, describeDelete };
}

export const inspectionTracker = makeInspectionTracker('inspection', 'Inspection Report');
export const termiteTracker = makeInspectionTracker('termite', 'Termite Inspection', cfg => cfg.termiteApplicable);
