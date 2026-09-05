import type { Rack } from "./types";
/**
 * Resolve which ORM adapter a `CrudModel` targets.
 */
export declare function resolveAdapter(model: Rack.CrudModel): "drizzle" | "prisma";
