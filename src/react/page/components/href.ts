/**
 * Build a panel link preserving current params with overrides.
 * Empty values drop the key (e.g. resetting to page 1).
 */
export function href(
  params: Record<string, unknown>,
  over: Record<string, unknown> = {},
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...over })) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const str = query.toString();
  return str ? `?${str}` : "?";
}

/**
 * Page numbers with ellipsis for pagination.
 * Shared by the server renderer and the browser client.
 */
export function pageWindow(page: number, total: number): (number | "…")[] {
  const keep = new Set([1, total, page - 1, page, page + 1]);
  const sorted = [...keep]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}
