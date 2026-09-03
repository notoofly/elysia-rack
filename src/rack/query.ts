import type { Rack } from "./types";

/**
 * Normalized list query produced by {@link parseListQuery}.
 */
export type ParsedListQuery = ReturnType<typeof parseListQuery>;

/**
 * Parse raw URL/body input into a normalized list query,
 * honoring `CrudQueryOptions` whitelists and pagination.
 */
export function parseListQuery(
  raw: Record<string, unknown>,
  queryOptions?: Rack.CrudQueryOptions,
) {
  const pagination = queryOptions?.pagination ?? {};
  const max = pagination.max ?? 100;
  const fallbackLimit = pagination.default ?? 20;

  const limit = Math.min(
    Math.max(Number(raw["limit"] ?? raw["perPage"] ?? fallbackLimit) || 1, 1),
    Math.max(max, 1),
  );
  const page = Math.max(Number(raw["page"] ?? 1) || 1, 1);

  const search =
    typeof raw["search"] === "string" && raw["search"].length > 0
      ? {
          value: raw["search"],
          fields: queryOptions?.searchable ?? [],
        }
      : undefined;

  const requestedSort =
    typeof raw["sort"] === "string" && raw["sort"].length > 0
      ? raw["sort"]
      : undefined;
  const requestedDirection =
    raw["order"] === "asc" || raw["order"] === "desc"
      ? raw["order"]
      : raw["direction"] === "asc" || raw["direction"] === "desc"
        ? raw["direction"]
        : undefined;
  const sortField =
    requestedSort !== undefined &&
    (queryOptions?.sortable === undefined ||
      queryOptions.sortable.includes(requestedSort))
      ? requestedSort
      : queryOptions?.defaultSort?.field;
  const sort =
    sortField !== undefined
      ? {
          field: sortField,
          direction:
            requestedDirection ??
            queryOptions?.defaultSort?.direction ??
            ("asc" as const),
        }
      : undefined;

  const reserved = new Set([
    "search",
    "sort",
    "order",
    "direction",
    "page",
    "limit",
    "perPage",
  ]);
  const filters: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (reserved.has(key)) continue;
    if (
      queryOptions?.filterable !== undefined &&
      !queryOptions.filterable.includes(key)
    )
      continue;
    filters[key] = value;
  }

  return { search, filters, sort, page, limit };
}
