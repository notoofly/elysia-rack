import type { AnySchema } from "elysia";

/**
 * Google Sheets binding. `auth` accepts GoogleAuth/OAuth2Client-compatible
 * clients accepted by googleapis.
 */
export interface CrudGoogleSheetsModel<TAuth = object, TSchema extends AnySchema = AnySchema> {
  auth: TAuth;
  spreadsheetId: string;
  worksheet: string;
  primaryKey?: string;
  headerRow?: number;
  /**
   * Cache spreadsheet/worksheet metadata (sheetId, headers, dimensions).
   * Default: 30000ms. Set 0 to disable.
   */
  metadataCacheTtl?: number;
  /**
   * Optional TypeBox record schema. Used for typed field names and
   * field introspection when provided.
   */
  schema?: TSchema;
}
