import type { Rack } from "./types/index.ts";

interface MemoryEntry {
  record: Rack.CrudIdempotencyRecord;
  expiresAt: number;
}

/**
 * In-memory idempotency store with lazy expiry.
 *
 * Live entries (within their TTL) are never evicted, so the execute-once
 * guarantee holds for the life of the process. `maxEntries` is a soft
 * ceiling that triggers an expired-entry purge; memory grows with the number
 * of unique keys issued within the TTL window. Use a durable shared store
 * (e.g. Redis) for strict execute-once across restarts or multiple instances.
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
      const now = Date.now();
      if (entries.size >= maxEntries) {
        for (const [k, entry] of entries) {
          if (now >= entry.expiresAt) entries.delete(k);
        }
      }
      entries.set(key, {
        record,
        expiresAt: now + ttlSeconds * 1000,
      });
    },
  };
}
