import type * as models from "../models/index.ts";
import type * as authorization from "./authorization.ts";
import type * as actions from "./actions.ts";
import type * as fields from "./fields.ts";
import type * as metadata from "./metadata.ts";
import type * as openapi from "./openapi.ts";
import type * as operations from "./operations.ts";
import type * as page from "./page.ts";
import type * as query from "./query.ts";
import type * as validation from "./validation.ts";
import type * as idempotency from "./idempotency.ts";
import type * as json from "../json.ts";

export namespace Rack {
  // ---------------------------------------------------------------------------
  // Model (single source of truth di ../models)
  // ---------------------------------------------------------------------------

  export type CrudDrizzleModel = models.CrudDrizzleModel;
  export type CrudPrismaModel = models.CrudPrismaModel;
  export type CrudExcelJSModel = models.CrudExcelJSModel;
  export type CrudGoogleSheetsModel = models.CrudGoogleSheetsModel;
  export type CrudModel = models.CrudModel;

  /**
   * Field names inherited from the bound model. Drizzle tables expose their
   * column names; Prisma resources fall back to `string`.
   */
  export type CrudFieldName<TModel extends CrudModel = CrudModel> =
    models.CrudFieldName<TModel>;

  // ---------------------------------------------------------------------------
  // Domain types (single source of truth di file per-domain)
  // ---------------------------------------------------------------------------

  export type CrudOperation = authorization.CrudOperation;
  export type CrudAuthorizationRule<TModel extends CrudModel = CrudModel> =
    authorization.CrudAuthorizationRule<TModel>;
  export type CrudAuthorizationContext<TModel extends CrudModel = CrudModel> =
    authorization.CrudAuthorizationContext<TModel>;
  export type CrudAuthorizationOptions<TModel extends CrudModel = CrudModel> =
    authorization.CrudAuthorizationOptions<TModel>;

  export type CrudSortDirection = query.CrudSortDirection;
  export type CrudQueryOptions<TField extends string = string> =
    query.CrudQueryOptions<TField>;
  export type CrudPaginationOptions = query.CrudPaginationOptions;

  export type CrudOperationsOptions = operations.CrudOperationsOptions;

  export type CrudMetadata<TField extends string = string> =
    metadata.CrudMetadata<TField>;
  export type CrudAction = actions.CrudAction;
  export type CrudFieldConfig = fields.CrudFieldConfig;
  export type CrudFieldFormat = fields.CrudFieldFormat;
  export type CrudFieldOption = fields.CrudFieldOption;
  export type CrudFieldRelation = fields.CrudFieldRelation;

  export type CrudOpenAPIOptions = openapi.CrudOpenAPIOptions;
  export type CrudOpenAPIOperation = openapi.CrudOpenAPIOperation;

  export type CrudValidationOptions = validation.CrudValidationOptions;

  export type CrudPageOptions = page.CrudPageOptions;
  export type CrudSettings<TField extends string = string> =
    page.CrudSettings<TField>;

  export type Awaitable<T> = idempotency.Awaitable<T>;
  /** JSON-safe dynamic value (parsed bodies, rows, query maps). */
  export type JsonValue = json.JsonValue;
  /** Row/request cell: JSON plus `Date` (drizzle timestamp columns). */
  export type Cell = json.Cell;
  /** A stored row or dynamic record. */
  export type RowData = json.RowData;
  export type CrudIdempotencyRecord = idempotency.CrudIdempotencyRecord;
  export type CrudIdempotencyStore = idempotency.CrudIdempotencyStore;
  export type CrudIdempotencyOptions = idempotency.CrudIdempotencyOptions;

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
     * Authorization rules for each operation. The rule function context
     * carries the bound model as `resource`.
     */
    authorization?: authorization.CrudAuthorizationOptions<TModel>;

    /**
     * Configure list/query capabilities. Field names are inherited from the
     * model.
     */
    query?: query.CrudQueryOptions<CrudFieldName<TModel>>;

    /**
     * Enable, disable, or configure CRUD operations.
     */
    operations?: CrudOperationsOptions;

    /**
     * Metadata used by Panel, navigation, breadcrumbs,
     * registry, and generated UI. Field names are inherited from the model.
     */
    metadata?: metadata.CrudMetadata<CrudFieldName<TModel>>;

    /**
     * Extra custom action buttons rendered in the generated Panel.
     *
     * Row actions (default) appear next to Edit/Delete; toolbar actions
     * appear in the page header. Actions with `:id` in `href` receive the
     * row primary key.
     */
    actions?: readonly CrudAction[];

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
    settings?: page.CrudSettings<CrudFieldName<TModel>>;

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
