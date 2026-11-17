import type { DocumentDecoration } from "elysia";
import type { Rack } from "./types/index.ts";

/**
 * Merge resource-level `options.openapi` with per-operation overrides
 * into an Elysia `detail` hook.
 */
export function detailFor<TModel extends Rack.CrudModel>(
  options: Rack.CrudOptions<TModel>,
  operation: Rack.CrudOperation,
): DocumentDecoration {
  const baseTags =
    options.openapi?.tags ??
    (options.metadata?.label !== undefined
      ? [options.metadata.label]
      : options.metadata?.id !== undefined
        ? [options.metadata.id]
        : undefined);
  const baseDescription = options.openapi?.description;
  const over = options.openapi?.operations?.[operation];

  const detail: DocumentDecoration = {};
  const tags = over?.tags ?? baseTags;
  if (tags !== undefined) detail["tags"] = [...tags];
  const description = over?.description ?? baseDescription;
  if (description !== undefined) detail["description"] = description;
  if (over?.summary !== undefined) detail["summary"] = over.summary;
  if (over?.operationId !== undefined)
    detail["operationId"] = over.operationId;
  if (over?.deprecated !== undefined) detail["deprecated"] = over.deprecated;
  return detail;
}
