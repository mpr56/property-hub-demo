import type { PropertyConfig } from './types';
import { buildSeedProperties } from './demo/seed';

// The one storage seam in the app. lib/store.ts holds all the business logic
// and talks only to this interface.
//
// In the full product this module picks a backend from the environment —
// Supabase in production, local JSON files for offline development. This is
// the PORTFOLIO DEMO build, so there is exactly one driver: an in-memory map
// seeded from lib/demo/seed.ts. No database, no API keys, no network.
//
// The consequence is the point of the demo: every edit is real and immediately
// visible — add a property, log a bill, mark an inspection failed — but it
// lives only in this browser tab's memory. A reload re-runs the seed and the
// portfolio is back exactly as it started, so visitors can change anything
// without consequence.

export interface StorageDriver {
  readonly name: 'memory';
  list(): Promise<PropertyConfig[]>;
  get(id: string): Promise<PropertyConfig | null>;
  save(cfg: PropertyConfig): Promise<void>;
  remove(id: string): Promise<boolean>;
  /** Discard every change and rebuild the seed portfolio. */
  reset(): void;
}

/**
 * Structural copy on the way in and out. The file and Supabase drivers this
 * replaces both parsed fresh JSON on every read, so callers never shared a
 * reference with the store; keeping that behaviour means lib/store.ts can go
 * on freely mutating what it reads without a half-applied update leaking back
 * into storage when validation rejects it.
 */
function clone<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

// Insertion order is preserved by Map, which keeps the seed order stable and
// puts anything the visitor adds at the end.
let properties = new Map<string, PropertyConfig>();

function seed(): void {
  properties = new Map(buildSeedProperties().map(p => [p.id, p]));
}

seed();

export const storage: StorageDriver = {
  name: 'memory',
  async list() {
    return clone([...properties.values()]);
  },
  async get(id) {
    const cfg = properties.get(id);
    return cfg ? clone(cfg) : null;
  },
  async save(cfg) {
    properties.set(cfg.id, clone(cfg));
  },
  async remove(id) {
    return properties.delete(id);
  },
  reset() {
    seed();
  },
};
