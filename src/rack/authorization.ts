import { status } from "elysia";
import type { Rack } from "./types/index.ts";

/**
 * What route handlers hand to `authorize()`. `resource` is the bound model
 * object; `permissions` must come from server-trusted sources.
 */
export interface AuthCheck<TModel = unknown> {
  request: Request;
  id?: string;
  resource: TModel;
  permissions?: readonly string[];
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
export async function authorize<TModel>(
  operation: Rack.CrudOperation,
  rule: Rack.CrudAuthorizationRule<TModel> | undefined,
  ctx: AuthCheck<TModel>,
) {
  const forbidden = (extra?: Record<string, string>) =>
    status(403, {
      error: "Forbidden",
      operation,
      ...(extra ?? {}),
    });

  if (rule === undefined || rule === true) return null;
  if (rule === false) return forbidden();

  if (typeof rule === "string") {
    const granted: readonly string[] | null = Array.isArray(ctx.permissions)
      ? ctx.permissions
      : Array.isArray(ctx.store?.["permissions"])
        ? (ctx.store?.["permissions"] as readonly string[])
        : null;

    return granted !== null && granted.includes(rule)
      ? null
      : forbidden({ requiredPermission: rule });
  }

  const allowed = await rule({
    operation,
    request: ctx.request,
    id: ctx.id,
    resource: ctx.resource,
    permissions: ctx.permissions,
  });
  return allowed ? null : forbidden();
}
