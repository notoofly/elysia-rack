export type { CrudDrizzleModel } from "./drizzle.ts";
export type { CrudPrismaModel } from "./prisma.ts";

import type { CrudDrizzleModel } from "./drizzle.ts";
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
