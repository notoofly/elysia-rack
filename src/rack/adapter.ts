import type { Rack } from "./types/index.ts";

export type AdapterName = "drizzle" | "prisma" | "exceljs" | "google-sheets";

/**
 * Resolve which adapter a `CrudModel` targets.
 */
export function resolveAdapter(model: Rack.CrudModel): AdapterName {
  if ("drizzle" in model && model.drizzle !== undefined) return "drizzle";
  if ("prisma" in model && model.prisma !== undefined) return "prisma";
  if ("exceljs" in model && model.exceljs !== undefined) return "exceljs";
  return "google-sheets";
}
