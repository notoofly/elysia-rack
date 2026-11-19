/**
 * Drizzle model binding. The database handle stays opaque (driver-specific),
 * while the table carries its full column type so field names and settings
 * can be inferred from the model.
 */
export interface CrudDrizzleModel<
  TDatabase = object,
  TTable extends object = object,
> {
  db: TDatabase;
  table: TTable;
}

/**
 * Extract the column names of a drizzle table. Reads the internal
 * `table._.columns` record so only real columns are listed — plain
 * `keyof TTable` would also surface inherited internals such as
 * `$inferSelect`, `$inferInsert`, and `getSQL`.
 */
export type CrudDrizzleFieldNames<TTable> = TTable extends {
  _: { columns: infer TColumns };
}
  ? keyof TColumns & string
  : string;
