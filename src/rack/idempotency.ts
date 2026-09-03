import type { Rack } from "./types";

interface MemoryEntry {
  record: Rack.CrudIdempotencyRecord;
  expiresAt: number;
}

/**
 * In-memory idempotency store with lazy expiry and a bounded size
 * (oldest entries are evicted first).
 *
 * Scoped per rack instance. Use a shared store (e.g. Redis) via
 * `idempotency.store` when running multiple instances.
 */
export function createMemoryIdempotencyStore(
  maxEntries = 1000,
): Rack.CrudIdempotencyStore {
  const entries = new Map<string, MemoryEntry>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (entry === undefined) return undefined;
      if (Date.now() >= entry.expiresAt) {
        entries.delete(key);
        return undefined;
      }
      return entry.record;
    },

    set(key, record, ttlSeconds = 86400) {
      if (entries.size >= maxEntries && !entries.has(key)) {
        const oldest = entries.keys().next();
        if (!oldest.done) entries.delete(oldest.value);
      }
      entries.set(key, {
        record,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    },
  };
}
