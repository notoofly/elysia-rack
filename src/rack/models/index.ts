export type { CrudDrizzleModel } from "./drizzle";
export type { CrudPrismaModel } from "./prisma";

import type { CrudDrizzleModel } from "./drizzle";
import type { CrudPrismaModel } from "./prisma";

/**
 * ORM model/resource configuration.
 *
 * Union dibuat agar satu resource tidak sengaja
 * memiliki dua ORM sekaligus.
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
