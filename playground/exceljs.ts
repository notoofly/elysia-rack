import { Elysia } from "elysia";
import { dashboard, rack } from "../src/rack/index.ts";
import { reactPlugin } from "../src/react/index.ts";

const file = process.env.EXCEL_FILE ?? "./playground/products.xlsx";

const app = new Elysia()
  .use(reactPlugin())
  .use(dashboard({ title: "Elysia Rack - ExcelJS", path: "/" }))
  .use(
    rack("/products", {
      model: {
        exceljs: {
          file,
          worksheet: process.env.EXCEL_WORKSHEET ?? "Sheet1",
          primaryKey: "id",
          changes: { persist: true },
        },
      },
      metadata: {
        id: "products",
        label: "Product",
        pluralLabel: "Products",
        icon: "package",
      },
      settings: { primaryKey: "id", returning: true },
    }),
  )
  .listen(5001);

console.log(`ExcelJS playground: http://localhost:${app.server?.port}/products`);
console.log(`Workbook: ${file}`);

export type App = typeof app;
