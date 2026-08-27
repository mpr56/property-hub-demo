import type { RatesEntry, Category } from './types';
import { quarterRank } from './types';
import { color } from './tokens';

export function sortedEntries(entries: RatesEntry[]): RatesEntry[] {
  return [...entries].sort((a, b) => quarterRank(b) - quarterRank(a));
}

export function latestEntry(entries: RatesEntry[]): RatesEntry | null {
  const sorted = sortedEntries(entries);
  return sorted[0] ?? null;
}

export interface EntryStatus {
  label: string;
  hex: string;
}

// The minimal shape entryStatus needs — both RatesEntry and WaterEntry satisfy
// it, since rates and water share the green/orange delivery workflow.
export interface WorkflowEntry {
  paid: boolean;
  dateReceived: string | null;
  dateForwarded: string | null;
  dateChecked: string | null;
}

/** Fine-grained workflow status for a single entry, aware of that tracker's category. */
export function entryStatus(entry: WorkflowEntry, category: Category): EntryStatus {
  if (entry.paid) return { label: 'Paid', hex: color.green };

  if (category === 'green') {
    if (entry.dateForwarded) return { label: 'Forwarded — awaiting payment', hex: color.orange };
    if (entry.dateReceived) return { label: 'Received — not forwarded', hex: color.red };
    return { label: 'Not received yet', hex: color.red };
  }

  if (category === 'orange') {
    if (entry.dateChecked) return { label: 'Checked — awaiting confirmation', hex: color.orange };
    return { label: 'Not checked yet', hex: color.red };
  }

  return { label: 'Unpaid', hex: color.red };
}
