export type { CrudDrizzleModel, CrudDrizzleFieldNames } from "./drizzle.ts";
export type { CrudPrismaModel } from "./prisma.ts";

import type { CrudDrizzleFieldNames, CrudDrizzleModel } from "./drizzle.ts";
import type { CrudPrismaModel } from "./prisma.ts";

/**
 * ORM model/resource configuration.
 *
 * Union so a single resource cannot accidentally
 * hold two ORMs at once.
 *
 * @example
 * ```ts
 * model: {
 *   drizzle: { db, table: products }
 * }
 * ```
 */
export type CrudModel =
  | {
      drizzle: CrudDrizzleModel;
      prisma?: never;
    }
  | {
      prisma: CrudPrismaModel;
      drizzle?: never;
    };

/**
 * Field names inherited from the bound model.
 *
 * Drizzle tables carry their column types, so the names come straight from
 * the schema object. Prisma delegates expose no field-level types, so those
 * resources fall back to `string`.
 */
export type CrudFieldName<TModel> = TModel extends {
  drizzle: { table: infer TTable };
}
  ? CrudDrizzleFieldNames<TTable>
  : string;
