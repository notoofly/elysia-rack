import Elysia from "elysia";
import { ReactRack } from "./types";
export declare function page<Props = Record<string, never>>(path: string, props?: Props): ReactRack.PageDescriptor<Props>;
export declare const pages: ReactRack.PageRegistry;
export declare function reactPlugin(options?: ReactRack.ReactPluginOptions): Elysia<"", {
    decorator: {
        react: {
            render: (path: string, props: unknown) => Promise<Response>;
        };
    };
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
}, {
    __rack: {
        ":name": {
            get: {
                body: unknown;
                params: {
                    name: string;
                } & {};
                query: unknown;
                headers: unknown;
                response: {
                    200: Response;
                    404: "Panel asset not found";
                    422: {
                        type: "validation";
                        on: string;
                        summary?: string;
                        message?: string;
                        found?: unknown;
                        property?: string;
                        expected?: string;
                    };
                };
            };
        };
    };
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {
        200: Response;
    };
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}>;
