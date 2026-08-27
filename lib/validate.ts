import type { Category, DualKeyRole, InspectionEntry, InspectionResult, LeaseEntry, RatesEntry, WaterEntry } from './types';

// Input validation for everything the UI can submit.
//
// In the full product these ran server-side, inside the API routes, because a
// browser can't be trusted to police its own requests. The demo has no server,
// so lib/demo/api.ts calls them directly instead — same validators, same
// messages surfaced in the same modals. The rule they encode (never widen what
// a caller is allowed to write) is worth keeping either way: it's what stops a
// malformed date or a stray field reaching the store.

// Thrown by the field validators below. lib/demo/api.ts lets it propagate to
// the calling component, which shows the message inline on the form.
export class ValidationError extends Error {}

// ─── Field validators ─────────────────────────────────────────────────────
// All accept the raw body value and either return a normalized value or throw.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function optionalDate(v: unknown, name: string): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || !ISO_DATE.test(v) || isNaN(Date.parse(v))) {
    throw new ValidationError(`${name} must be a date in YYYY-MM-DD format`);
  }
  return v;
}

export function optionalAmount(v: unknown, name = 'amount'): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) throw new ValidationError(`${name} must be a non-negative number`);
  return n;
}

export function optionalText(v: unknown, name: string, maxLen = 2000): string {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') throw new ValidationError(`${name} must be text`);
  if (v.length > maxLen) throw new ValidationError(`${name} is too long (max ${maxLen} characters)`);
  return v;
}

export function requiredText(v: unknown, name: string, maxLen = 500): string {
  const s = optionalText(v, name, maxLen).trim();
  if (!s) throw new ValidationError(`${name} is required`);
  return s;
}

export function optionalBool(v: unknown, name: string): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'boolean') throw new ValidationError(`${name} must be true or false`);
  return v;
}

export function category(v: unknown): Category {
  if (v === 'green' || v === 'orange' || v === 'purple') return v;
  throw new ValidationError('category must be one of: green, orange, purple');
}

export function dualKeyRole(v: unknown): DualKeyRole | null {
  if (v === undefined || v === null || v === '') return null;
  if (v === 'primary' || v === 'secondary') return v;
  throw new ValidationError('dualKeyRole must be primary, secondary, or empty');
}

export function quarterPeriod(v: unknown): RatesEntry['quarterPeriod'] {
  if (v === 'Aug' || v === 'Nov' || v === 'Feb' || v === 'May') return v;
  throw new ValidationError('quarterPeriod must be one of: Feb, May, Aug, Nov');
}

export function year(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) {
    throw new ValidationError('year must be a whole number between 2000 and 2100');
  }
  return n;
}

export function inspectionResult(v: unknown): InspectionResult {
  if (v === undefined || v === null) return 'pending';
  if (v === 'pass' || v === 'fail' || v === 'pending') return v;
  throw new ValidationError('result must be one of: pass, fail, pending');
}

function optionalProvider(v: unknown): string | null {
  const s = optionalText(v, 'provider', 200);
  return s || null;
}

// ─── Body parsers (one per tracker shape) ─────────────────────────────────
// Only fields present in the body come back, so PUTs stay partial updates.

type Body = Record<string, unknown>;

export function parseRatesBody(body: Body, mode: 'create' | 'update'): Partial<RatesEntry> {
  const out: Partial<RatesEntry> = {};
  if (mode === 'create' || 'quarterPeriod' in body) out.quarterPeriod = quarterPeriod(body.quarterPeriod);
  if (mode === 'create' || 'year' in body) out.year = year(body.year);
  if ('amount' in body) out.amount = optionalAmount(body.amount);
  if ('provider' in body) out.provider = optionalProvider(body.provider);
  if ('dueDate' in body) out.dueDate = optionalDate(body.dueDate, 'dueDate');
  if ('dateReceived' in body) out.dateReceived = optionalDate(body.dateReceived, 'dateReceived');
  if ('dateForwarded' in body) out.dateForwarded = optionalDate(body.dateForwarded, 'dateForwarded');
  if ('dateChecked' in body) out.dateChecked = optionalDate(body.dateChecked, 'dateChecked');
  if ('paid' in body) out.paid = optionalBool(body.paid, 'paid');
  if ('paidDate' in body) out.paidDate = optionalDate(body.paidDate, 'paidDate');
  if ('notes' in body) out.notes = optionalText(body.notes, 'notes');
  return out;
}

export function parseWaterBody(body: Body): Partial<WaterEntry> {
  const out: Partial<WaterEntry> = {};
  if ('dueDate' in body) out.dueDate = optionalDate(body.dueDate, 'dueDate');
  if ('amount' in body) out.amount = optionalAmount(body.amount);
  if ('provider' in body) out.provider = optionalProvider(body.provider);
  if ('dateReceived' in body) out.dateReceived = optionalDate(body.dateReceived, 'dateReceived');
  if ('dateForwarded' in body) out.dateForwarded = optionalDate(body.dateForwarded, 'dateForwarded');
  if ('dateChecked' in body) out.dateChecked = optionalDate(body.dateChecked, 'dateChecked');
  if ('paid' in body) out.paid = optionalBool(body.paid, 'paid');
  if ('paidDate' in body) out.paidDate = optionalDate(body.paidDate, 'paidDate');
  if ('notes' in body) out.notes = optionalText(body.notes, 'notes');
  return out;
}

export function parseLeaseBody(body: Body): Partial<LeaseEntry> {
  const out: Partial<LeaseEntry> = {};
  if ('startDate' in body) out.startDate = optionalDate(body.startDate, 'startDate');
  if ('endDate' in body) out.endDate = optionalDate(body.endDate, 'endDate');
  if ('rent' in body) out.rent = optionalAmount(body.rent, 'rent');
  if ('tenant' in body) out.tenant = optionalText(body.tenant, 'tenant', 200) || null;
  if ('notes' in body) out.notes = optionalText(body.notes, 'notes');
  if (out.startDate && out.endDate && out.endDate < out.startDate) {
    throw new ValidationError('lease end date must be on or after the start date');
  }
  return out;
}

export function parseInspectionBody(body: Body): Partial<InspectionEntry> {
  const out: Partial<InspectionEntry> = {};
  if ('dueDate' in body) out.dueDate = optionalDate(body.dueDate, 'dueDate');
  if ('completedDate' in body) out.completedDate = optionalDate(body.completedDate, 'completedDate');
  if ('result' in body) out.result = inspectionResult(body.result);
  if ('provider' in body) out.provider = optionalProvider(body.provider);
  if ('notes' in body) out.notes = optionalText(body.notes, 'notes');
  return out;
}
