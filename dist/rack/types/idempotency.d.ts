export type Awaitable<T> = T | Promise<T>;
export interface CrudIdempotencyRecord {
    status: number;
    body: unknown;
}
/**
 * Pluggable idempotency store.
 *
 * Keys are already scoped per resource (`<resource>::<key>`).
 * Implementations must honor `ttlSeconds` when provided.
 */
export interface CrudIdempotencyStore {
    get(key: string): Awaitable<CrudIdempotencyRecord | undefined>;
    set(key: string, record: CrudIdempotencyRecord, ttlSeconds?: number): Awaitable<void>;
}
export interface CrudIdempotencyOptions {
    /**
     * Enable idempotency for POST create.
     *
     * Default: true.
     */
    enabled?: boolean;
    /**
     * Reject POST without an idempotency key.
     *
     * Default: true (idempotency key is mandatory for POST).
     */
    required?: boolean;
    /**
     * Header carrying the client-generated key.
     *
     * Default: 'Idempotency-Key'.
     */
    header?: string;
    /**
     * How long a stored response is replayed, in seconds.
     *
     * Default: 86400 (24h).
     */
    ttl?: number;
    /**
     * Custom store. Defaults to an in-memory store (per rack instance).
     * Use a shared store (e.g. Redis) when running multiple instances.
     */
    store?: CrudIdempotencyStore;
}
