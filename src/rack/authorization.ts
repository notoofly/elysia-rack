import { status } from "elysia";
import type { Rack } from "./types";

export interface AuthCheck {
  request: Request;
  id?: string;
  resource: unknown;
  permissions?: unknown;
  store?: Record<string, unknown>;
}

/**
 * Resolve `true`/`false`/permission-string/function rules.
 *
 * - `undefined` / `true` → allow
 * - `false` → 403
 * - `string` → treated as required permission. Checked against
 *   `permissions` decorated on context (e.g. by an auth plugin) or the
 *   `x-permissions` header (comma-separated). Allowed when no auth source
 *   is wired yet (TODO: strict mode once auth plugin lands).
 * - `function` → awaited, `false` → 403
 */
export async function authorize(
  operation: Rack.CrudOperation,
  rule: Rack.CrudAuthorizationRule | undefined,
  ctx: AuthCheck,
) {
  const forbidden = (extra?: Record<string, unknown>) =>
    status(403, {
      error: "Forbidden",
      operation,
      ...(extra ?? {}),
    });

  if (rule === undefined || rule === true) return null;
  if (rule === false) return forbidden();

  if (typeof rule === "string") {
    const fromContext = Array.isArray(ctx.permissions)
      ? ctx.permissions
      : Array.isArray(ctx.store?.["permissions"])
        ? (ctx.store?.["permissions"] as unknown[])
        : null;

    if (fromContext !== null)
      return (fromContext as unknown[]).includes(rule)
        ? null
        : forbidden({ requiredPermission: rule });

    const header = ctx.request.headers.get("x-permissions");
    if (typeof header === "string" && header.length > 0) {
      const granted = header.split(",").map((s) => s.trim());
      return granted.includes(rule)
        ? null
        : forbidden({ requiredPermission: rule });
    }

    // TODO(auth): deny-by-default once the auth plugin provides permissions.
    return null;
  }

  const allowed = await rule({
    operation,
    request: ctx.request,
    id: ctx.id,
    resource: ctx.resource,
  });
  return allowed ? null : forbidden();
}
