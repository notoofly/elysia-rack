import type { CrudOperation } from "./authorization";

export interface CrudOpenAPIOptions {
  /**
   * Common metadata applied to all generated operations.
   */
  tags?: readonly string[];

  /**
   * Resource-level description.
   */
  description?: string;

  /**
   * Operation-specific OpenAPI metadata.
   */
  operations?: Partial<Record<CrudOperation, CrudOpenAPIOperation>>;
}

export interface CrudOpenAPIOperation {
  summary?: string;
  description?: string;

  deprecated?: boolean;

  tags?: readonly string[];

  operationId?: string;
}
