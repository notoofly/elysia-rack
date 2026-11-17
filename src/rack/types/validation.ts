import type { AnySchema } from "elysia";

/**
 * Validation schemas for CRUD operations. Accepts Elysia/TypeBox schemas
 * (`t.object({ ... })` and friends); schemas are passed straight through to
 * the route registration.
 */
export interface CrudValidationOptions {
  create?: AnySchema;

  /**
   * PUT: full replacement.
   */
  replace?: AnySchema;

  /**
   * PATCH: partial update.
   */
  update?: AnySchema;

  /**
   * Validate resource ID.
   */
  params?: AnySchema;

  /**
   * Validate QUERY body/query definition.
   */
  query?: AnySchema;
}
