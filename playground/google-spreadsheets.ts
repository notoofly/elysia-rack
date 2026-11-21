import { Elysia, t } from "elysia";
import { dashboard, rack } from "../src/rack/index.ts";
import { reactPlugin } from "../src/react/index.ts";

const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
if (!spreadsheetId) {
  throw new Error("GOOGLE_SPREADSHEET_ID is required");
}

const ProductSchema = t.Object({
  id: t.Integer(),
  name: t.String(),
  price: t.Number(),
  status: t.Union([t.Literal("active"), t.Literal("archived")]),
});

const app = new Elysia()
  .use(reactPlugin())
  .use(dashboard({ title: "Elysia Rack - Google Sheets", path: "/" }))
  .use(
    rack("/products", {
      model: {
        googleSheets: {
          spreadsheetId,
          worksheet: process.env.GOOGLE_WORKSHEET ?? "Products",
          primaryKey: "id",
          auth: {
            type: "google-auth",
            credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          },
          schema: ProductSchema,
        },
      },
      validation: {
        create: t.Omit(ProductSchema, ["id"]),
        replace: t.Omit(ProductSchema, ["id"]),
        update: t.Partial(t.Omit(ProductSchema, ["id"])),
      },
      query: {
        searchable: ["name"],
        filterable: ["status"],
        sortable: ["name", "price", "id"],
        defaultSort: { field: "id", direction: "asc" },
      },
      metadata: {
        id: "products",
        label: "Product",
        pluralLabel: "Products",
        icon: "table",
        fields: {
          price: { label: "Price", format: "currency", currency: "IDR" },
          status: { label: "Status", format: "badge" },
        },
      },
      settings: { primaryKey: "id", returning: true },
    }),
  )
  .listen(5002);

console.log(`Google Sheets playground: http://localhost:${app.server?.port}/products`);

export type App = typeof app;
