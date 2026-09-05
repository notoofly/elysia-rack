import Elysia from "elysia";
import type { Rack } from "./types";
export type { Rack } from "./types";
export type * from "./models";
export { buildRackTree, clearRacks, flatRackTree, getRack, getRackTree, listRacks, registerRack, type RackRegistration, type RackTreeNode, } from "./registry";
export { dashboard, type DashboardOptions } from "./dashboard";
export { resolveAdapter } from "./adapter";
export { getAdapter, drizzleAdapter, prismaAdapter, type AdapterOptions, type CrudAdapter, type FieldDescriptor, type FieldKind, type ListResult, } from "./adapters/index";
export { authorize, type AuthCheck } from "./authorization";
export { createMemoryIdempotencyStore } from "./idempotency";
export { detailFor } from "./openapi";
export { panelPage, PANEL_PAGE_KEY, type PanelPageProps } from "./page";
export { parseListQuery } from "./query";
export declare function rack(path: string, options: Rack.RackOptions): Elysia<string, {
    decorator: {};
    store: {};
    derive: {};
    resolve: {};
}, {
    typebox: {};
    error: {};
}, {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
}, {}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}>;
