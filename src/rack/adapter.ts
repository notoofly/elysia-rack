import type { Rack } from "./types";

/**
 * Resolve which ORM adapter a `CrudModel` targets.
 */
export function resolveAdapter(model: Rack.CrudModel): "drizzle" | "prisma" {
  return "drizzle" in model && model.drizzle !== undefined
    ? "drizzle"
    : "prisma";
}
