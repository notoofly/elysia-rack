/**
 * ExcelJS workbook binding. Use either a file path or an in-memory workbook.
 */
export interface CrudExcelJSModel<TWorkbook = object> {
  file?: string;
  workbook?: TWorkbook;
  worksheet: string;
  primaryKey?: string;
  headerRow?: number;
  /**
   * Auto-persist workbook mutations to `file`.
   * Default: true when `file` is provided.
   */
  persist?: boolean;
  /**
   * Create worksheet when missing.
   * Default: false.
   */
  createWorksheet?: boolean;
}
