import { v4 as uuidv4 } from 'uuid';
import type { ActivityEvent, DualKeyRole, InspectionEntry, LeaseEntry, PropertyConfig, PropertySummary, RatesEntry, WaterEntry, Category, TrackerType } from './types';
import { storage } from './storage';
import * as lease from './trackers/lease';
import * as rates from './trackers/rates';
import * as water from './trackers/water';
import { inspectionTracker, termiteTracker } from './trackers/inspection';

// All business logic for reading/writing properties. Persistence goes through
// lib/storage.ts — this module never touches the filesystem or network
// directly, which is exactly why the demo build could swap a database for an
// in-memory map without changing a line of it.

// Keep activity logs from growing unbounded on long-lived properties.
const MAX_ACTIVITY_EVENTS = 200;

function toSummary(cfg: PropertyConfig): PropertySummary {
  const { id, address, suburb, council, ratesCategory, waterCategory, termiteApplicable, dwellingType, dualKeyRole, dualKeyRatesShared, dualKeyWaterShared, waterExternalBill, waterExternalBillNote, ratesExternalBill, ratesExternalBillNote, methodOfDelivery, owner, tenantedSince, dataIssue, notes, createdAt } = cfg;
  return { id, address, suburb, council, ratesCategory, waterCategory, termiteApplicable, dwellingType, dualKeyRole, dualKeyRatesShared, dualKeyWaterShared, waterExternalBill, waterExternalBillNote, ratesExternalBill, ratesExternalBillNote, methodOfDelivery, owner, tenantedSince, dataIssue, notes, createdAt };
}

function logActivity(cfg: PropertyConfig, summary: string, trackerType?: TrackerType): void {
  const event: ActivityEvent = { id: uuidv4(), at: new Date().toISOString(), trackerType, summary };
  cfg.activity.push(event);
  if (cfg.activity.length > MAX_ACTIVITY_EVENTS) {
    cfg.activity.splice(0, cfg.activity.length - MAX_ACTIVITY_EVENTS);
  }
}

// ─── Properties ──────────────────────────────────────────────────────────

export async function listFullProperties(): Promise<PropertyConfig[]> {
  return storage.list();
}

export async function listProperties(): Promise<PropertySummary[]> {
  return (await storage.list()).map(toSummary);
}

export async function getProperty(id: string): Promise<PropertyConfig | null> {
  return storage.get(id);
}

export async function createProperty(input: {
  address: string;
  suburb: string;
  council: string;
  ratesCategory: Category;
  waterCategory: Category;
  termiteApplicable?: boolean;
  dwellingType: string;
  dualKeyRole?: DualKeyRole | null;
  dualKeyRatesShared?: boolean;
  dualKeyWaterShared?: boolean;
  methodOfDelivery?: string;
  owner?: string;
  tenantedSince?: string | null;
  notes?: string;
}): Promise<PropertyConfig> {
  const id = slugify(input.address) + '-' + uuidv4().slice(0, 6);
  const now = new Date().toISOString();
  const cfg: PropertyConfig = {
    id,
    address: input.address,
    suburb: input.suburb,
    council: input.council,
    ratesCategory: input.ratesCategory,
    waterCategory: input.waterCategory,
    termiteApplicable: input.termiteApplicable ?? true,
    dwellingType: input.dwellingType,
    dualKeyRole: input.dualKeyRole ?? null,
    dualKeyRatesShared: input.dualKeyRatesShared,
    dualKeyWaterShared: input.dualKeyWaterShared,
    methodOfDelivery: input.methodOfDelivery ?? '',
    owner: input.owner ?? '',
    tenantedSince: input.tenantedSince ?? null,
    dataIssue: false,
    notes: input.notes ?? '',
    createdAt: now,
    attributes: {
      trackers: {
        lease: { entries: [] },
        rates: { entries: [] },
        water: { entries: [] },
        inspection: { entries: [] },
        termite: { entries: [] },
      },
    },
    activity: [],
  };
  logActivity(cfg, 'Property created');
  await storage.save(cfg);
  return cfg;
}

const EDITABLE_FIELDS = [
  'address', 'suburb', 'council', 'ratesCategory', 'waterCategory', 'termiteApplicable', 'dwellingType',
  'dualKeyRole', 'dualKeyRatesShared', 'dualKeyWaterShared', 'waterExternalBill', 'waterExternalBillNote', 'ratesExternalBill', 'ratesExternalBillNote', 'methodOfDelivery', 'owner', 'tenantedSince', 'dataIssue', 'notes',
] as const;

export async function updateProperty(id: string, updates: Partial<Omit<PropertyConfig, 'id' | 'attributes' | 'createdAt' | 'activity'>>): Promise<PropertyConfig | null> {
  const cfg = await getProperty(id);
  if (!cfg) return null;
  // Only copy over the editable fields — never id/attributes/activity/createdAt,
  // no matter what the caller passes in.
  const changedFields = EDITABLE_FIELDS.filter(f => f in updates && updates[f] !== cfg[f]);
  const updated: PropertyConfig = { ...cfg };
  for (const f of changedFields) {
    (updated as unknown as Record<string, unknown>)[f] = updates[f];
  }
  if (changedFields.length > 0) {
    logActivity(updated, `Updated ${changedFields.join(', ')}`);
  }
  await storage.save(updated);
  return updated;
}

export async function deleteProperty(id: string): Promise<boolean> {
  return storage.remove(id);
}

// Per-tracker whitelists of the fields a PUT may change — id/createdAt/updatedAt
// stay server-controlled no matter what the request body contains.
const LEASE_ENTRY_FIELDS = ['startDate', 'endDate', 'rent', 'tenant', 'notes'] as const;
const RATES_ENTRY_FIELDS = ['quarterPeriod', 'year', 'amount', 'provider', 'dueDate', 'dateReceived', 'dateForwarded', 'dateChecked', 'paid', 'paidDate', 'notes'] as const;
const WATER_ENTRY_FIELDS = ['dueDate', 'amount', 'provider', 'dateReceived', 'dateForwarded', 'dateChecked', 'paid', 'paidDate', 'notes'] as const;
const INSPECTION_ENTRY_FIELDS = ['dueDate', 'completedDate', 'result', 'provider', 'notes'] as const;

function pickFields<T extends object>(source: Partial<T>, fields: readonly (keyof T & string)[]): Partial<T> {
  const out: Partial<T> = {};
  for (const f of fields) {
    if (f in source && source[f] !== undefined) out[f] = source[f];
  }
  return out;
}

// ─── Lease (rent agreement) entries ──────────────────────────────────────

export async function addLeaseEntry(propertyId: string, input: Partial<LeaseEntry>): Promise<PropertyConfig | null> {
  const cfg = await getProperty(propertyId);
  if (!cfg) return null;
  const now = new Date().toISOString();
  const entry: LeaseEntry = {
    id: uuidv4(),
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    rent: input.rent ?? null,
    tenant: input.tenant ?? null,
    notes: input.notes ?? '',
    createdAt: now,
    updatedAt: now,
  };
  cfg.attributes.trackers.lease ??= { entries: [] };
  cfg.attributes.trackers.lease.entries.push(entry);
  logActivity(cfg, lease.describeAdd(entry), 'lease');
  await storage.save(cfg);
  return cfg;
}

export async function updateLeaseEntry(propertyId: string, entryId: string, updates: Partial<LeaseEntry>): Promise<PropertyConfig | null> {
  const cfg = await getProperty(propertyId);
  if (!cfg) return null;
  const entries = cfg.attributes.trackers.lease?.entries;
  if (!entries) return null;
  const idx = entries.findIndex(e => e.id === entryId);
  if (idx === -1) return null;
  const before = entries[idx];
  const after: LeaseEntry = { ...before, ...pickFields(updates, LEASE_ENTRY_FIELDS), updatedAt: new Date().toISOString() };
  entries[idx] = after;
  logActivity(cfg, lease.describeUpdate(before, after), 'lease');
  await storage.save(cfg);
  return cfg;
}

export async function deleteLeaseEntry(propertyId: string, entryId: string): Promise<PropertyConfig | null> {
  const cfg = await getProperty(propertyId);
  if (!cfg) return null;
  const entries = cfg.attributes.trackers.lease?.entries;
  if (!entries) return null;
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return null;
  cfg.attributes.trackers.lease!.entries = entries.filter(e => e.id !== entryId);
  logActivity(cfg, lease.describeDelete(entry), 'lease');
  await storage.save(cfg);
  return cfg;
}

// ─── Rates entries ───────────────────────────────────────────────────────

export async function addRatesEntry(propertyId: string, input: Partial<RatesEntry> & Pick<RatesEntry, 'quarterPeriod' | 'year'>): Promise<PropertyConfig | null> {
  const cfg = await getProperty(propertyId);
  if (!cfg) return null;
  const now = new Date().toISOString();
  const entry: RatesEntry = {
    id: uuidv4(),
    quarterPeriod: input.quarterPeriod,
    year: input.year,
    amount: input.amount ?? null,
    provider: input.provider ?? null,
    dueDate: input.dueDate ?? null,
    dateReceived: null,
    dateForwarded: null,
    dateChecked: null,
    paid: false,
    paidDate: null,
    notes: input.notes ?? '',
    createdAt: now,
    updatedAt: now,
  };
  cfg.attributes.trackers.rates ??= { entries: [] };
  cfg.attributes.trackers.rates.entries.push(entry);
  logActivity(cfg, rates.describeAdd(entry), 'rates');
  await storage.save(cfg);
  return cfg;
}

export async function updateRatesEntry(propertyId: string, entryId: string, updates: Partial<RatesEntry>): Promise<PropertyConfig | null> {
  const cfg = await getProperty(propertyId);
  if (!cfg) return null;
  const entries = cfg.attributes.trackers.rates?.entries;
  if (!entries) return null;
  const idx = entries.findIndex(e => e.id === entryId);
  if (idx === -1) return null;
  const before = entries[idx];
  const after: RatesEntry = { ...before, ...pickFields(updates, RATES_ENTRY_FIELDS), updatedAt: new Date().toISOString() };
  entries[idx] = after;
  logActivity(cfg, rates.describeUpdate(before, after), 'rates');
  await storage.save(cfg);
  return cfg;
}

export async function deleteRatesEntry(propertyId: string, entryId: string): Promise<PropertyConfig | null> {
  const cfg = await getProperty(propertyId);
  if (!cfg) return null;
  const entries = cfg.attributes.trackers.rates?.entries;
  if (!entries) return null;
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return null;
  cfg.attributes.trackers.rates!.entries = entries.filter(e => e.id !== entryId);
  logActivity(cfg, rates.describeDelete(entry), 'rates');
  await storage.save(cfg);
  return cfg;
}

// ─── Water entries ───────────────────────────────────────────────────────

export async function addWaterEntry(propertyId: string, input: Partial<WaterEntry>): Promise<PropertyConfig | null> {
  const cfg = await getProperty(propertyId);
  if (!cfg) return null;
  const now = new Date().toISOString();
  const entry: WaterEntry = {
    id: uuidv4(),
    dueDate: input.dueDate ?? null,
    amount: input.amount ?? null,
    provider: input.provider ?? null,
    dateReceived: null,
    dateForwarded: null,
    dateChecked: null,
    paid: false,
    paidDate: null,
    notes: input.notes ?? '',
    createdAt: now,
    updatedAt: now,
  };
  cfg.attributes.trackers.water ??= { entries: [] };
  cfg.attributes.trackers.water.entries.push(entry);
  logActivity(cfg, water.describeAdd(entry), 'water');
  await storage.save(cfg);
  return cfg;
}

export async function updateWaterEntry(propertyId: string, entryId: string, updates: Partial<WaterEntry>): Promise<PropertyConfig | null> {
  const cfg = await getProperty(propertyId);
  if (!cfg) return null;
  const entries = cfg.attributes.trackers.water?.entries;
  if (!entries) return null;
  const idx = entries.findIndex(e => e.id === entryId);
  if (idx === -1) return null;
  const before = entries[idx];
  const after: WaterEntry = { ...before, ...pickFields(updates, WATER_ENTRY_FIELDS), updatedAt: new Date().toISOString() };
  entries[idx] = after;
  logActivity(cfg, water.describeUpdate(before, after), 'water');
  await storage.save(cfg);
  return cfg;
}

export async function deleteWaterEntry(propertyId: string, entryId: string): Promise<PropertyConfig | null> {
  const cfg = await getProperty(propertyId);
  if (!cfg) return null;
  const entries = cfg.attributes.trackers.water?.entries;
  if (!entries) return null;
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return null;
  cfg.attributes.trackers.water!.entries = entries.filter(e => e.id !== entryId);
  logActivity(cfg, water.describeDelete(entry), 'water');
  await storage.save(cfg);
  return cfg;
}

// ─── Inspection & termite entries ───────────────────────────────────────
// Identical shape/behavior for both tracker types — one generic family
// parameterized by trackerType rather than duplicating the CRUD twice.

function inspectionTrackerFor(type: 'inspection' | 'termite') {
  return type === 'inspection' ? inspectionTracker : termiteTracker;
}

export async function addInspectionEntry(propertyId: string, trackerType: 'inspection' | 'termite', input: Partial<InspectionEntry>): Promise<PropertyConfig | null> {
  const cfg = await getProperty(propertyId);
  if (!cfg) return null;
  const now = new Date().toISOString();
  const entry: InspectionEntry = {
    id: uuidv4(),
    dueDate: input.dueDate ?? null,
    completedDate: null,
    result: input.result ?? 'pending',
    provider: input.provider ?? null,
    notes: input.notes ?? '',
    createdAt: now,
    updatedAt: now,
  };
  cfg.attributes.trackers[trackerType] ??= { entries: [] };
  cfg.attributes.trackers[trackerType]!.entries.push(entry);
  logActivity(cfg, inspectionTrackerFor(trackerType).describeAdd(entry), trackerType);
  await storage.save(cfg);
  return cfg;
}

export async function updateInspectionEntry(propertyId: string, trackerType: 'inspection' | 'termite', entryId: string, updates: Partial<InspectionEntry>): Promise<PropertyConfig | null> {
  const cfg = await getProperty(propertyId);
  if (!cfg) return null;
  const entries = cfg.attributes.trackers[trackerType]?.entries;
  if (!entries) return null;
  const idx = entries.findIndex(e => e.id === entryId);
  if (idx === -1) return null;
  const before = entries[idx];
  const after: InspectionEntry = { ...before, ...pickFields(updates, INSPECTION_ENTRY_FIELDS), updatedAt: new Date().toISOString() };
  entries[idx] = after;
  logActivity(cfg, inspectionTrackerFor(trackerType).describeUpdate(before, after), trackerType);
  await storage.save(cfg);
  return cfg;
}

export async function deleteInspectionEntry(propertyId: string, trackerType: 'inspection' | 'termite', entryId: string): Promise<PropertyConfig | null> {
  const cfg = await getProperty(propertyId);
  if (!cfg) return null;
  const entries = cfg.attributes.trackers[trackerType]?.entries;
  if (!entries) return null;
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return null;
  cfg.attributes.trackers[trackerType]!.entries = entries.filter(e => e.id !== entryId);
  logActivity(cfg, inspectionTrackerFor(trackerType).describeDelete(entry), trackerType);
  await storage.save(cfg);
  return cfg;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
}
