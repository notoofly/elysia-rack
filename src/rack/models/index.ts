export type { CrudDrizzleModel, CrudDrizzleFieldNames } from "./drizzle.ts";
export type { CrudPrismaModel } from "./prisma.ts";
export type { CrudExcelJSModel } from "./exceljs.ts";
export type { CrudGoogleSheetsModel } from "./google-sheets.ts";

import type { CrudDrizzleFieldNames, CrudDrizzleModel } from "./drizzle.ts";
import type { CrudPrismaModel } from "./prisma.ts";
import type { CrudExcelJSModel } from "./exceljs.ts";
import type { CrudGoogleSheetsModel } from "./google-sheets.ts";

type SchemaFieldName<TSchema> = TSchema extends { properties: Record<infer K, unknown> }
  ? K & string
  : string;

/**
 * ORM/model/resource configuration.
 *
 * Union so a single resource cannot accidentally
 * hold two providers at once.
 */
export type CrudModel =
  | {
      drizzle: CrudDrizzleModel;
      prisma?: never;
      exceljs?: never;
      googleSheets?: never;
    }
  | {
      prisma: CrudPrismaModel;
      drizzle?: never;
      exceljs?: never;
      googleSheets?: never;
    }
  | {
      exceljs: CrudExcelJSModel;
      drizzle?: never;
      prisma?: never;
      googleSheets?: never;
    }
  | {
      googleSheets: CrudGoogleSheetsModel;
      drizzle?: never;
      prisma?: never;
      exceljs?: never;
    };

/**
 * Field names inherited from the bound model.
 *
 * Drizzle tables carry column types. Spreadsheet providers infer field
 * names from a TypeBox `schema` when provided; otherwise they fall back
 * to `string`.
 */
export type CrudFieldName<TModel> = TModel extends {
  drizzle: { table: infer TTable };
}
  ? CrudDrizzleFieldNames<TTable>
  : TModel extends { exceljs: { schema: infer TSchema } }
    ? SchemaFieldName<TSchema>
    : TModel extends { googleSheets: { schema: infer TSchema } }
      ? SchemaFieldName<TSchema>
      : string;
