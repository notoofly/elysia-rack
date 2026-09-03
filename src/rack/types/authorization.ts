export type CrudOperation =
  | "list"
  | "detail"
  | "create"
  | "replace"
  | "update"
  | "delete";

export type CrudAuthorizationRule =
  | boolean
  | string
  | ((context: CrudAuthorizationContext) => boolean | Promise<boolean>);

export interface CrudAuthorizationContext {
  operation: CrudOperation;

  request: Request;

  id?: string;

  resource: unknown;
}

export interface CrudAuthorizationOptions {
  list?: CrudAuthorizationRule;
  detail?: CrudAuthorizationRule;
  create?: CrudAuthorizationRule;
  replace?: CrudAuthorizationRule;
  update?: CrudAuthorizationRule;
  delete?: CrudAuthorizationRule;
}
