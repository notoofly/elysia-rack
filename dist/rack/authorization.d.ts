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
export declare function authorize(operation: Rack.CrudOperation, rule: Rack.CrudAuthorizationRule | undefined, ctx: AuthCheck): Promise<import("elysia").ElysiaCustomStatusResponse<403, {
    readonly error: "Forbidden";
    readonly operation: import("./types/authorization").CrudOperation;
}, 403> | null>;
