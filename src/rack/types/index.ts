import type {
  CrudAuthorizationContext as _CrudAuthorizationContext,
  CrudAuthorizationOptions as _CrudAuthorizationOptions,
  CrudAuthorizationRule as _CrudAuthorizationRule,
  CrudOperation as _CrudOperation,
} from "./authorization";
import type {
  CrudMetadata as _CrudMetadata,
} from "./metadata";
import type {
  CrudOpenAPIOperation as _CrudOpenAPIOperation,
  CrudOpenAPIOptions as _CrudOpenAPIOptions,
} from "./openapi";
import type {
  CrudOperationsOptions as _CrudOperationsOptions,
} from "./operations";
import type {
  CrudPageOptions as _CrudPageOptions,
  CrudSettings as _CrudSettings,
} from "./page";
import type {
  CrudPaginationOptions as _CrudPaginationOptions,
  CrudQueryOptions as _CrudQueryOptions,
  CrudSortDirection as _CrudSortDirection,
} from "./query";
import type {
  CrudValidationOptions as _CrudValidationOptions,
} from "./validation";
import type {
  Awaitable as _Awaitable,
  CrudIdempotencyOptions as _CrudIdempotencyOptions,
  CrudIdempotencyRecord as _CrudIdempotencyRecord,
  CrudIdempotencyStore as _CrudIdempotencyStore,
} from "./idempotency";
import type {
  CrudDrizzleModel as _CrudDrizzleModel,
  CrudModel as _CrudModel,
  CrudPrismaModel as _CrudPrismaModel,
} from "../models";

export namespace Rack {
  // ---------------------------------------------------------------------------
  // Model (single source of truth di ../models)
  // ---------------------------------------------------------------------------

  export type CrudDrizzleModel = _CrudDrizzleModel;
  export type CrudPrismaModel = _CrudPrismaModel;
  export type CrudModel = _CrudModel;

  // ---------------------------------------------------------------------------
  // Domain types (single source of truth di file per-domain)
  // ---------------------------------------------------------------------------

  export type CrudOperation = _CrudOperation;
  export type CrudAuthorizationRule = _CrudAuthorizationRule;
  export type CrudAuthorizationContext = _CrudAuthorizationContext;
  export type CrudAuthorizationOptions = _CrudAuthorizationOptions;

  export type CrudSortDirection = _CrudSortDirection;
  export type CrudQueryOptions = _CrudQueryOptions;
  export type CrudPaginationOptions = _CrudPaginationOptions;

  export type CrudOperationsOptions = _CrudOperationsOptions;

  export type CrudMetadata = _CrudMetadata;

  export type CrudOpenAPIOptions = _CrudOpenAPIOptions;
  export type CrudOpenAPIOperation = _CrudOpenAPIOperation;

  export type CrudValidationOptions = _CrudValidationOptions;

  export type CrudPageOptions = _CrudPageOptions;
  export type CrudSettings = _CrudSettings;

  export type Awaitable<T> = _Awaitable<T>;
  export type CrudIdempotencyRecord = _CrudIdempotencyRecord;
  export type CrudIdempotencyStore = _CrudIdempotencyStore;
  export type CrudIdempotencyOptions = _CrudIdempotencyOptions;

  // ---------------------------------------------------------------------------
  // CrudOptions (root)
  // ---------------------------------------------------------------------------

  export interface CrudOptions<TModel extends CrudModel = CrudModel> {
    /**
     * ORM model/resource configuration.
     *
     * Example:
     * model: {
     *   drizzle: { db, table: products }
     * }
     */
    model: TModel;

    /**
     * Validation for CRUD operations.
     */
    validation?: CrudValidationOptions;

    /**
     * Authorization rules for each operation.
     */
    authorization?: CrudAuthorizationOptions;

    /**
     * Configure list/query capabilities.
     */
    query?: CrudQueryOptions;

    /**
     * Enable, disable, or configure CRUD operations.
     */
    operations?: CrudOperationsOptions;

    /**
     * Metadata used by Panel, navigation, breadcrumbs,
     * registry, and generated UI.
     */
    metadata?: CrudMetadata;

    /**
     * OpenAPI metadata and operation overrides.
     */
    openapi?: CrudOpenAPIOptions;

    /**
     * Optional React page configuration.
     */
    page?: CrudPageOptions;

    /**
     * Arbitrary framework/application settings.
     *
     * Avoid using this for core CRUD behavior.
     */
    settings?: CrudSettings;

    /**
     * Idempotency for POST create.
     *
     * The idempotency key header is required by default.
     */
    idempotency?: CrudIdempotencyOptions;
  }

  /**
   * Historical alias for the `rack(path, options)` signature.
   * Same as `CrudOptions`.
   */
  export type RackOptions<TModel extends CrudModel = CrudModel> =
    CrudOptions<TModel>;
}
