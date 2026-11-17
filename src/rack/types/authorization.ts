import type { Awaitable } from "./idempotency.ts";

export type CrudOperation =
  | "list"
  | "detail"
  | "create"
  | "replace"
  | "update"
  | "delete";

/**
 * Authorization rule for one operation. A function receives a typed context
 * with the bound model as `resource`.
 */
export type CrudAuthorizationRule<TModel = unknown> =
  | boolean
  | string
  | ((context: CrudAuthorizationContext<TModel>) => Awaitable<boolean>);

export interface CrudAuthorizationContext<TModel = unknown> {
  operation: CrudOperation;

  request: Request;

  /** Row id for item routes; absent for collection routes. */
  id?: string;

  /** The model object passed to `rack()`. */
  resource: TModel;

  /** Server-trusted permission list (context decorations or app state). */
  permissions?: readonly string[];
}

export interface CrudAuthorizationOptions<TModel = unknown> {
  list?: CrudAuthorizationRule<TModel>;
  detail?: CrudAuthorizationRule<TModel>;
  create?: CrudAuthorizationRule<TModel>;
  replace?: CrudAuthorizationRule<TModel>;
  update?: CrudAuthorizationRule<TModel>;
  delete?: CrudAuthorizationRule<TModel>;
}
