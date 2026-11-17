/**
 * Prisma model binding. Prisma delegates expose no runtime schema and no
 * field-name types, so field names fall back to `string`.
 */
export interface CrudPrismaModel<TClient = object, TDelegate = object> {
  client: TClient;
  model: TDelegate;
}
