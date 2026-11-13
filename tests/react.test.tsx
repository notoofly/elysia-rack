import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { renderToReadableStream, renderToStaticMarkup } from "react-dom/server";
import { reactPlugin } from "../src/react/index";
import { createRenderer } from "../src/react/render";
import { ReactRack } from "../src/react/types";
import Panel from "../src/react/page/Panel";
import { DataTable } from "../src/react/page/components/DataTable";
import { Toolbar } from "../src/react/page/components/Toolbar";

function Hello({ name }: { name: string }) {
  return <main>{`Hello ${name}`}</main>;
}

async function streamText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value);
  }
  return out;
}

describe("createRenderer", () => {
  it("renders a component registered directly", async () => {
    const render = createRenderer({ "/hello": Hello });
    const res = await render("/hello", { name: "Ada" });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Hello Ada");
  });

  it("injects a favicon from metadata.icon into the head", async () => {
    const render = createRenderer({ "/hello": Hello });
    const res = await render("/hello", { name: "Ada", metadata: { icon: "package" } });
    const html = await res.text();
    expect(html).toContain('rel="icon"');
    expect(html).toContain("data:image/svg+xml");
  });

  it("omits the favicon for an unknown icon name", async () => {
    const render = createRenderer({ "/hello": Hello });
    const res = await render("/hello", { name: "Ada", metadata: { icon: "definitely-not-an-icon" } });
    expect(await res.text()).not.toContain('rel="icon"');
  });

  it("renders a lazy loader", async () => {
    const render = createRenderer({
      "/lazy": ReactRack.lazyPage(() => Promise.resolve({ default: Hello })),
    });
    const res = await render("/lazy", { name: "Ada" });
    expect(await res.text()).toContain("Hello Ada");
  });
});

describe("DataTable custom actions", () => {
  it("renders row actions with the resolved primary key", () => {
    const html = renderToStaticMarkup(
      <DataTable
        fields={[
          {
            name: "id",
            label: "id",
            kind: "integer",
            format: "number",
            nullable: false,
            primary: true,
            autoIncrement: true,
            readOnly: false,
            hideInTable: false,
            hideInForm: true,
            order: 0,
          },
        ]}
        rows={[{ id: 7 }]}
        params={{}}
        editable={false}
        actions={[
          { label: "Duplicate", href: "/items/:id/copy" },
          { label: "Archive", href: "/items/:id", method: "POST", confirm: "Archive it?" },
        ]}
      />,
    );
    expect(html).toContain('href="/items/7/copy"');
    expect(html).toContain('data-rack-href="/items/7"');
    expect(html).toContain('data-rack-method="POST"');
    expect(html).toContain("data-rack-actions=");
  });
});

describe("DataTable detail and restore", () => {
  const fields = [
    {
      name: "id",
      label: "ID",
      kind: "integer" as const,
      format: "number" as const,
      nullable: false,
      primary: true,
      autoIncrement: true,
      readOnly: false,
      hideInTable: false,
      hideInForm: true,
      order: 0,
    },
  ];

  it("renders View for rows and Restore for soft-deleted rows", () => {
    const html = renderToStaticMarkup(
      <DataTable
        fields={fields}
        rows={[{ id: 1 }, { id: 2, deletedAt: "2026-01-01" }]}
        params={{}}
        viewable
        editable
        softDelete
        restorable
        deletedAtField="deletedAt"
        primaryKey="id"
      />,
    );
    expect(html).toContain('data-view-id="1"');
    expect(html).toContain('data-restore-id="2"');
    expect(html).not.toContain('data-edit-id="2"');
  });
});

describe("Toolbar filters", () => {
  const fields = [
    {
      name: "status",
      label: "Status",
      kind: "enum" as const,
      format: "text" as const,
      nullable: true,
      primary: false,
      autoIncrement: false,
      readOnly: false,
      hideInTable: false,
      hideInForm: false,
      enumValues: ["active", "archived"],
      order: 0,
    },
  ];

  it("renders an enum select and the show-deleted toggle", () => {
    const html = renderToStaticMarkup(
      <Toolbar fields={fields} filterable={["status"]} params={{}} softDelete />,
    );
    expect(html).toContain('<select name="status"');
    expect(html).toContain("Show deleted");
    expect(html).not.toContain('name="includeDeleted"');
  });

  it("keeps includeDeleted as a hidden field and offers hide-deleted", () => {
    const html = renderToStaticMarkup(
      <Toolbar
        fields={fields}
        filterable={["status"]}
        params={{ includeDeleted: "true" }}
        softDelete
        includeDeleted
      />,
    );
    expect(html).toContain('name="includeDeleted"');
    expect(html).toContain("Hide deleted");
  });
});

describe("Panel field config and relations", () => {
  it("renders configured labels, relation selects, and format options", async () => {
    const stream = await renderToReadableStream(
      <Panel
        resource="items"
        metadata={{
          label: "Item",
          fields: {
            name: { label: "Product name" },
            categoryId: {
              label: "Category",
              relation: { options: [{ value: 1, label: "Shoes" }] },
            },
          },
        }}
        fields={[
          { name: "id", kind: "integer", primary: true, autoIncrement: true, nullable: false },
          { name: "name", kind: "text", primary: false, autoIncrement: false, nullable: false },
          { name: "categoryId", kind: "integer", primary: false, autoIncrement: false, nullable: true },
        ]}
        load={async () => ({ data: [{ id: 1, name: "shirt", categoryId: 1 }], total: 1 })}
      />,
    );
    const html = await streamText(stream);
    expect(html).toContain("Product name");
    expect(html).toContain('<select name="categoryId"');
    expect(html).toContain("Shoes");
    expect(html).toContain('data-rack-fields=');
  });
});

describe("Panel field visibility", () => {
  it("hides metadata.hiddenFields from columns and forms", async () => {
    const stream = await renderToReadableStream(
      <Panel
        resource="items"
        metadata={{ label: "Item", hiddenFields: ["secret"] }}
        fields={[
          { name: "id", kind: "integer", primary: true, autoIncrement: false, nullable: false },
          { name: "name", kind: "text", primary: false, autoIncrement: false, nullable: true },
          { name: "secret", kind: "text", primary: false, autoIncrement: false, nullable: true },
        ]}
        load={async () => ({
          data: [{ id: 1, name: "shirt", secret: "hidden-value" }],
          total: 1,
        })}
      />,
    );
    const html = await streamText(stream);
    expect(html).toContain(">name<");
    expect(html).not.toContain('data-col="secret"');
    expect(html).not.toContain('name="secret"');
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
