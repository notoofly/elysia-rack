/**
 * Google Sheets binding. `auth` accepts GoogleAuth/OAuth2Client-compatible
 * clients accepted by googleapis.
 */
export interface CrudGoogleSheetsModel<TAuth = object> {
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
}
