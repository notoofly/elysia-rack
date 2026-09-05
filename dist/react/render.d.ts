import type { ReactRack } from "./types";
export declare function createRenderer(pages: ReactRack.PageRegistry): (path: string, props: unknown) => Promise<Response>;
