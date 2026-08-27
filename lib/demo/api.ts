import * as store from '../store';
import { storage } from '../storage';
import { listOpenTasks, completeTask, setTaskDue, resetTasks } from './tasks';
import { linkTasksToProperties, type LinkedTask } from '../taskLinking';
import {
  category, dualKeyRole, requiredText, optionalText, optionalDate, optionalBool,
  parseRatesBody, parseWaterBody, parseLeaseBody, parseInspectionBody,
} from '../validate';
import type { PropertyConfig, PropertySummary, RatesEntry, TrackerType } from '../types';

// ─────────────────────────────────────────────────────────────────────────
// The demo's stand-in for the HTTP API.
//
// In the full product every one of these was a fetch() to a Next.js API route
// which validated the body, called lib/store.ts, and persisted to Supabase.
// This build keeps the middle two steps exactly as they were — same validators,
// same business logic, same activity logging — and drops only the transport.
// Components call these functions where they used to call fetch().
//
// Two deliberate choices carried over from the network version:
//
//   Latency. Every call resolves on a short timer rather than synchronously.
//   Real data arrives late, and the UI is built around that — spinners,
//   optimistic task updates that roll back, disabled buttons mid-save. Making
//   the demo instant would hide all of it.
//
//   Errors. Validators still throw ValidationError, and it still propagates to
//   the caller as an Error with a human message, so the forms surface exactly
//   the same inline messages they did against the real API.
// ─────────────────────────────────────────────────────────────────────────

const READ_LATENCY_MS = 160;
const WRITE_LATENCY_MS = 240;

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

/** Mirrors a 404 from the old API routes. */
export class NotFoundError extends Error {
  constructor(message = 'not found') {
    super(message);
  }
}

// ─── Properties ──────────────────────────────────────────────────────────

export async function listFullProperties(): Promise<PropertyConfig[]> {
  return delay(await store.listFullProperties(), READ_LATENCY_MS);
}

export async function listSummaries(): Promise<PropertySummary[]> {
  return delay(await store.listProperties(), READ_LATENCY_MS);
}

export async function getProperty(id: string): Promise<PropertyConfig | null> {
  return delay(await store.getProperty(id), READ_LATENCY_MS);
}

type Body = Record<string, unknown>;

export async function createProperty(body: Body): Promise<PropertyConfig> {
  const ratesCategory = category(body.ratesCategory);
  const cfg = await store.createProperty({
    address: requiredText(body.address, 'address'),
    suburb: optionalText(body.suburb, 'suburb', 200),
    council: optionalText(body.council, 'council', 200),
    ratesCategory,
    // Water defaults to the rates category unless given explicitly — they're
    // independent, but usually start out the same.
    waterCategory: body.waterCategory === undefined ? ratesCategory : category(body.waterCategory),
    termiteApplicable: optionalBool(body.termiteApplicable, 'termiteApplicable') ?? true,
    dwellingType: optionalText(body.dwellingType, 'dwellingType', 100),
    dualKeyRole: dualKeyRole(body.dualKeyRole),
    dualKeyRatesShared: optionalBool(body.dualKeyRatesShared, 'dualKeyRatesShared'),
    dualKeyWaterShared: optionalBool(body.dualKeyWaterShared, 'dualKeyWaterShared'),
    methodOfDelivery: optionalText(body.methodOfDelivery, 'methodOfDelivery', 200),
    owner: optionalText(body.owner, 'owner', 200),
    tenantedSince: optionalDate(body.tenantedSince, 'tenantedSince'),
    notes: optionalText(body.notes, 'notes'),
  });
  return delay(cfg, WRITE_LATENCY_MS);
}

export async function updateProperty(id: string, body: Body): Promise<PropertyConfig> {
  // Validate only the fields actually present, so partial updates stay partial.
  const updates: Partial<Omit<PropertySummary, 'id' | 'createdAt'>> = {};
  if ('address' in body) updates.address = requiredText(body.address, 'address');
  if ('suburb' in body) updates.suburb = optionalText(body.suburb, 'suburb', 200);
  if ('council' in body) updates.council = optionalText(body.council, 'council', 200);
  if ('ratesCategory' in body) updates.ratesCategory = category(body.ratesCategory);
  if ('waterCategory' in body) updates.waterCategory = category(body.waterCategory);
  if ('termiteApplicable' in body) updates.termiteApplicable = optionalBool(body.termiteApplicable, 'termiteApplicable');
  if ('dwellingType' in body) updates.dwellingType = optionalText(body.dwellingType, 'dwellingType', 100);
  if ('dualKeyRole' in body) updates.dualKeyRole = dualKeyRole(body.dualKeyRole);
  if ('dualKeyRatesShared' in body) updates.dualKeyRatesShared = optionalBool(body.dualKeyRatesShared, 'dualKeyRatesShared');
  if ('dualKeyWaterShared' in body) updates.dualKeyWaterShared = optionalBool(body.dualKeyWaterShared, 'dualKeyWaterShared');
  if ('waterExternalBill' in body) updates.waterExternalBill = optionalBool(body.waterExternalBill, 'waterExternalBill');
  if ('waterExternalBillNote' in body) updates.waterExternalBillNote = optionalText(body.waterExternalBillNote, 'waterExternalBillNote', 300);
  if ('ratesExternalBill' in body) updates.ratesExternalBill = optionalBool(body.ratesExternalBill, 'ratesExternalBill');
  if ('ratesExternalBillNote' in body) updates.ratesExternalBillNote = optionalText(body.ratesExternalBillNote, 'ratesExternalBillNote', 300);
  if ('methodOfDelivery' in body) updates.methodOfDelivery = optionalText(body.methodOfDelivery, 'methodOfDelivery', 200);
  if ('owner' in body) updates.owner = optionalText(body.owner, 'owner', 200);
  if ('tenantedSince' in body) updates.tenantedSince = optionalDate(body.tenantedSince, 'tenantedSince');
  if ('dataIssue' in body) updates.dataIssue = optionalBool(body.dataIssue, 'dataIssue');
  if ('notes' in body) updates.notes = optionalText(body.notes, 'notes');

  const cfg = await store.updateProperty(id, updates);
  if (!cfg) throw new NotFoundError();
  return delay(cfg, WRITE_LATENCY_MS);
}

export async function deleteProperty(id: string): Promise<void> {
  const ok = await store.deleteProperty(id);
  if (!ok) throw new NotFoundError();
  await delay(null, WRITE_LATENCY_MS);
}

// ─── Tracker entries ─────────────────────────────────────────────────────
// One family of calls parameterized by tracker type, matching the route shape
// it replaces (/api/properties/:id/:tracker[/:entryId]).

export async function addEntry(propertyId: string, tracker: TrackerType, body: Body): Promise<PropertyConfig> {
  let cfg: PropertyConfig | null;
  switch (tracker) {
    case 'rates': {
      const input = parseRatesBody(body, 'create');
      cfg = await store.addRatesEntry(propertyId, input as Pick<RatesEntry, 'quarterPeriod' | 'year'> & typeof input);
      break;
    }
    case 'water':
      cfg = await store.addWaterEntry(propertyId, parseWaterBody(body));
      break;
    case 'lease':
      cfg = await store.addLeaseEntry(propertyId, parseLeaseBody(body));
      break;
    case 'inspection':
    case 'termite':
      cfg = await store.addInspectionEntry(propertyId, tracker, parseInspectionBody(body));
      break;
  }
  if (!cfg) throw new NotFoundError('property not found');
  return delay(cfg, WRITE_LATENCY_MS);
}

export async function updateEntry(propertyId: string, tracker: TrackerType, entryId: string, body: Body): Promise<PropertyConfig> {
  let cfg: PropertyConfig | null;
  switch (tracker) {
    case 'rates':
      cfg = await store.updateRatesEntry(propertyId, entryId, parseRatesBody(body, 'update'));
      break;
    case 'water':
      cfg = await store.updateWaterEntry(propertyId, entryId, parseWaterBody(body));
      break;
    case 'lease':
      cfg = await store.updateLeaseEntry(propertyId, entryId, parseLeaseBody(body));
      break;
    case 'inspection':
    case 'termite':
      cfg = await store.updateInspectionEntry(propertyId, tracker, entryId, parseInspectionBody(body));
      break;
  }
  if (!cfg) throw new NotFoundError();
  return delay(cfg, WRITE_LATENCY_MS);
}

export async function deleteEntry(propertyId: string, tracker: TrackerType, entryId: string): Promise<PropertyConfig> {
  let cfg: PropertyConfig | null;
  switch (tracker) {
    case 'rates':
      cfg = await store.deleteRatesEntry(propertyId, entryId);
      break;
    case 'water':
      cfg = await store.deleteWaterEntry(propertyId, entryId);
      break;
    case 'lease':
      cfg = await store.deleteLeaseEntry(propertyId, entryId);
      break;
    case 'inspection':
    case 'termite':
      cfg = await store.deleteInspectionEntry(propertyId, tracker, entryId);
      break;
  }
  if (!cfg) throw new NotFoundError();
  return delay(cfg, WRITE_LATENCY_MS);
}

// ─── Tasks ───────────────────────────────────────────────────────────────

export async function listTasks(): Promise<LinkedTask[]> {
  const [tasks, properties] = await Promise.all([listOpenTasks(), store.listProperties()]);
  return delay(linkTasksToProperties(tasks, properties), READ_LATENCY_MS);
}

export async function patchTask(taskId: string, body: { completed?: boolean; due?: string }): Promise<void> {
  if (body.completed) {
    await completeTask(taskId);
  } else if (body.due) {
    await setTaskDue(taskId, optionalDate(body.due, 'due')!);
  }
  await delay(null, WRITE_LATENCY_MS);
}

// ─── Demo control ────────────────────────────────────────────────────────

/** Throw away every change and rebuild the seed portfolio and task list. */
export function resetDemo(): void {
  storage.reset();
  resetTasks();
}
