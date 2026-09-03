export type { CrudDrizzleModel } from "./drizzle";
export type { CrudPrismaModel } from "./prisma";

import type { CrudDrizzleModel } from "./drizzle";
import type { CrudPrismaModel } from "./prisma";

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
