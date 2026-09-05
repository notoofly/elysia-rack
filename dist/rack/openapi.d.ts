import type { Rack } from "./types";
/**
 * Merge resource-level `options.openapi` with per-operation overrides
 * into an Elysia `detail` hook.
 */
export declare function detailFor(options: Rack.CrudOptions, operation: Rack.CrudOperation): Record<string, unknown>;
