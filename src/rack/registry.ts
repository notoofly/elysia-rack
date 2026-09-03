import type { Rack } from "./types";

export interface RackRegistration {
  /** Mount path, e.g. `/catalog/products`. */
  path: string;

  /** Resolved metadata (`id` defaults to path). */
  metadata: Rack.CrudMetadata & { id: string };

  /** Resolved operations (all default `true`). */
  operations: Required<Rack.CrudOperationsOptions>;
}

const registrations = new Map<string, RackRegistration>();

/**
 * Register a rack resource. Called automatically by `rack()`.
 * Re-registering the same path replaces the previous entry.
 */
export function registerRack(reg: RackRegistration): void {
  registrations.set(reg.path, reg);
}

/** List all registered rack resources in registration order. */
export function listRacks(): RackRegistration[] {
  return [...registrations.values()];
}

/** Clear the registry (mainly for tests). */
export function clearRacks(): void {
  registrations.clear();
}
