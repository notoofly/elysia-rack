import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { reactPlugin } from "../src/react/index";
import { createRenderer } from "../src/react/render";
import { ReactRack } from "../src/react/types";

function Hello({ name }: { name: string }) {
  return <main>{`Hello ${name}`}</main>;
}

describe("createRenderer", () => {
  it("renders a component registered directly", async () => {
    const render = createRenderer({ "/hello": Hello });
    const res = await render("/hello", { name: "Ada" });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Hello Ada");
  });

  it("renders a lazy loader", async () => {
    const render = createRenderer({
      "/lazy": ReactRack.lazyPage(() => Promise.resolve({ default: Hello })),
    });
    const res = await render("/lazy", { name: "Ada" });
    expect(await res.text()).toContain("Hello Ada");
  });
});

describe("reactPlugin views", () => {
  it("auto-mounts a view at its path", async () => {
    const app = new Elysia().use(
      reactPlugin({
        views: [{ path: "/hello", component: Hello, props: { name: "Ada" } }],
      }),
    );
    const res = await app.handle(new Request("http://localhost/hello"));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Hello Ada");
  });
});
