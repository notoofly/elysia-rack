import type { Rack } from "./types";
/**
 * In-memory idempotency store with lazy expiry and a bounded size
 * (oldest entries are evicted first).
 *
 * Scoped per rack instance. Use a shared store (e.g. Redis) via
 * `idempotency.store` when running multiple instances.
 */
export declare function createMemoryIdempotencyStore(maxEntries?: number): Rack.CrudIdempotencyStore;
