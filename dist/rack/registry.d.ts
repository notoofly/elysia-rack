import type { Rack } from "./types";
export interface RackRegistration {
    /** Mount path, e.g. `/catalog/products`. */
    path: string;
    /** Resolved metadata (`id` defaults to path). */
    metadata: Rack.CrudMetadata & {
        id: string;
    };
    /** Resolved operations (all default `true`). */
    operations: Required<Rack.CrudOperationsOptions>;
}
/** Tree node for sidebar/dashboard. Children are resources where `metadata.parent === node.metadata.id`. */
export interface RackTreeNode extends RackRegistration {
    children: RackTreeNode[];
}
/**
 * Register a rack resource. Called automatically by `rack()`.
 * Re-registering the same path replaces the previous entry.
 */
export declare function registerRack(reg: RackRegistration): void;
/** List all registered rack resources in registration order. */
export declare function listRacks(): RackRegistration[];
/** Get a single registration by `metadata.id`. */
export declare function getRack(id: string): RackRegistration | undefined;
/** Build a tree from an explicit list (pure, reusable for props.racks). */
export declare function buildRackTree(racks: RackRegistration[]): RackTreeNode[];
/**
 * Build a hierarchical tree from `parent` metadata.
 * - Nodes without `parent` or with missing parent become roots.
 * - Children are sorted by `order` then label.
 */
export declare function getRackTree(): RackTreeNode[];
/** Flatten tree into a depth-first ordered list (useful for legacy dashboard). */
export declare function flatRackTree(tree?: RackTreeNode[]): RackRegistration[];
/** Clear the registry (mainly for tests). */
export declare function clearRacks(): void;
