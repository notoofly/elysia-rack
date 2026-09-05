import type { ParsedListQuery } from "../query";
import type { Rack } from "../types";
export { drizzleAdapter } from "./drizzle";
export { prismaAdapter } from "./prisma";
export interface AdapterOptions {
    primaryKey: string;
    deletedAtField?: string;
    returning?: boolean;
    softDelete?: boolean;
}
export interface ListResult {
    data: unknown[];
    total: number;
}
export type FieldKind = "text" | "integer" | "number" | "boolean" | "date" | "enum" | "json";
export interface FieldDescriptor {
    name: string;
    kind: FieldKind;
    primary: boolean;
    autoIncrement: boolean;
    nullable: boolean;
    enumValues?: readonly string[];
}
/**
 * ORM adapter contract. Each method returns `null` when the target
 * row does not exist (handlers map it to 404), or `undefined` data
 * when `returning` is disabled.
 */
export interface CrudAdapter {
    readonly name: "drizzle" | "prisma";
    /**
     * Introspect writable fields for smart forms.
     * Returns `[]` when the ORM exposes no schema (e.g. Prisma delegates);
     * callers then fall back to text inputs derived from row data.
     */
    describe(model: Rack.CrudModel): FieldDescriptor[];
    list(model: Rack.CrudModel, query: ParsedListQuery, opts: AdapterOptions): Promise<ListResult>;
    detail(model: Rack.CrudModel, id: string, opts: AdapterOptions): Promise<unknown | null>;
    create(model: Rack.CrudModel, body: unknown, opts: AdapterOptions): Promise<unknown>;
    replace(model: Rack.CrudModel, id: string, body: unknown, opts: AdapterOptions): Promise<unknown | null>;
    update(model: Rack.CrudModel, id: string, body: unknown, opts: AdapterOptions): Promise<unknown | null>;
    remove(model: Rack.CrudModel, id: string, opts: AdapterOptions & {
        softDelete?: boolean;
    }): Promise<unknown | null>;
}
export declare function getAdapter(model: Rack.CrudModel): CrudAdapter;
/**
 * Whether a column type holds integers.
 *
 * Unknown columns (e.g. Prisma delegates) are treated as numeric-friendly.
 */
export declare function isNumericColumn(columnType?: string): boolean;
/**
 * Coerce a string route id to the column type.
 *
 * Integer-like columns (or unknown columns, e.g. Prisma delegates)
 * turn numeric strings into numbers; everything else passes through.
 */
export declare function coerceIdValue(id: string, columnType?: string): unknown;
