import { Elysia, t } from "elysia";
import { dashboard, rack } from "../src/rack/index.ts";
import { reactPlugin } from "../src/react/index.ts";

const file = process.env.EXCEL_FILE ?? new URL("./Product-Sales-Region.xlsx", import.meta.url).pathname;
const worksheet = process.env.EXCEL_WORKSHEET ?? "Sheet1";

const SalesSchema = t.Object({
  OrderID: t.String(),
  Date: t.String(),
  Region: t.String(),
  Product: t.String(),
  Quantity: t.Number(),
  UnitPrice: t.Number(),
  StoreLocation: t.String(),
  CustomerType: t.String(),
  Discount: t.Number(),
  Salesperson: t.String(),
  TotalPrice: t.Number(),
  PaymentMethod: t.String(),
  Promotion: t.String(),
  Returned: t.Number(),
  CustomerName: t.String(),
  ShippingCost: t.Number(),
  OrderDate: t.String(),
  DeliveryDate: t.String(),
  RegionManager: t.String(),
});

const app = new Elysia()
  .use(reactPlugin())
  .use(dashboard({ title: "Excel Sales", path: "/" }))
  .use(
    rack("/sales", {
      model: {
        exceljs: {
          file,
          worksheet,
          primaryKey: "OrderID",
          schema: SalesSchema,
        },
      },
      validation: {
        create: SalesSchema,
        replace: SalesSchema,
        update: t.Partial(SalesSchema),
      },
      query: {
        searchable: ["OrderID", "CustomerName", "Salesperson", "Product"],
        filterable: ["Region", "Product", "CustomerType", "PaymentMethod", "Promotion", "Returned"],
        sortable: ["Date", "TotalPrice", "Quantity", "UnitPrice", "ShippingCost", "OrderDate", "DeliveryDate"],
        defaultSort: { field: "Date", direction: "desc" },
        pagination: { default: 20, max: 100 },
      },
      metadata: {
        id: "sales",
        label: "Sale",
        pluralLabel: "Sales",
        group: "Excel",
        icon: "sheet",
        fields: {
          OrderID: { label: "Order ID", order: 1 },
          Date: { label: "Date", order: 2 },
          Region: { label: "Region", order: 3 },
          Product: { label: "Product", order: 4 },
          Quantity: { label: "Qty", order: 5 },
          UnitPrice: { label: "Unit Price", format: "currency", currency: "USD", order: 6 },
          TotalPrice: { label: "Total", format: "currency", currency: "USD", order: 7 },
          Salesperson: { label: "Salesperson", order: 8 },
          PaymentMethod: { label: "Payment", order: 9 },
          CustomerName: { label: "Customer", order: 10 },
          Returned: { label: "Returned", format: "badge", order: 11 },
        },
      },
      settings: { primaryKey: "OrderID", returning: true },
    }),
  )
  .listen(5003);

console.log(`Excel sales example: http://localhost:${app.server?.port}/sales`);
console.log(`Workbook: ${file}`);

export type App = typeof app;
