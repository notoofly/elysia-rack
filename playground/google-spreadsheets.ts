import { Elysia } from "elysia";
import { dashboard, rack } from "../src/rack/index.ts";
import { reactPlugin } from "../src/react/index.ts";

const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
if (!spreadsheetId) {
  throw new Error("GOOGLE_SPREADSHEET_ID is required");
}

const app = new Elysia()
  .use(reactPlugin())
  .use(dashboard({ title: "Elysia Rack - Google Sheets", path: "/" }))
  .use(
    rack("/products", {
      model: {
        googleSheets: {
          spreadsheetId,
          worksheet: process.env.GOOGLE_WORKSHEET ?? "Sheet1",
          primaryKey: "id",
          auth: {
            type: "google-auth",
            credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          },
        },
      },
      metadata: {
        id: "products",
        label: "Product",
        pluralLabel: "Products",
        icon: "table",
      },
      settings: { primaryKey: "id", returning: true },
    }),
  )
  .listen(5002);

console.log(`Google Sheets playground: http://localhost:${app.server?.port}/products`);

export type App = typeof app;
