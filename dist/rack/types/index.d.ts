import type { CrudAuthorizationContext as _CrudAuthorizationContext, CrudAuthorizationOptions as _CrudAuthorizationOptions, CrudAuthorizationRule as _CrudAuthorizationRule, CrudOperation as _CrudOperation } from "./authorization";
import type { CrudMetadata as _CrudMetadata } from "./metadata";
import type { CrudOpenAPIOperation as _CrudOpenAPIOperation, CrudOpenAPIOptions as _CrudOpenAPIOptions } from "./openapi";
import type { CrudOperationsOptions as _CrudOperationsOptions } from "./operations";
import type { CrudPageOptions as _CrudPageOptions, CrudSettings as _CrudSettings } from "./page";
import type { CrudPaginationOptions as _CrudPaginationOptions, CrudQueryOptions as _CrudQueryOptions, CrudSortDirection as _CrudSortDirection } from "./query";
import type { CrudValidationOptions as _CrudValidationOptions } from "./validation";
import type { Awaitable as _Awaitable, CrudIdempotencyOptions as _CrudIdempotencyOptions, CrudIdempotencyRecord as _CrudIdempotencyRecord, CrudIdempotencyStore as _CrudIdempotencyStore } from "./idempotency";
import type { CrudDrizzleModel as _CrudDrizzleModel, CrudModel as _CrudModel, CrudPrismaModel as _CrudPrismaModel } from "../models";
export declare namespace Rack {
    type CrudDrizzleModel = _CrudDrizzleModel;
    type CrudPrismaModel = _CrudPrismaModel;
    type CrudModel = _CrudModel;
    type CrudOperation = _CrudOperation;
    type CrudAuthorizationRule = _CrudAuthorizationRule;
    type CrudAuthorizationContext = _CrudAuthorizationContext;
    type CrudAuthorizationOptions = _CrudAuthorizationOptions;
    type CrudSortDirection = _CrudSortDirection;
    type CrudQueryOptions = _CrudQueryOptions;
    type CrudPaginationOptions = _CrudPaginationOptions;
    type CrudOperationsOptions = _CrudOperationsOptions;
    type CrudMetadata = _CrudMetadata;
    type CrudOpenAPIOptions = _CrudOpenAPIOptions;
    type CrudOpenAPIOperation = _CrudOpenAPIOperation;
    type CrudValidationOptions = _CrudValidationOptions;
    type CrudPageOptions = _CrudPageOptions;
    type CrudSettings = _CrudSettings;
    type Awaitable<T> = _Awaitable<T>;
    type CrudIdempotencyRecord = _CrudIdempotencyRecord;
    type CrudIdempotencyStore = _CrudIdempotencyStore;
    type CrudIdempotencyOptions = _CrudIdempotencyOptions;
    interface CrudOptions<TModel extends CrudModel = CrudModel> {
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
    type RackOptions<TModel extends CrudModel = CrudModel> = CrudOptions<TModel>;
}
