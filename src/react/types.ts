import type { ComponentType } from "react";

export namespace ReactRack {
  export const PAGE = Symbol.for("@elysia-panel/react")
  export interface PageDescriptor<Props = unknown> {
    [PAGE]: true;
    path: string;
    props?: Props
  }

  export type PageComponent<Props = any> = ComponentType<Props>
  export type PageRegistry = Record<string, () => Promise<{
    default: PageComponent
  }>>

  export interface ReactPluginOptions {
    pages: PageRegistry
  }
}
