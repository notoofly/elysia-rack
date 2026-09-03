import type { FieldDescriptor } from "./adapters/index";
import type { Rack } from "./types";

/**
 * Registry key shared with `ReactRack.PAGE` (src/react/types.ts).
 * `Symbol.for` makes both sides resolve to the same symbol
 * without a runtime dependency from rack to react.
 * Must stay in sync.
 */
export const PANEL_PAGE_KEY = "@elysia-panel/react";

export interface PanelPageProps {
  resource: string;
  metadata?: Rack.CrudMetadata;
  query?: Rack.CrudQueryOptions;
  operations?: Rack.CrudOperationsOptions;
  primaryKey?: string;
  params?: Record<string, unknown>;
  queryUrl?: string;
  fields?: FieldDescriptor[];
  deletedAtField?: string;
  load?: (input: Record<string, unknown>) => Promise<{
    data: unknown[];
    total: number;
  }>;
}

/**
 * Build a page descriptor for the React panel,
 * equivalent to `page(path, props)` from `elysia-rack/react`.
 */
export function panelPage(path: string, props: PanelPageProps) {
  return {
    [Symbol.for(PANEL_PAGE_KEY)]: true as const,
    path,
    props,
  };
}
