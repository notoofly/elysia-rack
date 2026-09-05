import type { Rack } from "./types";
/**
 * Normalized list query produced by {@link parseListQuery}.
 */
export type ParsedListQuery = ReturnType<typeof parseListQuery>;
/**
 * Parse raw URL/body input into a normalized list query,
 * honoring `CrudQueryOptions` whitelists and pagination.
 */
export declare function parseListQuery(raw: Record<string, unknown>, queryOptions?: Rack.CrudQueryOptions): {
    search: {
        value: string;
        fields: readonly string[];
    } | undefined;
    filters: Record<string, unknown>;
    sort: {
        field: string;
        direction: import("./types/query").CrudSortDirection;
    } | undefined;
    page: number;
    limit: number;
};
