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
 * - `string` → required permission. Satisfied only by a server-trusted
 *   source: `permissions` decorated on context (e.g. by an auth plugin) or
 *   `permissions` in `app.state`. The caller-controlled `x-permissions`
 *   header is never trusted. No source wired → deny (fail closed).
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
    const granted = Array.isArray(ctx.permissions)
      ? ctx.permissions
      : Array.isArray(ctx.store?.["permissions"])
        ? (ctx.store?.["permissions"] as unknown[])
        : null;

    return granted !== null && (granted as unknown[]).includes(rule)
      ? null
      : forbidden({ requiredPermission: rule });
  }

  const allowed = await rule({
    operation,
    request: ctx.request,
    id: ctx.id,
    resource: ctx.resource,
  });
  return allowed ? null : forbidden();
}
