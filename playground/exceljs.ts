import ExcelJS from "exceljs";
import { Elysia, t } from "elysia";
import { dashboard, rack } from "../src/rack/index.ts";
import { reactPlugin } from "../src/react/index.ts";

const file = process.env.EXCEL_FILE ?? "./playground/products.xlsx";

async function ensureWorkbook(path: string, worksheet: string) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(path);
  } catch {
    const ws = workbook.addWorksheet(worksheet);
    ws.addRow(["id", "name", "price", "status"]);
    ws.addRow([1, "Keyboard", 850000, "active"]);
    ws.addRow([2, "Mouse", 250000, "active"]);
    await workbook.xlsx.writeFile(path);
  }
}

const worksheet = process.env.EXCEL_WORKSHEET ?? "Products";
await ensureWorkbook(file, worksheet);

const ProductSchema = t.Object({
  id: t.Integer(),
  name: t.String(),
  price: t.Number(),
  status: t.Union([t.Literal("active"), t.Literal("archived")]),
});

const app = new Elysia()
  .use(reactPlugin())
  .use(dashboard({ title: "Elysia Rack - ExcelJS", path: "/" }))
  .use(
    rack("/products", {
      model: {
        exceljs: {
          file,
          worksheet,
          primaryKey: "id",
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
        icon: "package",
        fields: {
          price: { label: "Price", format: "currency", currency: "IDR" },
          status: { label: "Status", format: "badge" },
        },
      },
      settings: { primaryKey: "id", returning: true },
    }),
  )
  .listen(5001);

console.log(`ExcelJS playground: http://localhost:${app.server?.port}/products`);
console.log(`Workbook: ${file}`);

export type App = typeof app;
