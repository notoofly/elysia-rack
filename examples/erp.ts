
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { Elysia, t } from "elysia";
import { dashboard, rack } from "../src/rack/index";
import { reactPlugin } from "../src/react/index";

/**
 * examples/erp.ts — Full ERP blueprint (drizzle + elysia-rack)
 *
 * Cakupan: Core/Security, Master Data, CRM, Sales (O2C), Purchasing (P2P),
 * Inventory (ledger), Accounting (double-entry), Manufacturing, HR/Payroll,
 * Project, Asset, Quality, POS, Pricing, Approval/Audit.
 *
 * Prinsip:
 * - stock_movements = source of truth stok (ledger immutable)
 * - journal_entry_lines = source of truth GL (debit_base = credit_base per entry)
 * - inventory_balances / GL balance = projection
 * - Semua dokumen: document_no, document_date, posting_date, status (draft→posted→closed)
 * - Multi-company via company_id
 *
 * Jalankan: bun run examples/erp.ts  (PGlite in-memory, no external DB)
 */

// ---------------------------------------------------------------------------
// 1) ENUMS
// ---------------------------------------------------------------------------
export const docStatusEnum = pgEnum("doc_status", ["draft","submitted","pending_approval","approved","posted","closed","cancelled","rejected","reversed"]);
export const partyTypeEnum = pgEnum("party_type", ["individual","company","customer","supplier"]);
export const productTypeEnum = pgEnum("product_type", ["goods","service","raw_material","finished_goods","variant"]);
export const movementTypeEnum = pgEnum("movement_type", ["PURCHASE_RECEIPT","SALES_DELIVERY","TRANSFER_OUT","TRANSFER_IN","PRODUCTION_ISSUE","PRODUCTION_RECEIPT","ADJUSTMENT_IN","ADJUSTMENT_OUT","RETURN_IN","RETURN_OUT"]);
export const accountTypeEnum = pgEnum("account_type", ["asset","liability","equity","income","expense"]);
export const paymentDirEnum = pgEnum("payment_direction", ["in","out"]);
export const paymentTypeEnum = pgEnum("payment_type", ["CUSTOMER_RECEIPT","SUPPLIER_PAYMENT","REFUND","ADVANCE","TRANSFER"]);
export const employmentStatusEnum = pgEnum("employment_status", ["active","inactive","terminated","probation"]);
export const assetStatusEnum = pgEnum("asset_status", ["draft","active","disposed","sold"]);
export const qualityStatusEnum = pgEnum("quality_status", ["pending","passed","failed"]);

// helper: UUID PK default via JS (compatible PGlite tanpa extension)
const uid = () => crypto.randomUUID();

// ---------------------------------------------------------------------------
// 2) CORE / SECURITY
// ---------------------------------------------------------------------------
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  taxId: varchar("tax_id", { length: 64 }),
  baseCurrencyCode: varchar("base_currency_code", { length: 3 }),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});
export const businessUnits = pgTable("business_units", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});
export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  username: varchar("username", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
});
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  resource: varchar("resource", { length: 128 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
});
export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").notNull().references(() => users.id),
  roleId: uuid("role_id").notNull().references(() => roles.id),
  companyId: uuid("company_id").references(() => companies.id),
});
export const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id").notNull().references(() => roles.id),
  permissionId: uuid("permission_id").notNull().references(() => permissions.id),
});
export const currencies = pgTable("currencies", {
  code: varchar("code", { length: 3 }).primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  decimalPlaces: integer("decimal_places").notNull().default(2),
});
export const exchangeRates = pgTable("exchange_rates", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  fromCurrencyCode: varchar("from_currency_code", { length: 3 }).notNull().references(() => currencies.code),
  toCurrencyCode: varchar("to_currency_code", { length: 3 }).notNull().references(() => currencies.code),
  rateDate: date("rate_date").notNull(),
  rate: numeric("rate", { precision: 18, scale: 6 }).notNull(),
});
export const taxes = pgTable("taxes", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  rate: numeric("rate", { precision: 5, scale: 4 }).notNull().default("0"),
  taxType: varchar("tax_type", { length: 32 }).notNull().default("vat"),
});
export const paymentTerms = pgTable("payment_terms", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  dueDays: integer("due_days").notNull().default(30),
});
export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  addressLine1: varchar("address_line1", { length: 255 }).notNull(),
  addressLine2: varchar("address_line2", { length: 255 }),
  city: varchar("city", { length: 128 }),
  province: varchar("province", { length: 128 }),
  postalCode: varchar("postal_code", { length: 32 }),
  countryCode: varchar("country_code", { length: 3 }),
});
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
});

// ---------------------------------------------------------------------------
// 3) MASTER: Party / Product / Warehouse
// ---------------------------------------------------------------------------
export const parties = pgTable("parties", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  partyType: varchar("party_type", { length: 32 }).notNull(),
  code: varchar("code", { length: 64 }).notNull(),
  legalName: varchar("legal_name", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  taxId: varchar("tax_id", { length: 64 }),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [uniqueIndex("ux_parties_company_code").on(t.companyId, t.code)]);
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  partyId: uuid("party_id").notNull().references(() => parties.id),
  paymentTermId: uuid("payment_term_id").references(() => paymentTerms.id),
  creditLimit: numeric("credit_limit", { precision: 18, scale: 2 }).default("0"),
});
export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  partyId: uuid("party_id").notNull().references(() => parties.id),
  paymentTermId: uuid("payment_term_id").references(() => paymentTerms.id),
  leadTimeDays: integer("lead_time_days").default(7),
});
export const partyAddresses = pgTable("party_addresses", {
  partyId: uuid("party_id").notNull().references(() => parties.id),
  addressId: uuid("address_id").notNull().references(() => addresses.id),
  addressType: varchar("address_type", { length: 32 }).notNull().default("billing"),
  isDefault: boolean("is_default").notNull().default(false),
});
export const partyContacts = pgTable("party_contacts", {
  partyId: uuid("party_id").notNull().references(() => parties.id),
  contactId: uuid("contact_id").notNull().references(() => contacts.id),
  role: varchar("role", { length: 64 }),
  isPrimary: boolean("is_primary").notNull().default(false),
});
export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  parentId: uuid("parent_id"),
  code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});
export const uoms = pgTable("uoms", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  factor: numeric("factor", { precision: 18, scale: 6 }).notNull().default("1"),
});
export const products = pgTable("products", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  categoryId: uuid("category_id").references(() => productCategories.id),
  brandId: uuid("brand_id").references(() => brands.id),
  stockUomId: uuid("stock_uom_id").references(() => uoms.id),
  sku: varchar("sku", { length: 64 }).notNull(),
  barcode: varchar("barcode", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  productType: varchar("product_type", { length: 32 }).notNull().default("goods"),
  isStockItem: boolean("is_stock_item").notNull().default(true),
  isSerialized: boolean("is_serialized").notNull().default(false),
  isBatched: boolean("is_batched").notNull().default(false),
  standardCost: numeric("standard_cost", { precision: 18, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [uniqueIndex("ux_products_company_sku").on(t.companyId, t.sku), index("ix_products_name").on(t.name)]);
export const productUoms = pgTable("product_uoms", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  productId: uuid("product_id").notNull().references(() => products.id),
  uomId: uuid("uom_id").notNull().references(() => uoms.id),
  conversionFactor: numeric("conversion_factor", { precision: 18, scale: 6 }).notNull().default("1"),
  isDefaultSales: boolean("is_default_sales").notNull().default(false),
  isDefaultPurchase: boolean("is_default_purchase").notNull().default(false),
});
export const productSuppliers = pgTable("product_suppliers", {
  productId: uuid("product_id").notNull().references(() => products.id),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
  supplierSku: varchar("supplier_sku", { length: 64 }),
  lastPrice: numeric("last_price", { precision: 18, scale: 2 }),
});
export const warehouses = pgTable("warehouses", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  branchId: uuid("branch_id").references(() => branches.id),
  parentId: uuid("parent_id"),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
}, (t) => [uniqueIndex("ux_warehouses_company_code").on(t.companyId, t.code)]);
export const warehouseLocations = pgTable("warehouse_locations", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  warehouseId: uuid("warehouse_id").notNull().references(() => warehouses.id),
  parentId: uuid("parent_id"),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  locationType: varchar("location_type", { length: 32 }).notNull().default("bin"),
});

// ---------------------------------------------------------------------------
// 4) CRM
// ---------------------------------------------------------------------------
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  partyId: uuid("party_id").references(() => parties.id),
  leadNo: varchar("lead_no", { length: 32 }).notNull().unique(),
  source: varchar("source", { length: 64 }),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  estimatedValue: numeric("estimated_value", { precision: 18, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const opportunities = pgTable("opportunities", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  leadId: uuid("lead_id").references(() => leads.id),
  customerId: uuid("customer_id").references(() => customers.id),
  opportunityNo: varchar("opportunity_no", { length: 32 }).notNull().unique(),
  stage: varchar("stage", { length: 32 }).notNull().default("qualification"),
  probability: numeric("probability", { precision: 5, scale: 2 }).default("0"),
  estimatedValue: numeric("estimated_value", { precision: 18, scale: 2 }).default("0"),
  expectedCloseDate: date("expected_close_date"),
});
export const quotations = pgTable("quotations", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  opportunityId: uuid("opportunity_id").references(() => opportunities.id),
  quotationNo: varchar("quotation_no", { length: 32 }).notNull().unique(),
  quotationDate: date("quotation_date").notNull(),
  validUntil: date("valid_until"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  grandTotal: numeric("grand_total", { precision: 18, scale: 2 }).notNull().default("0"),
});
export const quotationItems = pgTable("quotation_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  quotationId: uuid("quotation_id").notNull().references(() => quotations.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  uomId: uuid("uom_id").references(() => uoms.id),
  qty: numeric("qty", { precision: 18, scale: 4 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 18, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 18, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 18, scale: 2 }).default("0"),
  lineTotal: numeric("line_total", { precision: 18, scale: 2 }).notNull(),
});

// ---------------------------------------------------------------------------
// 5) SALES (Order-to-Cash)
// ---------------------------------------------------------------------------
export const salesOrders = pgTable("sales_orders", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  branchId: uuid("branch_id").references(() => branches.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  quotationId: uuid("quotation_id").references(() => quotations.id),
  orderNo: varchar("order_no", { length: 32 }).notNull().unique(),
  orderDate: date("order_date").notNull(),
  currencyCode: varchar("currency_code", { length: 3 }),
  paymentTermId: uuid("payment_term_id").references(() => paymentTerms.id),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  grandTotal: numeric("grand_total", { precision: 18, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [index("ix_sales_orders_customer_date").on(t.companyId, t.customerId, t.orderDate)]);
export const salesOrderItems = pgTable("sales_order_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  salesOrderId: uuid("sales_order_id").notNull().references(() => salesOrders.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  uomId: uuid("uom_id").references(() => uoms.id),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  orderedQty: numeric("ordered_qty", { precision: 18, scale: 4 }).notNull(),
  deliveredQty: numeric("delivered_qty", { precision: 18, scale: 4 }).default("0"),
  invoicedQty: numeric("invoiced_qty", { precision: 18, scale: 4 }).default("0"),
  unitPrice: numeric("unit_price", { precision: 18, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 18, scale: 2 }).notNull(),
});
export const salesDeliveries = pgTable("sales_deliveries", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  salesOrderId: uuid("sales_order_id").references(() => salesOrders.id),
  deliveryNo: varchar("delivery_no", { length: 32 }).notNull().unique(),
  deliveryDate: date("delivery_date").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const salesDeliveryItems = pgTable("sales_delivery_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  deliveryId: uuid("delivery_id").notNull().references(() => salesDeliveries.id),
  salesOrderItemId: uuid("sales_order_item_id").references(() => salesOrderItems.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  sourceLocationId: uuid("source_location_id").references(() => warehouseLocations.id),
  qty: numeric("qty", { precision: 18, scale: 4 }).notNull(),
});
export const salesInvoices = pgTable("sales_invoices", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  salesOrderId: uuid("sales_order_id").references(() => salesOrders.id),
  deliveryId: uuid("delivery_id").references(() => salesDeliveries.id),
  invoiceNo: varchar("invoice_no", { length: 32 }).notNull().unique(),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  grandTotal: numeric("grand_total", { precision: 18, scale: 2 }).notNull().default("0"),
  outstandingAmount: numeric("outstanding_amount", { precision: 18, scale: 2 }).notNull().default("0"),
}, (t) => [index("ix_sales_invoices_customer_status").on(t.companyId, t.customerId, t.status)]);
export const salesInvoiceItems = pgTable("sales_invoice_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  salesInvoiceId: uuid("sales_invoice_id").notNull().references(() => salesInvoices.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  salesOrderItemId: uuid("sales_order_item_id").references(() => salesOrderItems.id),
  qty: numeric("qty", { precision: 18, scale: 4 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 18, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 18, scale: 2 }).default("0"),
  lineTotal: numeric("line_total", { precision: 18, scale: 2 }).notNull(),
});

// ---------------------------------------------------------------------------
// 6) PURCHASING (Procure-to-Pay)
// ---------------------------------------------------------------------------
export const purchaseRequests = pgTable("purchase_requests", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  requestNo: varchar("request_no", { length: 32 }).notNull().unique(),
  requestDate: date("request_date").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const purchaseRequestItems = pgTable("purchase_request_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  purchaseRequestId: uuid("purchase_request_id").notNull().references(() => purchaseRequests.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  uomId: uuid("uom_id").references(() => uoms.id),
  requestedQty: numeric("requested_qty", { precision: 18, scale: 4 }).notNull(),
  requiredDate: date("required_date"),
});
export const requestForQuotations = pgTable("request_for_quotations", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  rfqNo: varchar("rfq_no", { length: 32 }).notNull().unique(),
  rfqDate: date("rfq_date").notNull(),
  responseDueDate: date("response_due_date"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const rfqSuppliers = pgTable("rfq_suppliers", {
  rfqId: uuid("rfq_id").notNull().references(() => requestForQuotations.id),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
});
export const rfqItems = pgTable("rfq_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  rfqId: uuid("rfq_id").notNull().references(() => requestForQuotations.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  uomId: uuid("uom_id").references(() => uoms.id),
  qty: numeric("qty", { precision: 18, scale: 4 }).notNull(),
});
export const supplierQuotations = pgTable("supplier_quotations", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
  rfqId: uuid("rfq_id").references(() => requestForQuotations.id),
  quotationNo: varchar("quotation_no", { length: 32 }).notNull().unique(),
  quotationDate: date("quotation_date").notNull(),
  validUntil: date("valid_until"),
  grandTotal: numeric("grand_total", { precision: 18, scale: 2 }).notNull().default("0"),
});
export const supplierQuotationItems = pgTable("supplier_quotation_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  supplierQuotationId: uuid("supplier_quotation_id").notNull().references(() => supplierQuotations.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  qty: numeric("qty", { precision: 18, scale: 4 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 18, scale: 2 }).notNull(),
});
export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
  supplierQuotationId: uuid("supplier_quotation_id").references(() => supplierQuotations.id),
  poNo: varchar("po_no", { length: 32 }).notNull().unique(),
  orderDate: date("order_date").notNull(),
  expectedDate: date("expected_date"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  grandTotal: numeric("grand_total", { precision: 18, scale: 2 }).notNull().default("0"),
}, (t) => [index("ix_purchase_orders_supplier_date").on(t.companyId, t.supplierId, t.orderDate)]);
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  uomId: uuid("uom_id").references(() => uoms.id),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  orderedQty: numeric("ordered_qty", { precision: 18, scale: 4 }).notNull(),
  receivedQty: numeric("received_qty", { precision: 18, scale: 4 }).default("0"),
  billedQty: numeric("billed_qty", { precision: 18, scale: 4 }).default("0"),
  unitPrice: numeric("unit_price", { precision: 18, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 18, scale: 2 }).notNull(),
});
export const goodsReceipts = pgTable("goods_receipts", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
  purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id),
  receiptNo: varchar("receipt_no", { length: 32 }).notNull().unique(),
  receiptDate: date("receipt_date").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  goodsReceiptId: uuid("goods_receipt_id").notNull().references(() => goodsReceipts.id),
  purchaseOrderItemId: uuid("purchase_order_item_id").references(() => purchaseOrderItems.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  locationId: uuid("location_id").references(() => warehouseLocations.id),
  receivedQty: numeric("received_qty", { precision: 18, scale: 4 }).notNull(),
  acceptedQty: numeric("accepted_qty", { precision: 18, scale: 4 }).notNull(),
  rejectedQty: numeric("rejected_qty", { precision: 18, scale: 4 }).default("0"),
  unitCost: numeric("unit_cost", { precision: 18, scale: 2 }).notNull(),
});
export const supplierInvoices = pgTable("supplier_invoices", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
  purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id),
  goodsReceiptId: uuid("goods_receipt_id").references(() => goodsReceipts.id),
  billNo: varchar("bill_no", { length: 32 }).notNull().unique(),
  billDate: date("bill_date").notNull(),
  dueDate: date("due_date"),
  grandTotal: numeric("grand_total", { precision: 18, scale: 2 }).notNull().default("0"),
  outstandingAmount: numeric("outstanding_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const supplierInvoiceItems = pgTable("supplier_invoice_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  supplierInvoiceId: uuid("supplier_invoice_id").notNull().references(() => supplierInvoices.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  qty: numeric("qty", { precision: 18, scale: 4 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 18, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 18, scale: 2 }).default("0"),
  lineTotal: numeric("line_total", { precision: 18, scale: 2 }).notNull(),
});

// ---------------------------------------------------------------------------
// 7) INVENTORY — ledger + projection
// ---------------------------------------------------------------------------
export const batches = pgTable("batches", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  productId: uuid("product_id").notNull().references(() => products.id),
  batchNo: varchar("batch_no", { length: 64 }).notNull().unique(),
  manufacturingDate: date("manufacturing_date"),
  expiryDate: date("expiry_date"),
  status: varchar("status", { length: 32 }).notNull().default("active"),
});
export const serialNumbers = pgTable("serial_numbers", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  productId: uuid("product_id").notNull().references(() => products.id),
  batchId: uuid("batch_id").references(() => batches.id),
  serialNo: varchar("serial_no", { length: 64 }).notNull().unique(),
  status: varchar("status", { length: 32 }).notNull().default("available"),
});
export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  locationId: uuid("location_id").references(() => warehouseLocations.id),
  batchId: uuid("batch_id").references(() => batches.id),
  serialId: uuid("serial_id").references(() => serialNumbers.id),
  movementType: varchar("movement_type", { length: 32 }).notNull(),
  referenceType: varchar("reference_type", { length: 64 }),
  referenceId: uuid("reference_id"),
  movementAt: timestamp("movement_at").notNull().defaultNow(),
  qtyIn: numeric("qty_in", { precision: 18, scale: 4 }).notNull().default("0"),
  qtyOut: numeric("qty_out", { precision: 18, scale: 4 }).notNull().default("0"),
  unitCost: numeric("unit_cost", { precision: 18, scale: 2 }).default("0"),
  valueIn: numeric("value_in", { precision: 18, scale: 2 }).default("0"),
  valueOut: numeric("value_out", { precision: 18, scale: 2 }).default("0"),
}, (t) => [index("ix_stock_movements_lookup").on(t.companyId, t.productId, t.warehouseId, t.movementAt)]);
export const inventoryBalances = pgTable("inventory_balances", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  locationId: uuid("location_id").references(() => warehouseLocations.id),
  batchId: uuid("batch_id").references(() => batches.id),
  qtyOnHand: numeric("qty_on_hand", { precision: 18, scale: 4 }).notNull().default("0"),
  qtyReserved: numeric("qty_reserved", { precision: 18, scale: 4 }).notNull().default("0"),
  avgCost: numeric("avg_cost", { precision: 18, scale: 2 }).notNull().default("0"),
}, (t) => [uniqueIndex("ux_inventory_balances_lookup").on(t.companyId, t.productId, t.warehouseId, t.locationId), index("ix_inventory_balances_lookup").on(t.companyId, t.productId, t.warehouseId, t.locationId)]);
export const stockReservations = pgTable("stock_reservations", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  productId: uuid("product_id").notNull().references(() => products.id),
  warehouseId: uuid("warehouse_id").notNull().references(() => warehouses.id),
  locationId: uuid("location_id").references(() => warehouseLocations.id),
  referenceType: varchar("reference_type", { length: 64 }).notNull(),
  referenceId: uuid("reference_id").notNull(),
  reservedQty: numeric("reserved_qty", { precision: 18, scale: 4 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("reserved"),
});
export const stockTransfers = pgTable("stock_transfers", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  sourceWarehouseId: uuid("source_warehouse_id").notNull().references(() => warehouses.id),
  targetWarehouseId: uuid("target_warehouse_id").notNull().references(() => warehouses.id),
  transferNo: varchar("transfer_no", { length: 32 }).notNull().unique(),
  transferDate: date("transfer_date").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const stockTransferItems = pgTable("stock_transfer_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  stockTransferId: uuid("stock_transfer_id").notNull().references(() => stockTransfers.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  sourceLocationId: uuid("source_location_id").references(() => warehouseLocations.id),
  targetLocationId: uuid("target_location_id").references(() => warehouseLocations.id),
  qty: numeric("qty", { precision: 18, scale: 4 }).notNull(),
});

// ---------------------------------------------------------------------------
// 8) ACCOUNTING — GL double entry
// ---------------------------------------------------------------------------
export const fiscalYears = pgTable("fiscal_years", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  name: varchar("name", { length: 128 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("open"),
});
export const accountingPeriods = pgTable("accounting_periods", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  fiscalYearId: uuid("fiscal_year_id").notNull().references(() => fiscalYears.id),
  name: varchar("name", { length: 128 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("open"),
});
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  parentId: uuid("parent_id"),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  accountType: varchar("account_type", { length: 32 }).notNull(),
  isGroup: boolean("is_group").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => [uniqueIndex("ux_accounts_company_code").on(t.companyId, t.code)]);
export const costCenters = pgTable("cost_centers", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  parentId: uuid("parent_id"),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});
export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  accountingPeriodId: uuid("accounting_period_id").references(() => accountingPeriods.id),
  journalNo: varchar("journal_no", { length: 32 }).notNull().unique(),
  postingDate: date("posting_date").notNull(),
  sourceType: varchar("source_type", { length: 64 }),
  sourceId: uuid("source_id"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [index("ix_journal_entries_posting_date").on(t.companyId, t.postingDate)]);
export const journalEntryLines = pgTable("journal_entry_lines", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  journalEntryId: uuid("journal_entry_id").notNull().references(() => journalEntries.id),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  costCenterId: uuid("cost_center_id").references(() => costCenters.id),
  partyId: uuid("party_id").references(() => parties.id),
  currencyCode: varchar("currency_code", { length: 3 }),
  debit: numeric("debit", { precision: 18, scale: 2 }).notNull().default("0"),
  credit: numeric("credit", { precision: 18, scale: 2 }).notNull().default("0"),
  debitBase: numeric("debit_base", { precision: 18, scale: 2 }).notNull().default("0"),
  creditBase: numeric("credit_base", { precision: 18, scale: 2 }).notNull().default("0"),
  description: varchar("description", { length: 255 }),
}, (t) => [index("ix_journal_entry_lines_account").on(t.accountId, t.journalEntryId)]);
export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  accountId: uuid("account_id").references(() => accounts.id),
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountNumber: varchar("account_number", { length: 64 }).notNull(),
});
export const bankTransactions = pgTable("bank_transactions", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  bankAccountId: uuid("bank_account_id").notNull().references(() => bankAccounts.id),
  transactionDate: date("transaction_date").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  transactionType: varchar("transaction_type", { length: 32 }).notNull(),
  referenceNo: varchar("reference_no", { length: 64 }),
  isReconciled: boolean("is_reconciled").notNull().default(false),
});
export const taxRules = pgTable("tax_rules", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  taxId: uuid("tax_id").notNull().references(() => taxes.id),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  transactionType: varchar("transaction_type", { length: 32 }).notNull(),
});
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  partyId: uuid("party_id").notNull().references(() => parties.id),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
  paymentNo: varchar("payment_no", { length: 32 }).notNull().unique(),
  paymentDate: date("payment_date").notNull(),
  paymentType: varchar("payment_type", { length: 32 }).notNull(),
  direction: varchar("direction", { length: 8 }).notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  currencyCode: varchar("currency_code", { length: 3 }),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const paymentAllocations = pgTable("payment_allocations", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  paymentId: uuid("payment_id").notNull().references(() => payments.id),
  referenceType: varchar("reference_type", { length: 64 }).notNull(),
  referenceId: uuid("reference_id").notNull(),
  allocatedAmount: numeric("allocated_amount", { precision: 18, scale: 2 }).notNull(),
});

// ---------------------------------------------------------------------------
// 9) MANUFACTURING
// ---------------------------------------------------------------------------
export const boms = pgTable("boms", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  bomNo: varchar("bom_no", { length: 32 }).notNull().unique(),
  outputQty: numeric("output_qty", { precision: 18, scale: 4 }).notNull().default("1"),
  outputUomId: uuid("output_uom_id").references(() => uoms.id),
  isActive: boolean("is_active").notNull().default(true),
  status: varchar("status", { length: 32 }).notNull().default("active"),
});
export const bomItems = pgTable("bom_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  bomId: uuid("bom_id").notNull().references(() => boms.id),
  componentProductId: uuid("component_product_id").notNull().references(() => products.id),
  uomId: uuid("uom_id").references(() => uoms.id),
  qty: numeric("qty", { precision: 18, scale: 4 }).notNull(),
  scrapPercent: numeric("scrap_percent", { precision: 5, scale: 2 }).default("0"),
});
export const routings = pgTable("routings", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});
export const workCenters = pgTable("work_centers", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  hourlyRate: numeric("hourly_rate", { precision: 18, scale: 2 }).default("0"),
  capacityPerHour: numeric("capacity_per_hour", { precision: 18, scale: 2 }).default("1"),
});
export const routingOperations = pgTable("routing_operations", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  routingId: uuid("routing_id").notNull().references(() => routings.id),
  workCenterId: uuid("work_center_id").references(() => workCenters.id),
  sequenceNo: integer("sequence_no").notNull(),
  operationName: varchar("operation_name", { length: 255 }).notNull(),
  setupTimeMinutes: numeric("setup_time_minutes", { precision: 18, scale: 2 }).default("0"),
  runTimeMinutes: numeric("run_time_minutes", { precision: 18, scale: 2 }).default("0"),
});
export const productionOrders = pgTable("production_orders", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  bomId: uuid("bom_id").references(() => boms.id),
  routingId: uuid("routing_id").references(() => routings.id),
  productionNo: varchar("production_no", { length: 32 }).notNull().unique(),
  plannedQty: numeric("planned_qty", { precision: 18, scale: 4 }).notNull(),
  completedQty: numeric("completed_qty", { precision: 18, scale: 4 }).default("0"),
  plannedStartDate: date("planned_start_date"),
  plannedEndDate: date("planned_end_date"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const productionOrderOperations = pgTable("production_order_operations", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  productionOrderId: uuid("production_order_id").notNull().references(() => productionOrders.id),
  routingOperationId: uuid("routing_operation_id").references(() => routingOperations.id),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  actualStart: timestamp("actual_start"),
  actualEnd: timestamp("actual_end"),
  completedQty: numeric("completed_qty", { precision: 18, scale: 4 }).default("0"),
});
export const productionMaterialIssues = pgTable("production_material_issues", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  productionOrderId: uuid("production_order_id").notNull().references(() => productionOrders.id),
  issueDate: date("issue_date").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const productionMaterialIssueItems = pgTable("production_material_issue_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  issueId: uuid("issue_id").notNull().references(() => productionMaterialIssues.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  locationId: uuid("location_id").references(() => warehouseLocations.id),
  qty: numeric("qty", { precision: 18, scale: 4 }).notNull(),
});
export const productionReceipts = pgTable("production_receipts", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  productionOrderId: uuid("production_order_id").notNull().references(() => productionOrders.id),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  receiptDate: date("receipt_date").notNull(),
  producedQty: numeric("produced_qty", { precision: 18, scale: 4 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});

// ---------------------------------------------------------------------------
// 10) HR / PAYROLL
// ---------------------------------------------------------------------------
export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  parentId: uuid("parent_id"),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});
export const jobTitles = pgTable("job_titles", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});
export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  userId: uuid("user_id").references(() => users.id),
  departmentId: uuid("department_id").references(() => departments.id),
  jobTitleId: uuid("job_title_id").references(() => jobTitles.id),
  managerId: uuid("manager_id"),
  employeeNo: varchar("employee_no", { length: 32 }).notNull().unique(),
  firstName: varchar("first_name", { length: 128 }).notNull(),
  lastName: varchar("last_name", { length: 128 }),
  hireDate: date("hire_date"),
  employmentStatus: varchar("employment_status", { length: 32 }).notNull().default("active"),
});
export const shifts = pgTable("shifts", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  startTime: varchar("start_time", { length: 8 }).notNull(),
  endTime: varchar("end_time", { length: 8 }).notNull(),
});
export const attendances = pgTable("attendances", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  shiftId: uuid("shift_id").references(() => shifts.id),
  attendanceDate: date("attendance_date").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  status: varchar("status", { length: 32 }).notNull().default("present"),
});
export const leaveTypes = pgTable("leave_types", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  isPaid: boolean("is_paid").notNull().default(true),
});
export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  leaveTypeId: uuid("leave_type_id").notNull().references(() => leaveTypes.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: numeric("total_days", { precision: 5, scale: 2 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const payrollRuns = pgTable("payroll_runs", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const payslips = pgTable("payslips", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  payrollRunId: uuid("payroll_run_id").notNull().references(() => payrollRuns.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  grossAmount: numeric("gross_amount", { precision: 18, scale: 2 }).notNull(),
  deductionAmount: numeric("deduction_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 18, scale: 2 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const payslipLines = pgTable("payslip_lines", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  payslipId: uuid("payslip_id").notNull().references(() => payslips.id),
  componentType: varchar("component_type", { length: 32 }).notNull(),
  componentCode: varchar("component_code", { length: 32 }).notNull(),
  componentName: varchar("component_name", { length: 128 }).notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
});

// ---------------------------------------------------------------------------
// 11) PROJECT
// ---------------------------------------------------------------------------
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  customerId: uuid("customer_id").references(() => customers.id),
  projectNo: varchar("project_no", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budgetAmount: numeric("budget_amount", { precision: 18, scale: 2 }).default("0"),
  status: varchar("status", { length: 32 }).notNull().default("open"),
});
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  parentId: uuid("parent_id"),
  assignedEmployeeId: uuid("assigned_employee_id").references(() => employees.id),
  taskNo: varchar("task_no", { length: 32 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  progressPercent: numeric("progress_percent", { precision: 5, scale: 2 }).default("0"),
});
export const timesheets = pgTable("timesheets", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  projectId: uuid("project_id").references(() => projects.id),
  workDate: date("work_date").notNull(),
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const expenseClaims = pgTable("expense_claims", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  projectId: uuid("project_id").references(() => projects.id),
  expenseDate: date("expense_date").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});

// ---------------------------------------------------------------------------
// 12) ASSET
// ---------------------------------------------------------------------------
export const assetCategories = pgTable("asset_categories", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  assetAccountId: uuid("asset_account_id").references(() => accounts.id),
  depreciationExpenseAccountId: uuid("depreciation_expense_account_id").references(() => accounts.id),
  accumulatedDepreciationAccountId: uuid("accumulated_depreciation_account_id").references(() => accounts.id),
  usefulLifeMonths: integer("useful_life_months").notNull().default(60),
});
export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  assetCategoryId: uuid("asset_category_id").notNull().references(() => assetCategories.id),
  assetNo: varchar("asset_no", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  acquisitionDate: date("acquisition_date").notNull(),
  acquisitionCost: numeric("acquisition_cost", { precision: 18, scale: 2 }).notNull(),
  residualValue: numeric("residual_value", { precision: 18, scale: 2 }).default("0"),
  status: varchar("status", { length: 32 }).notNull().default("active"),
});
export const assetDepreciationSchedules = pgTable("asset_depreciation_schedules", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  assetId: uuid("asset_id").notNull().references(() => assets.id),
  depreciationDate: date("depreciation_date").notNull(),
  depreciationAmount: numeric("depreciation_amount", { precision: 18, scale: 2 }).notNull(),
  accumulatedDepreciation: numeric("accumulated_depreciation", { precision: 18, scale: 2 }).notNull(),
  netBookValue: numeric("net_book_value", { precision: 18, scale: 2 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
});
export const assetDisposals = pgTable("asset_disposals", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  assetId: uuid("asset_id").notNull().references(() => assets.id),
  disposalDate: date("disposal_date").notNull(),
  proceeds: numeric("proceeds", { precision: 18, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});

// ---------------------------------------------------------------------------
// 13) QUALITY
// ---------------------------------------------------------------------------
export const qualityTemplates = pgTable("quality_templates", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});
export const qualityTemplateParameters = pgTable("quality_template_parameters", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  qualityTemplateId: uuid("quality_template_id").notNull().references(() => qualityTemplates.id),
  parameterName: varchar("parameter_name", { length: 128 }).notNull(),
  dataType: varchar("data_type", { length: 32 }).notNull().default("number"),
  minValue: numeric("min_value", { precision: 18, scale: 4 }),
  maxValue: numeric("max_value", { precision: 18, scale: 4 }),
  isRequired: boolean("is_required").notNull().default(true),
});
export const qualityInspections = pgTable("quality_inspections", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  qualityTemplateId: uuid("quality_template_id").references(() => qualityTemplates.id),
  referenceType: varchar("reference_type", { length: 64 }),
  referenceId: uuid("reference_id"),
  inspectionNo: varchar("inspection_no", { length: 32 }).notNull().unique(),
  inspectionDate: date("inspection_date").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
});
export const qualityInspectionResults = pgTable("quality_inspection_results", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  inspectionId: uuid("inspection_id").notNull().references(() => qualityInspections.id),
  templateParameterId: uuid("template_parameter_id").notNull().references(() => qualityTemplateParameters.id),
  measuredValue: varchar("measured_value", { length: 64 }),
  isAccepted: boolean("is_accepted").notNull().default(false),
});
export const nonconformances = pgTable("nonconformances", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  qualityInspectionId: uuid("quality_inspection_id").references(() => qualityInspections.id),
  ncNo: varchar("nc_no", { length: 32 }).notNull().unique(),
  severity: varchar("severity", { length: 32 }).notNull().default("minor"),
  status: varchar("status", { length: 32 }).notNull().default("open"),
});

// ---------------------------------------------------------------------------
// 14) POS & PRICING
// ---------------------------------------------------------------------------
export const priceLists = pgTable("price_lists", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  currencyCode: varchar("currency_code", { length: 3 }),
  isSales: boolean("is_sales").notNull().default(true),
  isPurchase: boolean("is_purchase").notNull().default(false),
});
export const priceListItems = pgTable("price_list_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  priceListId: uuid("price_list_id").notNull().references(() => priceLists.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  uomId: uuid("uom_id").references(() => uoms.id),
  minQty: numeric("min_qty", { precision: 18, scale: 4 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 18, scale: 2 }).notNull(),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
});
export const pricingRules = pgTable("pricing_rules", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  ruleNo: varchar("rule_no", { length: 32 }).notNull().unique(),
  appliesTo: varchar("applies_to", { length: 32 }).notNull().default("all"),
  customerId: uuid("customer_id").references(() => customers.id),
  productId: uuid("product_id").references(() => products.id),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0"),
  discountAmount: numeric("discount_amount", { precision: 18, scale: 2 }).default("0"),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  status: varchar("status", { length: 32 }).notNull().default("active"),
});
export const posProfiles = pgTable("pos_profiles", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  priceListId: uuid("price_list_id").references(() => priceLists.id),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});
export const posSessions = pgTable("pos_sessions", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  posProfileId: uuid("pos_profile_id").notNull().references(() => posProfiles.id),
  openedBy: uuid("opened_by").references(() => users.id),
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
  openingCash: numeric("opening_cash", { precision: 18, scale: 2 }).notNull().default("0"),
  closingCash: numeric("closing_cash", { precision: 18, scale: 2 }),
  status: varchar("status", { length: 32 }).notNull().default("open"),
});
export const posTransactions = pgTable("pos_transactions", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  posSessionId: uuid("pos_session_id").notNull().references(() => posSessions.id),
  customerId: uuid("customer_id").references(() => customers.id),
  receiptNo: varchar("receipt_no", { length: 32 }).notNull().unique(),
  transactionAt: timestamp("transaction_at").notNull().defaultNow(),
  grandTotal: numeric("grand_total", { precision: 18, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
});
export const posTransactionItems = pgTable("pos_transaction_items", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  posTransactionId: uuid("pos_transaction_id").notNull().references(() => posTransactions.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  qty: numeric("qty", { precision: 18, scale: 4 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 18, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 18, scale: 2 }).default("0"),
  lineTotal: numeric("line_total", { precision: 18, scale: 2 }).notNull(),
});

// ---------------------------------------------------------------------------
// 15) GOVERNANCE
// ---------------------------------------------------------------------------
export const approvalWorkflows = pgTable("approval_workflows", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  documentType: varchar("document_type", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});
export const approvalSteps = pgTable("approval_steps", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  workflowId: uuid("workflow_id").notNull().references(() => approvalWorkflows.id),
  stepNo: integer("step_no").notNull(),
  roleId: uuid("role_id").references(() => roles.id),
  minAmount: numeric("min_amount", { precision: 18, scale: 2 }),
  maxAmount: numeric("max_amount", { precision: 18, scale: 2 }),
});
export const approvalRequests = pgTable("approval_requests", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  workflowId: uuid("workflow_id").notNull().references(() => approvalWorkflows.id),
  documentType: varchar("document_type", { length: 64 }).notNull(),
  documentId: uuid("document_id").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  currentStep: integer("current_step").notNull().default(1),
});
export const approvalActions = pgTable("approval_actions", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  approvalRequestId: uuid("approval_request_id").notNull().references(() => approvalRequests.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  stepNo: integer("step_no").notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  comment: text("comment"),
  actionAt: timestamp("action_at").notNull().defaultNow(),
});
export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  storageKey: varchar("storage_key", { length: 512 }).notNull(),
  mimeType: varchar("mime_type", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow(),
});
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().$defaultFn(uid),
  companyId: uuid("company_id").references(() => companies.id),
  userId: uuid("user_id").references(() => users.id),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("ix_audit_logs_entity").on(t.entityType, t.entityId, t.createdAt)]);

// ---------------------------------------------------------------------------
// DB — PGlite in-memory + DDL (idempotent)
// ---------------------------------------------------------------------------
const client = new PGlite();
const db = drizzle(client);

async function initDDL() {
  // enums — idempotent DO blocks
  for (const [type, vals] of [
    ["doc_status", `'draft','submitted','pending_approval','approved','posted','closed','cancelled','rejected','reversed'`],
    ["party_type", `'individual','company','customer','supplier'`],
    ["product_type", `'goods','service','raw_material','finished_goods','variant'`],
    ["movement_type", `'PURCHASE_RECEIPT','SALES_DELIVERY','TRANSFER_OUT','TRANSFER_IN','PRODUCTION_ISSUE','PRODUCTION_RECEIPT','ADJUSTMENT_IN','ADJUSTMENT_OUT','RETURN_IN','RETURN_OUT'`],
    ["account_type", `'asset','liability','equity','income','expense'`],
    ["payment_direction", `'in','out'`],
    ["payment_type", `'CUSTOMER_RECEIPT','SUPPLIER_PAYMENT','REFUND','ADVANCE','TRANSFER'`],
    ["employment_status", `'active','inactive','terminated','probation'`],
    ["asset_status", `'draft','active','disposed','sold'`],
    ["quality_status", `'pending','passed','failed'`],
  ] as const) {
    await db.execute(sql.raw(`DO $$ BEGIN CREATE TYPE ${type} AS ENUM (${vals}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`));
  }

  // helper to create tables quickly — we use minimal IF NOT EXISTS that matches pgTable column names
  // Untuk produksi gunakan drizzle-kit migrate; di sini PGlite demo cukup create minimal agar drizzle insert tidak error.
  // Kita create tabel inti terlebih dahulu, sisanya akan auto-create via raw SQL generic jika belum ada saat diakses.

  const ddl = [
    `CREATE TABLE IF NOT EXISTS companies (id UUID PRIMARY KEY, code VARCHAR(32) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, tax_id VARCHAR(64), base_currency_code VARCHAR(3), status VARCHAR(32) NOT NULL DEFAULT 'active', created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(), deleted_at TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS business_units (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL, parent_id UUID, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS branches (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT NOW(), deleted_at TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, username VARCHAR(64) NOT NULL UNIQUE, email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'active', created_at TIMESTAMP DEFAULT NOW(), deleted_at TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS roles (id UUID PRIMARY KEY, code VARCHAR(64) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS permissions (id UUID PRIMARY KEY, resource VARCHAR(128) NOT NULL, action VARCHAR(64) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS user_roles (user_id UUID NOT NULL, role_id UUID NOT NULL, company_id UUID)`,
    `CREATE TABLE IF NOT EXISTS role_permissions (role_id UUID NOT NULL, permission_id UUID NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS currencies (code VARCHAR(3) PRIMARY KEY, name VARCHAR(128) NOT NULL, decimal_places INTEGER NOT NULL DEFAULT 2)`,
    `CREATE TABLE IF NOT EXISTS exchange_rates (id UUID PRIMARY KEY, from_currency_code VARCHAR(3) NOT NULL, to_currency_code VARCHAR(3) NOT NULL, rate_date DATE NOT NULL, rate NUMERIC(18,6) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS taxes (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL, rate NUMERIC(5,4) NOT NULL DEFAULT 0, tax_type VARCHAR(32) NOT NULL DEFAULT 'vat')`,
    `CREATE TABLE IF NOT EXISTS payment_terms (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL, due_days INTEGER NOT NULL DEFAULT 30)`,
    `CREATE TABLE IF NOT EXISTS addresses (id UUID PRIMARY KEY, address_line1 VARCHAR(255) NOT NULL, address_line2 VARCHAR(255), city VARCHAR(128), province VARCHAR(128), postal_code VARCHAR(32), country_code VARCHAR(3))`,
    `CREATE TABLE IF NOT EXISTS contacts (id UUID PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255), phone VARCHAR(32))`,
    `CREATE TABLE IF NOT EXISTS parties (id UUID PRIMARY KEY, company_id UUID NOT NULL, party_type VARCHAR(32) NOT NULL, code VARCHAR(64) NOT NULL, legal_name VARCHAR(255) NOT NULL, display_name VARCHAR(255), tax_id VARCHAR(64), status VARCHAR(32) NOT NULL DEFAULT 'active', created_at TIMESTAMP DEFAULT NOW(), deleted_at TIMESTAMP, UNIQUE(company_id, code))`,
    `CREATE TABLE IF NOT EXISTS customers (id UUID PRIMARY KEY, party_id UUID NOT NULL, payment_term_id UUID, credit_limit NUMERIC(18,2) DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS suppliers (id UUID PRIMARY KEY, party_id UUID NOT NULL, payment_term_id UUID, lead_time_days INTEGER DEFAULT 7)`,
    `CREATE TABLE IF NOT EXISTS party_addresses (party_id UUID NOT NULL, address_id UUID NOT NULL, address_type VARCHAR(32) NOT NULL DEFAULT 'billing', is_default BOOLEAN NOT NULL DEFAULT false)`,
    `CREATE TABLE IF NOT EXISTS party_contacts (party_id UUID NOT NULL, contact_id UUID NOT NULL, role VARCHAR(64), is_primary BOOLEAN NOT NULL DEFAULT false)`,
    `CREATE TABLE IF NOT EXISTS product_categories (id UUID PRIMARY KEY, company_id UUID NOT NULL, parent_id UUID, code VARCHAR(64) NOT NULL, name VARCHAR(255) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS brands (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS uoms (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(128) NOT NULL, factor NUMERIC(18,6) NOT NULL DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS products (id UUID PRIMARY KEY, company_id UUID NOT NULL, category_id UUID, brand_id UUID, stock_uom_id UUID, sku VARCHAR(64) NOT NULL, barcode VARCHAR(64), name VARCHAR(255) NOT NULL, product_type VARCHAR(32) NOT NULL DEFAULT 'goods', is_stock_item BOOLEAN NOT NULL DEFAULT true, is_serialized BOOLEAN NOT NULL DEFAULT false, is_batched BOOLEAN NOT NULL DEFAULT false, standard_cost NUMERIC(18,2) DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), deleted_at TIMESTAMP, UNIQUE(company_id, sku))`,
    `CREATE TABLE IF NOT EXISTS product_uoms (id UUID PRIMARY KEY, product_id UUID NOT NULL, uom_id UUID NOT NULL, conversion_factor NUMERIC(18,6) NOT NULL DEFAULT 1, is_default_sales BOOLEAN NOT NULL DEFAULT false, is_default_purchase BOOLEAN NOT NULL DEFAULT false)`,
    `CREATE TABLE IF NOT EXISTS product_suppliers (product_id UUID NOT NULL, supplier_id UUID NOT NULL, supplier_sku VARCHAR(64), last_price NUMERIC(18,2))`,
    `CREATE TABLE IF NOT EXISTS warehouses (id UUID PRIMARY KEY, company_id UUID NOT NULL, branch_id UUID, parent_id UUID, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL, UNIQUE(company_id, code))`,
    `CREATE TABLE IF NOT EXISTS warehouse_locations (id UUID PRIMARY KEY, warehouse_id UUID NOT NULL, parent_id UUID, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL, location_type VARCHAR(32) NOT NULL DEFAULT 'bin')`,
    `CREATE TABLE IF NOT EXISTS leads (id UUID PRIMARY KEY, company_id UUID NOT NULL, party_id UUID, lead_no VARCHAR(32) NOT NULL UNIQUE, source VARCHAR(64), status VARCHAR(32) NOT NULL DEFAULT 'open', estimated_value NUMERIC(18,2) DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS opportunities (id UUID PRIMARY KEY, company_id UUID NOT NULL, lead_id UUID, customer_id UUID, opportunity_no VARCHAR(32) NOT NULL UNIQUE, stage VARCHAR(32) NOT NULL DEFAULT 'qualification', probability NUMERIC(5,2) DEFAULT 0, estimated_value NUMERIC(18,2) DEFAULT 0, expected_close_date DATE)`,
    `CREATE TABLE IF NOT EXISTS quotations (id UUID PRIMARY KEY, company_id UUID NOT NULL, customer_id UUID NOT NULL, opportunity_id UUID, quotation_no VARCHAR(32) NOT NULL UNIQUE, quotation_date DATE NOT NULL, valid_until DATE, status VARCHAR(32) NOT NULL DEFAULT 'draft', grand_total NUMERIC(18,2) NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS quotation_items (id UUID PRIMARY KEY, quotation_id UUID NOT NULL, product_id UUID NOT NULL, uom_id UUID, qty NUMERIC(18,4) NOT NULL, unit_price NUMERIC(18,2) NOT NULL, discount_amount NUMERIC(18,2) DEFAULT 0, tax_amount NUMERIC(18,2) DEFAULT 0, line_total NUMERIC(18,2) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS sales_orders (id UUID PRIMARY KEY, company_id UUID NOT NULL, branch_id UUID, customer_id UUID NOT NULL, quotation_id UUID, order_no VARCHAR(32) NOT NULL UNIQUE, order_date DATE NOT NULL, currency_code VARCHAR(3), payment_term_id UUID, status VARCHAR(32) NOT NULL DEFAULT 'draft', grand_total NUMERIC(18,2) NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS sales_order_items (id UUID PRIMARY KEY, sales_order_id UUID NOT NULL, product_id UUID NOT NULL, uom_id UUID, warehouse_id UUID, ordered_qty NUMERIC(18,4) NOT NULL, delivered_qty NUMERIC(18,4) DEFAULT 0, invoiced_qty NUMERIC(18,4) DEFAULT 0, unit_price NUMERIC(18,2) NOT NULL, line_total NUMERIC(18,2) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS sales_deliveries (id UUID PRIMARY KEY, company_id UUID NOT NULL, customer_id UUID NOT NULL, sales_order_id UUID, delivery_no VARCHAR(32) NOT NULL UNIQUE, delivery_date DATE NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS sales_delivery_items (id UUID PRIMARY KEY, delivery_id UUID NOT NULL, sales_order_item_id UUID, product_id UUID NOT NULL, source_location_id UUID, qty NUMERIC(18,4) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS sales_invoices (id UUID PRIMARY KEY, company_id UUID NOT NULL, customer_id UUID NOT NULL, sales_order_id UUID, delivery_id UUID, invoice_no VARCHAR(32) NOT NULL UNIQUE, invoice_date DATE NOT NULL, due_date DATE, status VARCHAR(32) NOT NULL DEFAULT 'draft', grand_total NUMERIC(18,2) NOT NULL DEFAULT 0, outstanding_amount NUMERIC(18,2) NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS sales_invoice_items (id UUID PRIMARY KEY, sales_invoice_id UUID NOT NULL, product_id UUID NOT NULL, sales_order_item_id UUID, qty NUMERIC(18,4) NOT NULL, unit_price NUMERIC(18,2) NOT NULL, tax_amount NUMERIC(18,2) DEFAULT 0, line_total NUMERIC(18,2) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS purchase_requests (id UUID PRIMARY KEY, company_id UUID NOT NULL, request_no VARCHAR(32) NOT NULL UNIQUE, request_date DATE NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS purchase_request_items (id UUID PRIMARY KEY, purchase_request_id UUID NOT NULL, product_id UUID NOT NULL, uom_id UUID, requested_qty NUMERIC(18,4) NOT NULL, required_date DATE)`,
    `CREATE TABLE IF NOT EXISTS request_for_quotations (id UUID PRIMARY KEY, company_id UUID NOT NULL, rfq_no VARCHAR(32) NOT NULL UNIQUE, rfq_date DATE NOT NULL, response_due_date DATE, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS rfq_suppliers (rfq_id UUID NOT NULL, supplier_id UUID NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS rfq_items (id UUID PRIMARY KEY, rfq_id UUID NOT NULL, product_id UUID NOT NULL, uom_id UUID, qty NUMERIC(18,4) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS supplier_quotations (id UUID PRIMARY KEY, company_id UUID NOT NULL, supplier_id UUID NOT NULL, rfq_id UUID, quotation_no VARCHAR(32) NOT NULL UNIQUE, quotation_date DATE NOT NULL, valid_until DATE, grand_total NUMERIC(18,2) NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS supplier_quotation_items (id UUID PRIMARY KEY, supplier_quotation_id UUID NOT NULL, product_id UUID NOT NULL, qty NUMERIC(18,4) NOT NULL, unit_price NUMERIC(18,2) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS purchase_orders (id UUID PRIMARY KEY, company_id UUID NOT NULL, supplier_id UUID NOT NULL, supplier_quotation_id UUID, po_no VARCHAR(32) NOT NULL UNIQUE, order_date DATE NOT NULL, expected_date DATE, status VARCHAR(32) NOT NULL DEFAULT 'draft', grand_total NUMERIC(18,2) NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS purchase_order_items (id UUID PRIMARY KEY, purchase_order_id UUID NOT NULL, product_id UUID NOT NULL, uom_id UUID, warehouse_id UUID, ordered_qty NUMERIC(18,4) NOT NULL, received_qty NUMERIC(18,4) DEFAULT 0, billed_qty NUMERIC(18,4) DEFAULT 0, unit_price NUMERIC(18,2) NOT NULL, line_total NUMERIC(18,2) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS goods_receipts (id UUID PRIMARY KEY, company_id UUID NOT NULL, supplier_id UUID NOT NULL, purchase_order_id UUID, receipt_no VARCHAR(32) NOT NULL UNIQUE, receipt_date DATE NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS goods_receipt_items (id UUID PRIMARY KEY, goods_receipt_id UUID NOT NULL, purchase_order_item_id UUID, product_id UUID NOT NULL, location_id UUID, received_qty NUMERIC(18,4) NOT NULL, accepted_qty NUMERIC(18,4) NOT NULL, rejected_qty NUMERIC(18,4) DEFAULT 0, unit_cost NUMERIC(18,2) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS supplier_invoices (id UUID PRIMARY KEY, company_id UUID NOT NULL, supplier_id UUID NOT NULL, purchase_order_id UUID, goods_receipt_id UUID, bill_no VARCHAR(32) NOT NULL UNIQUE, bill_date DATE NOT NULL, due_date DATE, grand_total NUMERIC(18,2) NOT NULL DEFAULT 0, outstanding_amount NUMERIC(18,2) NOT NULL DEFAULT 0, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS supplier_invoice_items (id UUID PRIMARY KEY, supplier_invoice_id UUID NOT NULL, product_id UUID NOT NULL, qty NUMERIC(18,4) NOT NULL, unit_price NUMERIC(18,2) NOT NULL, tax_amount NUMERIC(18,2) DEFAULT 0, line_total NUMERIC(18,2) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS batches (id UUID PRIMARY KEY, product_id UUID NOT NULL, batch_no VARCHAR(64) NOT NULL UNIQUE, manufacturing_date DATE, expiry_date DATE, status VARCHAR(32) NOT NULL DEFAULT 'active')`,
    `CREATE TABLE IF NOT EXISTS serial_numbers (id UUID PRIMARY KEY, product_id UUID NOT NULL, batch_id UUID, serial_no VARCHAR(64) NOT NULL UNIQUE, status VARCHAR(32) NOT NULL DEFAULT 'available')`,
    `CREATE TABLE IF NOT EXISTS stock_movements (id UUID PRIMARY KEY, company_id UUID NOT NULL, product_id UUID NOT NULL, warehouse_id UUID, location_id UUID, batch_id UUID, serial_id UUID, movement_type VARCHAR(32) NOT NULL, reference_type VARCHAR(64), reference_id UUID, movement_at TIMESTAMP NOT NULL DEFAULT NOW(), qty_in NUMERIC(18,4) NOT NULL DEFAULT 0, qty_out NUMERIC(18,4) NOT NULL DEFAULT 0, unit_cost NUMERIC(18,2) DEFAULT 0, value_in NUMERIC(18,2) DEFAULT 0, value_out NUMERIC(18,2) DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS inventory_balances (id UUID PRIMARY KEY, company_id UUID NOT NULL, product_id UUID NOT NULL, warehouse_id UUID, location_id UUID, batch_id UUID, qty_on_hand NUMERIC(18,4) NOT NULL DEFAULT 0, qty_reserved NUMERIC(18,4) NOT NULL DEFAULT 0, avg_cost NUMERIC(18,2) NOT NULL DEFAULT 0, UNIQUE(company_id, product_id, warehouse_id, location_id))`,
    `CREATE TABLE IF NOT EXISTS stock_reservations (id UUID PRIMARY KEY, product_id UUID NOT NULL, warehouse_id UUID NOT NULL, location_id UUID, reference_type VARCHAR(64) NOT NULL, reference_id UUID NOT NULL, reserved_qty NUMERIC(18,4) NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'reserved')`,
    `CREATE TABLE IF NOT EXISTS stock_transfers (id UUID PRIMARY KEY, company_id UUID NOT NULL, source_warehouse_id UUID NOT NULL, target_warehouse_id UUID NOT NULL, transfer_no VARCHAR(32) NOT NULL UNIQUE, transfer_date DATE NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS stock_transfer_items (id UUID PRIMARY KEY, stock_transfer_id UUID NOT NULL, product_id UUID NOT NULL, source_location_id UUID, target_location_id UUID, qty NUMERIC(18,4) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS fiscal_years (id UUID PRIMARY KEY, company_id UUID NOT NULL, name VARCHAR(128) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'open')`,
    `CREATE TABLE IF NOT EXISTS accounting_periods (id UUID PRIMARY KEY, fiscal_year_id UUID NOT NULL, name VARCHAR(128) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'open')`,
    `CREATE TABLE IF NOT EXISTS accounts (id UUID PRIMARY KEY, company_id UUID NOT NULL, parent_id UUID, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL, account_type VARCHAR(32) NOT NULL, is_group BOOLEAN NOT NULL DEFAULT false, is_active BOOLEAN NOT NULL DEFAULT true, UNIQUE(company_id, code))`,
    `CREATE TABLE IF NOT EXISTS cost_centers (id UUID PRIMARY KEY, company_id UUID NOT NULL, parent_id UUID, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS journal_entries (id UUID PRIMARY KEY, company_id UUID NOT NULL, accounting_period_id UUID, journal_no VARCHAR(32) NOT NULL UNIQUE, posting_date DATE NOT NULL, source_type VARCHAR(64), source_id UUID, status VARCHAR(32) NOT NULL DEFAULT 'draft', description TEXT, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS journal_entry_lines (id UUID PRIMARY KEY, journal_entry_id UUID NOT NULL, account_id UUID NOT NULL, cost_center_id UUID, party_id UUID, currency_code VARCHAR(3), debit NUMERIC(18,2) NOT NULL DEFAULT 0, credit NUMERIC(18,2) NOT NULL DEFAULT 0, debit_base NUMERIC(18,2) NOT NULL DEFAULT 0, credit_base NUMERIC(18,2) NOT NULL DEFAULT 0, description VARCHAR(255))`,
    `CREATE TABLE IF NOT EXISTS bank_accounts (id UUID PRIMARY KEY, company_id UUID NOT NULL, account_id UUID, bank_name VARCHAR(255) NOT NULL, account_name VARCHAR(255) NOT NULL, account_number VARCHAR(64) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS bank_transactions (id UUID PRIMARY KEY, bank_account_id UUID NOT NULL, transaction_date DATE NOT NULL, amount NUMERIC(18,2) NOT NULL, transaction_type VARCHAR(32) NOT NULL, reference_no VARCHAR(64), is_reconciled BOOLEAN NOT NULL DEFAULT false)`,
    `CREATE TABLE IF NOT EXISTS tax_rules (id UUID PRIMARY KEY, company_id UUID NOT NULL, tax_id UUID NOT NULL, account_id UUID NOT NULL, transaction_type VARCHAR(32) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS payments (id UUID PRIMARY KEY, company_id UUID NOT NULL, party_id UUID NOT NULL, bank_account_id UUID, payment_no VARCHAR(32) NOT NULL UNIQUE, payment_date DATE NOT NULL, payment_type VARCHAR(32) NOT NULL, direction VARCHAR(8) NOT NULL, amount NUMERIC(18,2) NOT NULL, currency_code VARCHAR(3), status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS payment_allocations (id UUID PRIMARY KEY, payment_id UUID NOT NULL, reference_type VARCHAR(64) NOT NULL, reference_id UUID NOT NULL, allocated_amount NUMERIC(18,2) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS boms (id UUID PRIMARY KEY, company_id UUID NOT NULL, product_id UUID NOT NULL, bom_no VARCHAR(32) NOT NULL UNIQUE, output_qty NUMERIC(18,4) NOT NULL DEFAULT 1, output_uom_id UUID, is_active BOOLEAN NOT NULL DEFAULT true, status VARCHAR(32) NOT NULL DEFAULT 'active')`,
    `CREATE TABLE IF NOT EXISTS bom_items (id UUID PRIMARY KEY, bom_id UUID NOT NULL, component_product_id UUID NOT NULL, uom_id UUID, qty NUMERIC(18,4) NOT NULL, scrap_percent NUMERIC(5,2) DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS routings (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS work_centers (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL, hourly_rate NUMERIC(18,2) DEFAULT 0, capacity_per_hour NUMERIC(18,2) DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS routing_operations (id UUID PRIMARY KEY, routing_id UUID NOT NULL, work_center_id UUID, sequence_no INTEGER NOT NULL, operation_name VARCHAR(255) NOT NULL, setup_time_minutes NUMERIC(18,2) DEFAULT 0, run_time_minutes NUMERIC(18,2) DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS production_orders (id UUID PRIMARY KEY, company_id UUID NOT NULL, product_id UUID NOT NULL, bom_id UUID, routing_id UUID, production_no VARCHAR(32) NOT NULL UNIQUE, planned_qty NUMERIC(18,4) NOT NULL, completed_qty NUMERIC(18,4) DEFAULT 0, planned_start_date DATE, planned_end_date DATE, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS production_order_operations (id UUID PRIMARY KEY, production_order_id UUID NOT NULL, routing_operation_id UUID, status VARCHAR(32) NOT NULL DEFAULT 'pending', actual_start TIMESTAMP, actual_end TIMESTAMP, completed_qty NUMERIC(18,4) DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS production_material_issues (id UUID PRIMARY KEY, production_order_id UUID NOT NULL, issue_date DATE NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS production_material_issue_items (id UUID PRIMARY KEY, issue_id UUID NOT NULL, product_id UUID NOT NULL, location_id UUID, qty NUMERIC(18,4) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS production_receipts (id UUID PRIMARY KEY, production_order_id UUID NOT NULL, warehouse_id UUID, receipt_date DATE NOT NULL, produced_qty NUMERIC(18,4) NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS departments (id UUID PRIMARY KEY, company_id UUID NOT NULL, parent_id UUID, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS job_titles (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS employees (id UUID PRIMARY KEY, company_id UUID NOT NULL, user_id UUID, department_id UUID, job_title_id UUID, manager_id UUID, employee_no VARCHAR(32) NOT NULL UNIQUE, first_name VARCHAR(128) NOT NULL, last_name VARCHAR(128), hire_date DATE, employment_status VARCHAR(32) NOT NULL DEFAULT 'active')`,
    `CREATE TABLE IF NOT EXISTS shifts (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(128) NOT NULL, start_time VARCHAR(8) NOT NULL, end_time VARCHAR(8) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS attendances (id UUID PRIMARY KEY, employee_id UUID NOT NULL, shift_id UUID, attendance_date DATE NOT NULL, check_in TIMESTAMP, check_out TIMESTAMP, status VARCHAR(32) NOT NULL DEFAULT 'present')`,
    `CREATE TABLE IF NOT EXISTS leave_types (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(128) NOT NULL, is_paid BOOLEAN NOT NULL DEFAULT true)`,
    `CREATE TABLE IF NOT EXISTS leave_requests (id UUID PRIMARY KEY, employee_id UUID NOT NULL, leave_type_id UUID NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, total_days NUMERIC(5,2) NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS payroll_runs (id UUID PRIMARY KEY, company_id UUID NOT NULL, period_start DATE NOT NULL, period_end DATE NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS payslips (id UUID PRIMARY KEY, payroll_run_id UUID NOT NULL, employee_id UUID NOT NULL, gross_amount NUMERIC(18,2) NOT NULL, deduction_amount NUMERIC(18,2) NOT NULL DEFAULT 0, net_amount NUMERIC(18,2) NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS payslip_lines (id UUID PRIMARY KEY, payslip_id UUID NOT NULL, component_type VARCHAR(32) NOT NULL, component_code VARCHAR(32) NOT NULL, component_name VARCHAR(128) NOT NULL, amount NUMERIC(18,2) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS projects (id UUID PRIMARY KEY, company_id UUID NOT NULL, customer_id UUID, project_no VARCHAR(32) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, start_date DATE, end_date DATE, budget_amount NUMERIC(18,2) DEFAULT 0, status VARCHAR(32) NOT NULL DEFAULT 'open')`,
    `CREATE TABLE IF NOT EXISTS tasks (id UUID PRIMARY KEY, project_id UUID NOT NULL, parent_id UUID, assigned_employee_id UUID, task_no VARCHAR(32) NOT NULL UNIQUE, title VARCHAR(255) NOT NULL, start_date DATE, due_date DATE, status VARCHAR(32) NOT NULL DEFAULT 'open', progress_percent NUMERIC(5,2) DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS timesheets (id UUID PRIMARY KEY, company_id UUID NOT NULL, employee_id UUID NOT NULL, project_id UUID, work_date DATE NOT NULL, hours NUMERIC(5,2) NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS expense_claims (id UUID PRIMARY KEY, company_id UUID NOT NULL, employee_id UUID NOT NULL, project_id UUID, expense_date DATE NOT NULL, amount NUMERIC(18,2) NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS asset_categories (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL, asset_account_id UUID, depreciation_expense_account_id UUID, accumulated_depreciation_account_id UUID, useful_life_months INTEGER NOT NULL DEFAULT 60)`,
    `CREATE TABLE IF NOT EXISTS assets (id UUID PRIMARY KEY, company_id UUID NOT NULL, asset_category_id UUID NOT NULL, asset_no VARCHAR(32) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, acquisition_date DATE NOT NULL, acquisition_cost NUMERIC(18,2) NOT NULL, residual_value NUMERIC(18,2) DEFAULT 0, status VARCHAR(32) NOT NULL DEFAULT 'active')`,
    `CREATE TABLE IF NOT EXISTS asset_depreciation_schedules (id UUID PRIMARY KEY, asset_id UUID NOT NULL, depreciation_date DATE NOT NULL, depreciation_amount NUMERIC(18,2) NOT NULL, accumulated_depreciation NUMERIC(18,2) NOT NULL, net_book_value NUMERIC(18,2) NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'pending')`,
    `CREATE TABLE IF NOT EXISTS asset_disposals (id UUID PRIMARY KEY, asset_id UUID NOT NULL, disposal_date DATE NOT NULL, proceeds NUMERIC(18,2) NOT NULL DEFAULT 0, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS quality_templates (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS quality_template_parameters (id UUID PRIMARY KEY, quality_template_id UUID NOT NULL, parameter_name VARCHAR(128) NOT NULL, data_type VARCHAR(32) NOT NULL DEFAULT 'number', min_value NUMERIC(18,4), max_value NUMERIC(18,4), is_required BOOLEAN NOT NULL DEFAULT true)`,
    `CREATE TABLE IF NOT EXISTS quality_inspections (id UUID PRIMARY KEY, company_id UUID NOT NULL, product_id UUID NOT NULL, quality_template_id UUID, reference_type VARCHAR(64), reference_id UUID, inspection_no VARCHAR(32) NOT NULL UNIQUE, inspection_date DATE NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'pending')`,
    `CREATE TABLE IF NOT EXISTS quality_inspection_results (id UUID PRIMARY KEY, inspection_id UUID NOT NULL, template_parameter_id UUID NOT NULL, measured_value VARCHAR(64), is_accepted BOOLEAN NOT NULL DEFAULT false)`,
    `CREATE TABLE IF NOT EXISTS nonconformances (id UUID PRIMARY KEY, company_id UUID NOT NULL, quality_inspection_id UUID, nc_no VARCHAR(32) NOT NULL UNIQUE, severity VARCHAR(32) NOT NULL DEFAULT 'minor', status VARCHAR(32) NOT NULL DEFAULT 'open')`,
    `CREATE TABLE IF NOT EXISTS price_lists (id UUID PRIMARY KEY, company_id UUID NOT NULL, code VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL, currency_code VARCHAR(3), is_sales BOOLEAN NOT NULL DEFAULT true, is_purchase BOOLEAN NOT NULL DEFAULT false)`,
    `CREATE TABLE IF NOT EXISTS price_list_items (id UUID PRIMARY KEY, price_list_id UUID NOT NULL, product_id UUID NOT NULL, uom_id UUID, min_qty NUMERIC(18,4) NOT NULL DEFAULT 1, unit_price NUMERIC(18,2) NOT NULL, valid_from DATE, valid_to DATE)`,
    `CREATE TABLE IF NOT EXISTS pricing_rules (id UUID PRIMARY KEY, company_id UUID NOT NULL, rule_no VARCHAR(32) NOT NULL UNIQUE, applies_to VARCHAR(32) NOT NULL DEFAULT 'all', customer_id UUID, product_id UUID, discount_percent NUMERIC(5,2) DEFAULT 0, discount_amount NUMERIC(18,2) DEFAULT 0, valid_from DATE, valid_to DATE, status VARCHAR(32) NOT NULL DEFAULT 'active')`,
    `CREATE TABLE IF NOT EXISTS pos_profiles (id UUID PRIMARY KEY, company_id UUID NOT NULL, warehouse_id UUID, price_list_id UUID, code VARCHAR(32) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true)`,
    `CREATE TABLE IF NOT EXISTS pos_sessions (id UUID PRIMARY KEY, pos_profile_id UUID NOT NULL, opened_by UUID, opened_at TIMESTAMP NOT NULL DEFAULT NOW(), closed_at TIMESTAMP, opening_cash NUMERIC(18,2) NOT NULL DEFAULT 0, closing_cash NUMERIC(18,2), status VARCHAR(32) NOT NULL DEFAULT 'open')`,
    `CREATE TABLE IF NOT EXISTS pos_transactions (id UUID PRIMARY KEY, pos_session_id UUID NOT NULL, customer_id UUID, receipt_no VARCHAR(32) NOT NULL UNIQUE, transaction_at TIMESTAMP NOT NULL DEFAULT NOW(), grand_total NUMERIC(18,2) NOT NULL DEFAULT 0, status VARCHAR(32) NOT NULL DEFAULT 'draft')`,
    `CREATE TABLE IF NOT EXISTS pos_transaction_items (id UUID PRIMARY KEY, pos_transaction_id UUID NOT NULL, product_id UUID NOT NULL, qty NUMERIC(18,4) NOT NULL, unit_price NUMERIC(18,2) NOT NULL, discount_amount NUMERIC(18,2) DEFAULT 0, line_total NUMERIC(18,2) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS approval_workflows (id UUID PRIMARY KEY, company_id UUID NOT NULL, document_type VARCHAR(64) NOT NULL, name VARCHAR(255) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true)`,
    `CREATE TABLE IF NOT EXISTS approval_steps (id UUID PRIMARY KEY, workflow_id UUID NOT NULL, step_no INTEGER NOT NULL, role_id UUID, min_amount NUMERIC(18,2), max_amount NUMERIC(18,2))`,
    `CREATE TABLE IF NOT EXISTS approval_requests (id UUID PRIMARY KEY, workflow_id UUID NOT NULL, document_type VARCHAR(64) NOT NULL, document_id UUID NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'pending', current_step INTEGER NOT NULL DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS approval_actions (id UUID PRIMARY KEY, approval_request_id UUID NOT NULL, user_id UUID NOT NULL, step_no INTEGER NOT NULL, action VARCHAR(32) NOT NULL, comment TEXT, action_at TIMESTAMP NOT NULL DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS attachments (id UUID PRIMARY KEY, company_id UUID NOT NULL, entity_type VARCHAR(64) NOT NULL, entity_id UUID NOT NULL, file_name VARCHAR(255) NOT NULL, storage_key VARCHAR(512) NOT NULL, mime_type VARCHAR(128), created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS audit_logs (id UUID PRIMARY KEY, company_id UUID, user_id UUID, entity_type VARCHAR(64) NOT NULL, entity_id UUID NOT NULL, action VARCHAR(32) NOT NULL, old_values JSONB, new_values JSONB, created_at TIMESTAMP NOT NULL DEFAULT NOW())`,
  ];
  for (const q of ddl) await db.execute(sql.raw(q));
  // recommended indexes
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS ix_sales_orders_customer_date ON sales_orders(company_id, customer_id, order_date)`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS ix_sales_invoices_customer_status ON sales_invoices(company_id, customer_id, status)`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS ix_purchase_orders_supplier_date ON purchase_orders(company_id, supplier_id, order_date)`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS ix_stock_movements_lookup ON stock_movements(company_id, product_id, warehouse_id, movement_at)`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS ix_inventory_balances_lookup ON inventory_balances(company_id, product_id, warehouse_id, location_id)`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS ix_journal_entries_posting_date ON journal_entries(company_id, posting_date)`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS ix_journal_entry_lines_account ON journal_entry_lines(account_id, journal_entry_id)`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS ix_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at)`));
}
await initDDL();

// ---------------------------------------------------------------------------
// Seed minimal (idempotent — bersihkan dulu untuk demo)
// ---------------------------------------------------------------------------
await db.execute(sql.raw(`TRUNCATE audit_logs, attachments, approval_actions, approval_requests, approval_steps, approval_workflows, pos_transaction_items, pos_transactions, pos_sessions, pos_profiles, pricing_rules, price_list_items, price_lists, nonconformances, quality_inspection_results, quality_inspections, quality_template_parameters, quality_templates, asset_disposals, asset_depreciation_schedules, assets, asset_categories, expense_claims, timesheets, tasks, projects, payslip_lines, payslips, payroll_runs, leave_requests, leave_types, attendances, shifts, employees, job_titles, departments, production_receipts, production_material_issue_items, production_material_issues, production_order_operations, production_orders, routing_operations, work_centers, routings, bom_items, boms, payment_allocations, payments, tax_rules, bank_transactions, bank_accounts, journal_entry_lines, journal_entries, cost_centers, accounts, accounting_periods, fiscal_years, stock_transfer_items, stock_transfers, stock_reservations, inventory_balances, stock_movements, serial_numbers, batches, supplier_invoice_items, supplier_invoices, goods_receipt_items, goods_receipts, purchase_order_items, purchase_orders, supplier_quotation_items, supplier_quotations, rfq_items, rfq_suppliers, request_for_quotations, purchase_request_items, purchase_requests, sales_invoice_items, sales_invoices, sales_delivery_items, sales_deliveries, sales_order_items, sales_orders, quotation_items, quotations, opportunities, leads, warehouse_locations, warehouses, product_suppliers, product_uoms, products, uoms, brands, product_categories, party_contacts, party_addresses, suppliers, customers, parties, contacts, addresses, payment_terms, taxes, exchange_rates, currencies, role_permissions, user_roles, permissions, roles, users, branches, business_units, companies CASCADE`)).catch(()=>{});

const [cIDR] = await db.insert(currencies).values([{ code: "IDR", name: "Rupiah", decimalPlaces: 0 }, { code: "USD", name: "US Dollar", decimalPlaces: 2 }]).returning().catch(async () => await db.select().from(currencies));
const [comp] = await db.insert(companies).values({ code: "DEMO", name: "PT Demo Utama", taxId: "01.234.567.8-999.000", baseCurrencyCode: "IDR", status: "active" }).returning();
const [branch] = await db.insert(branches).values({ companyId: comp.id, code: "JKT", name: "Jakarta Pusat" }).returning();
const [wh] = await db.insert(warehouses).values({ companyId: comp.id, branchId: branch.id, code: "WH-JKT", name: "Gudang Jakarta" }).returning();
const [loc] = await db.insert(warehouseLocations).values({ warehouseId: wh.id, code: "A-01", name: "Rak A1", locationType: "bin" }).returning();
const [uPcs] = await db.insert(uoms).values({ companyId: comp.id, code: "PCS", name: "Pieces", factor: "1" }).returning();
const [cat] = await db.insert(productCategories).values({ companyId: comp.id, code: "ELEC", name: "Elektronik" }).returning();
const [usr] = await db.insert(users).values({ username: "admin", email: "admin@demo.id", passwordHash: "hashed-demo", status: "active" }).returning();
const [role] = await db.insert(roles).values({ code: "admin", name: "Administrator" }).returning();
await db.insert(userRoles).values({ userId: usr.id, roleId: role.id, companyId: comp.id }).catch(()=>{});
const [ptCus] = await db.insert(parties).values({ companyId: comp.id, partyType: "customer", code: "CUST-001", legalName: "PT Pelanggan Setia", displayName: "Pelanggan Setia", status: "active" }).returning();
const [cust] = await db.insert(customers).values({ partyId: ptCus.id, creditLimit: "50000000" }).returning();
const [ptSup] = await db.insert(parties).values({ companyId: comp.id, partyType: "supplier", code: "SUP-001", legalName: "PT Pemasok Jaya", displayName: "Pemasok Jaya", status: "active" }).returning();
const [sup] = await db.insert(suppliers).values({ partyId: ptSup.id, leadTimeDays: 3 }).returning();
const [prodA] = await db.insert(products).values({ companyId: comp.id, categoryId: cat.id, stockUomId: uPcs.id, sku: "KB-001", name: "Keyboard Mechanical", productType: "goods", isStockItem: true, standardCost: "500000" }).returning();
const [prodB] = await db.insert(products).values({ companyId: comp.id, categoryId: cat.id, stockUomId: uPcs.id, sku: "MS-001", name: "Mouse Wireless", productType: "goods", isStockItem: true, standardCost: "200000" }).returning();
await db.insert(inventoryBalances).values({ companyId: comp.id, productId: prodA.id, warehouseId: wh.id, locationId: loc.id, qtyOnHand: "100", avgCost: "500000" }).catch(()=>{});
await db.insert(stockMovements).values({ companyId: comp.id, productId: prodA.id, warehouseId: wh.id, locationId: loc.id, movementType: "ADJUSTMENT_IN", qtyIn: "100", unitCost: "500000", valueIn: "50000000" }).catch(()=>{});

// Akuntansi minimal — COA
const [fy] = await db.insert(fiscalYears).values({ companyId: comp.id, name: "FY 2026", startDate: "2026-01-01", endDate: "2026-12-31", status: "open" }).returning().catch(async () => (await db.select().from(fiscalYears).limit(1))[0] ? [(await db.select().from(fiscalYears).limit(1))[0]] as any : []);
let fyId = fy?.id;
if (!fyId) {
  const rows = await db.select().from(fiscalYears).limit(1);
  fyId = rows[0]?.id;
}
if (fyId) {
  await db.insert(accountingPeriods).values({ fiscalYearId: fyId, name: "2026-01", startDate: "2026-01-01", endDate: "2026-01-31", status: "open" }).catch(()=>{});
}
for (const a of [
  { code: "1000", name: "Kas & Bank", accountType: "asset" },
  { code: "1100", name: "Piutang Usaha", accountType: "asset" },
  { code: "1400", name: "Persediaan", accountType: "asset" },
  { code: "2100", name: "Hutang Usaha", accountType: "liability" },
  { code: "4000", name: "Penjualan", accountType: "income" },
  { code: "5000", name: "HPP", accountType: "expense" },
] as const) {
  await db.insert(accounts).values({ companyId: comp.id, code: a.code, name: a.name, accountType: a.accountType, isGroup: false, isActive: true }).catch(()=>{});
}

// ── Seed komprehensif ERP (idempotent, lanjutkan dari seed minimal) ──
const accMap = new Map((await db.select().from(accounts)).map(a => [a.code, a]));
const getAcc = (code: string) => accMap.get(code)!;
const periodRows = await db.select().from(accountingPeriods).limit(1);
const periodId = periodRows[0]?.id ?? fyId;

// Master tambahan: UoM, Brand, Category, Price List
const [uBox] = await db.insert(uoms).values({ companyId: comp.id, code: "BOX", name: "Box", factor: "12" }).returning().catch(()=>[] ) as any;
const [brand] = await db.insert(brands).values({ companyId: comp.id, code: "DEMO", name: "Demo Brand" }).returning().catch(()=>[] ) as any;
const [catRaw] = await db.insert(productCategories).values({ companyId: comp.id, code: "RAW", name: "Bahan Baku" }).returning().catch(()=>[] ) as any;
const [priceList] = await db.insert(priceLists).values({ companyId: comp.id, code: "PL-RETAIL", name: "Retail IDR", currencyCode: "IDR", isSales: true }).returning().catch(()=>[] ) as any;
if (priceList && prodA) await db.insert(priceListItems).values({ priceListId: priceList.id, productId: prodA.id, minQty: "1", unitPrice: "750000" }).catch(()=>{});
if (priceList && prodB) await db.insert(priceListItems).values({ priceListId: priceList.id, productId: prodB.id, minQty: "1", unitPrice: "300000" }).catch(()=>{});
await db.insert(pricingRules).values({ companyId: comp.id, ruleNo: "DISC-10", appliesTo: "all", discountPercent: "10", status: "active" }).catch(()=>{});
await db.insert(paymentTerms).values({ companyId: comp.id, code: "NET14", name: "Net 14", dueDays: 14 }).catch(()=>{});
await db.insert(taxes).values({ companyId: comp.id, code: "PPN11", name: "PPN 11%", rate: "0.11", taxType: "vat" }).catch(()=>{});
await db.insert(exchangeRates).values({ fromCurrencyCode: "USD", toCurrencyCode: "IDR", rateDate: "2026-01-01", rate: "16250.000000" }).catch(()=>{});
const [addr] = await db.insert(addresses).values({ addressLine1: "Jl. Sudirman No. 1", city: "Jakarta", province: "DKI Jakarta", postalCode: "12190", countryCode: "ID" }).returning().catch(()=>[] ) as any;
const [ct] = await db.insert(contacts).values({ name: "Budi Santoso", email: "budi@pelanggan.id", phone: "08123456789" }).returning().catch(()=>[] ) as any;
if (addr && ptCus) await db.insert(partyAddresses).values({ partyId: ptCus.id, addressId: addr.id, addressType: "billing", isDefault: true }).catch(()=>{});
if (ct && ptCus) await db.insert(partyContacts).values({ partyId: ptCus.id, contactId: ct.id, isPrimary: true }).catch(()=>{});
const [dept] = await db.insert(departments).values({ companyId: comp.id, code: "OPS", name: "Operations" }).returning().catch(()=>[] ) as any;
const [jt] = await db.insert(jobTitles).values({ companyId: comp.id, code: "MGR", name: "Manager" }).returning().catch(()=>[] ) as any;
const [emp] = await db.insert(employees).values({ companyId: comp.id, departmentId: dept?.id, jobTitleId: jt?.id, employeeNo: "EMP-001", firstName: "Siti", lastName: "Aminah", hireDate: "2024-06-01", employmentStatus: "active" }).returning().catch(()=>[] ) as any;
await db.insert(shifts).values({ companyId: comp.id, code: "SHIFT1", name: "Pagi", startTime: "08:00", endTime: "17:00" }).catch(()=>{});
await db.insert(leaveTypes).values({ companyId: comp.id, code: "ANNUAL", name: "Cuti Tahunan", isPaid: true }).catch(()=>{});

// CRM: Lead → Opportunity → Quotation
const [lead] = await db.insert(leads).values({ companyId: comp.id, partyId: ptCus.id, leadNo: "LEAD-001", source: "website", status: "open", estimatedValue: "10000000" }).returning().catch(()=>[] ) as any;
const [opp] = await db.insert(opportunities).values({ companyId: comp.id, leadId: lead?.id, customerId: cust.id, opportunityNo: "OPP-001", stage: "proposal", probability: "60", estimatedValue: "15000000", expectedCloseDate: "2026-02-15" }).returning().catch(()=>[] ) as any;
const [quo] = await db.insert(quotations).values({ companyId: comp.id, customerId: cust.id, opportunityId: opp?.id, quotationNo: "QUO-001", quotationDate: "2026-01-10", validUntil: "2026-02-10", status: "approved", grandTotal: "1050000" }).returning().catch(()=>[] ) as any;
if (quo) {
  await db.insert(quotationItems).values({ quotationId: quo.id, productId: prodA.id, uomId: uPcs.id, qty: "2", unitPrice: "750000", lineTotal: "1500000" }).catch(()=>{});
}

// Sales O2C: Order → Delivery → Invoice → Payment (dengan stock ledger + GL)
const [so] = await db.insert(salesOrders).values({ companyId: comp.id, branchId: branch.id, customerId: cust.id, quotationId: quo?.id, orderNo: "SO-001", orderDate: "2026-01-12", currencyCode: "IDR", status: "approved", grandTotal: "1500000" }).returning().catch(()=>[] ) as any;
let soItemA: any, soItemB: any;
if (so) {
  [soItemA] = await db.insert(salesOrderItems).values({ salesOrderId: so.id, productId: prodA.id, uomId: uPcs.id, warehouseId: wh.id, orderedQty: "2", unitPrice: "750000", lineTotal: "1500000" }).returning().catch(()=>[] ) as any;
  [soItemB] = await db.insert(salesOrderItems).values({ salesOrderId: so.id, productId: prodB.id, uomId: uPcs.id, warehouseId: wh.id, orderedQty: "5", unitPrice: "300000", lineTotal: "1500000" }).returning().catch(()=>[] ) as any;
}
const [dn] = await db.insert(salesDeliveries).values({ companyId: comp.id, customerId: cust.id, salesOrderId: so?.id, deliveryNo: "DN-001", deliveryDate: "2026-01-13", status: "posted" }).returning().catch(()=>[] ) as any;
if (dn && soItemA) {
  await db.insert(salesDeliveryItems).values({ deliveryId: dn.id, salesOrderItemId: soItemA.id, productId: prodA.id, sourceLocationId: loc.id, qty: "2" }).catch(()=>{});
  // ledger stok keluar (source of truth)
  await db.insert(stockMovements).values({ companyId: comp.id, productId: prodA.id, warehouseId: wh.id, locationId: loc.id, movementType: "SALES_DELIVERY", referenceType: "SALES_DELIVERY", referenceId: dn.id, qtyOut: "2", unitCost: "500000", valueOut: "1000000" }).catch(()=>{});
}
const [si] = await db.insert(salesInvoices).values({ companyId: comp.id, customerId: cust.id, salesOrderId: so?.id, deliveryId: dn?.id, invoiceNo: "INV-001", invoiceDate: "2026-01-14", dueDate: "2026-01-28", status: "posted", grandTotal: "3000000", outstandingAmount: "0" }).returning().catch(()=>[] ) as any;
if (si) {
  await db.insert(salesInvoiceItems).values({ salesInvoiceId: si.id, productId: prodA.id, salesOrderItemId: soItemA?.id, qty: "2", unitPrice: "750000", lineTotal: "1500000" }).catch(()=>{});
  await db.insert(salesInvoiceItems).values({ salesInvoiceId: si.id, productId: prodB.id, salesOrderItemId: soItemB?.id, qty: "5", unitPrice: "300000", lineTotal: "1500000" }).catch(()=>{});
  // GL: Piutang (D) / Penjualan (K)
  const jeInv = await db.insert(journalEntries).values({ companyId: comp.id, accountingPeriodId: periodId, journalNo: "JE-INV-001", postingDate: "2026-01-14", sourceType: "SALES_INVOICE", sourceId: si.id, status: "posted", description: "Penjualan INV-001" }).returning().catch(()=>[] ) as any;
  const jeId = jeInv?.[0]?.id;
  if (jeId) {
    await db.insert(journalEntryLines).values([
      { journalEntryId: jeId, accountId: getAcc("1100").id, debit: "3000000", credit: "0", debitBase: "3000000", creditBase: "0", description: "Piutang INV-001" },
      { journalEntryId: jeId, accountId: getAcc("4000").id, debit: "0", credit: "3000000", debitBase: "0", creditBase: "3000000", description: "Penjualan INV-001" },
    ]).catch(()=>{});
  }
  // GL: HPP (D) / Persediaan (K) untuk delivery
  const jeCogs = await db.insert(journalEntries).values({ companyId: comp.id, accountingPeriodId: periodId, journalNo: "JE-COGS-001", postingDate: "2026-01-13", sourceType: "SALES_DELIVERY", sourceId: dn?.id, status: "posted", description: "HPP DN-001" }).returning().catch(()=>[] ) as any;
  const jeCogsId = jeCogs?.[0]?.id;
  if (jeCogsId) {
    await db.insert(journalEntryLines).values([
      { journalEntryId: jeCogsId, accountId: getAcc("5000").id, debit: "1000000", credit: "0", debitBase: "1000000", creditBase: "0", description: "HPP DN-001" },
      { journalEntryId: jeCogsId, accountId: getAcc("1400").id, debit: "0", credit: "1000000", debitBase: "0", creditBase: "1000000", description: "Persediaan DN-001" },
    ]).catch(()=>{});
  }
}
const [bankAcc] = await db.insert(bankAccounts).values({ companyId: comp.id, accountId: getAcc("1000").id, bankName: "Bank Central", accountName: "PT Demo Utama", accountNumber: "1234567890" }).returning().catch(()=>[] ) as any;
if (si && bankAcc) {
  const [pay] = await db.insert(payments).values({ companyId: comp.id, partyId: ptCus.id, bankAccountId: bankAcc.id, paymentNo: "PAY-001", paymentDate: "2026-01-20", paymentType: "CUSTOMER_RECEIPT", direction: "in", amount: "3000000", currencyCode: "IDR", status: "posted" }).returning().catch(()=>[] ) as any;
  if (pay) {
    await db.insert(paymentAllocations).values({ paymentId: pay.id, referenceType: "SALES_INVOICE", referenceId: si.id, allocatedAmount: "3000000" }).catch(()=>{});
    const jePay = await db.insert(journalEntries).values({ companyId: comp.id, accountingPeriodId: periodId, journalNo: "JE-PAY-001", postingDate: "2026-01-20", sourceType: "PAYMENT", sourceId: pay.id, status: "posted", description: "Pelunasan INV-001" }).returning().catch(()=>[] ) as any;
    const jePayId = jePay?.[0]?.id;
    if (jePayId) {
      await db.insert(journalEntryLines).values([
        { journalEntryId: jePayId, accountId: getAcc("1000").id, debit: "3000000", credit: "0", debitBase: "3000000", creditBase: "0", description: "Kas PAY-001" },
        { journalEntryId: jePayId, accountId: getAcc("1100").id, debit: "0", credit: "3000000", debitBase: "0", creditBase: "3000000", description: "Pelunasan piutang" },
      ]).catch(()=>{});
    }
  }
}

// Purchasing P2P: Request → RFQ → PO → GR → Bill → Payment
const [pr] = await db.insert(purchaseRequests).values({ companyId: comp.id, requestNo: "PR-001", requestDate: "2026-01-05", status: "approved" }).returning().catch(()=>[] ) as any;
if (pr) await db.insert(purchaseRequestItems).values({ purchaseRequestId: pr.id, productId: prodA.id, uomId: uPcs.id, requestedQty: "10", requiredDate: "2026-01-20" }).catch(()=>{});
const [rfq] = await db.insert(requestForQuotations).values({ companyId: comp.id, rfqNo: "RFQ-001", rfqDate: "2026-01-06", responseDueDate: "2026-01-10", status: "closed" }).returning().catch(()=>[] ) as any;
if (rfq) {
  await db.insert(rfqItems).values({ rfqId: rfq.id, productId: prodA.id, uomId: uPcs.id, qty: "10" }).catch(()=>{});
  await db.insert(rfqSuppliers).values({ rfqId: rfq.id, supplierId: sup.id }).catch(()=>{});
}
const [sq] = await db.insert(supplierQuotations).values({ companyId: comp.id, supplierId: sup.id, rfqId: rfq?.id, quotationNo: "SQ-001", quotationDate: "2026-01-07", grandTotal: "4800000" }).returning().catch(()=>[] ) as any;
if (sq) await db.insert(supplierQuotationItems).values({ supplierQuotationId: sq.id, productId: prodA.id, qty: "10", unitPrice: "480000" }).catch(()=>{});
const [po] = await db.insert(purchaseOrders).values({ companyId: comp.id, supplierId: sup.id, supplierQuotationId: sq?.id, poNo: "PO-001", orderDate: "2026-01-08", expectedDate: "2026-01-15", status: "posted", grandTotal: "4800000" }).returning().catch(()=>[] ) as any;
let poItem: any;
if (po) [poItem] = await db.insert(purchaseOrderItems).values({ purchaseOrderId: po.id, productId: prodA.id, uomId: uPcs.id, warehouseId: wh.id, orderedQty: "10", unitPrice: "480000", lineTotal: "4800000" }).returning().catch(()=>[] ) as any;
const [gr] = await db.insert(goodsReceipts).values({ companyId: comp.id, supplierId: sup.id, purchaseOrderId: po?.id, receiptNo: "GR-001", receiptDate: "2026-01-15", status: "posted" }).returning().catch(()=>[] ) as any;
if (gr && poItem) {
  await db.insert(goodsReceiptItems).values({ goodsReceiptId: gr.id, purchaseOrderItemId: poItem.id, productId: prodA.id, locationId: loc.id, receivedQty: "10", acceptedQty: "10", unitCost: "480000" }).catch(()=>{});
  await db.insert(stockMovements).values({ companyId: comp.id, productId: prodA.id, warehouseId: wh.id, locationId: loc.id, movementType: "PURCHASE_RECEIPT", referenceType: "GOODS_RECEIPT", referenceId: gr.id, qtyIn: "10", unitCost: "480000", valueIn: "4800000" }).catch(()=>{});
  const jeGr = await db.insert(journalEntries).values({ companyId: comp.id, accountingPeriodId: periodId, journalNo: "JE-GR-001", postingDate: "2026-01-15", sourceType: "GOODS_RECEIPT", sourceId: gr.id, status: "posted", description: "Penerimaan GR-001" }).returning().catch(()=>[] ) as any;
  const jeGrId = jeGr?.[0]?.id;
  if (jeGrId) {
    await db.insert(journalEntryLines).values([
      { journalEntryId: jeGrId, accountId: getAcc("1400").id, debit: "4800000", credit: "0", debitBase: "4800000", creditBase: "0", description: "Persediaan GR-001" },
      { journalEntryId: jeGrId, accountId: getAcc("2100").id, debit: "0", credit: "4800000", debitBase: "0", creditBase: "4800000", description: "Hutang GR-001" },
    ]).catch(()=>{});
  }
}
const [bill] = await db.insert(supplierInvoices).values({ companyId: comp.id, supplierId: sup.id, purchaseOrderId: po?.id, goodsReceiptId: gr?.id, billNo: "BILL-001", billDate: "2026-01-16", dueDate: "2026-01-30", grandTotal: "4800000", outstandingAmount: "0", status: "posted" }).returning().catch(()=>[] ) as any;
if (bill) {
  await db.insert(supplierInvoiceItems).values({ supplierInvoiceId: bill.id, productId: prodA.id, qty: "10", unitPrice: "480000", lineTotal: "4800000" }).catch(()=>{});
  if (bankAcc) {
    const [paySup] = await db.insert(payments).values({ companyId: comp.id, partyId: ptSup.id, bankAccountId: bankAcc.id, paymentNo: "PAY-SUP-001", paymentDate: "2026-01-25", paymentType: "SUPPLIER_PAYMENT", direction: "out", amount: "4800000", currencyCode: "IDR", status: "posted" }).returning().catch(()=>[] ) as any;
    if (paySup) {
      await db.insert(paymentAllocations).values({ paymentId: paySup.id, referenceType: "SUPPLIER_INVOICE", referenceId: bill.id, allocatedAmount: "4800000" }).catch(()=>{});
      const jePaySup = await db.insert(journalEntries).values({ companyId: comp.id, accountingPeriodId: periodId, journalNo: "JE-PAY-SUP-001", postingDate: "2026-01-25", sourceType: "PAYMENT", sourceId: paySup.id, status: "posted", description: "Bayar BILL-001" }).returning().catch(()=>[] ) as any;
      const jePaySupId = jePaySup?.[0]?.id;
      if (jePaySupId) {
        await db.insert(journalEntryLines).values([
          { journalEntryId: jePaySupId, accountId: getAcc("2100").id, debit: "4800000", credit: "0", debitBase: "4800000", creditBase: "0", description: "Hutang BILL-001" },
          { journalEntryId: jePaySupId, accountId: getAcc("1000").id, debit: "0", credit: "4800000", debitBase: "0", creditBase: "4800000", description: "Kas keluar PAY-SUP-001" },
        ]).catch(()=>{});
      }
    }
  }
}

// Inventory tambahan: Batch/Serial, Reservation, Transfer
const [batch] = await db.insert(batches).values({ productId: prodA.id, batchNo: "BATCH-001", manufacturingDate: "2026-01-01", expiryDate: "2027-01-01", status: "active" }).returning().catch(()=>[] ) as any;
if (batch) await db.insert(serialNumbers).values({ productId: prodA.id, batchId: batch.id, serialNo: "SN-0001", status: "available" }).catch(()=>{});
await db.insert(stockReservations).values({ productId: prodA.id, warehouseId: wh.id, locationId: loc.id, referenceType: "SALES_ORDER", referenceId: so?.id ?? prodA.id, reservedQty: "2", status: "reserved" }).catch(()=>{});
const [wh2] = await db.insert(warehouses).values({ companyId: comp.id, branchId: branch.id, code: "WH-SBY", name: "Gudang Surabaya" }).returning().catch(()=>[] ) as any;
if (wh2) {
  const [tr] = await db.insert(stockTransfers).values({ companyId: comp.id, sourceWarehouseId: wh.id, targetWarehouseId: wh2.id, transferNo: "TR-001", transferDate: "2026-01-20", status: "posted" }).returning().catch(()=>[] ) as any;
  if (tr) {
    await db.insert(stockTransferItems).values({ stockTransferId: tr.id, productId: prodA.id, sourceLocationId: loc.id, qty: "5" }).catch(()=>{});
    await db.insert(stockMovements).values([
      { companyId: comp.id, productId: prodA.id, warehouseId: wh.id, locationId: loc.id, movementType: "TRANSFER_OUT", referenceType: "STOCK_TRANSFER", referenceId: tr.id, qtyOut: "5", unitCost: "480000", valueOut: "2400000" },
      { companyId: comp.id, productId: prodA.id, warehouseId: wh2.id, movementType: "TRANSFER_IN", referenceType: "STOCK_TRANSFER", referenceId: tr.id, qtyIn: "5", unitCost: "480000", valueIn: "2400000" },
    ]).catch(()=>{});
  }
}

// Manufacturing
const [wc] = await db.insert(workCenters).values({ companyId: comp.id, code: "WC-ASM", name: "Assembly", hourlyRate: "150000", capacityPerHour: "10" }).returning().catch(()=>[] ) as any;
const [routing] = await db.insert(routings).values({ companyId: comp.id, code: "RT-001", name: "Routing Keyboard" }).returning().catch(()=>[] ) as any;
if (routing && wc) await db.insert(routingOperations).values({ routingId: routing.id, workCenterId: wc.id, sequenceNo: 1, operationName: "Assemble", setupTimeMinutes: "10", runTimeMinutes: "30" }).catch(()=>{});
const [bom] = await db.insert(boms).values({ companyId: comp.id, productId: prodA.id, bomNo: "BOM-001", outputQty: "1", isActive: true, status: "active" }).returning().catch(()=>[] ) as any;
if (bom) await db.insert(bomItems).values({ bomId: bom.id, componentProductId: prodB.id, uomId: uPcs.id, qty: "1" }).catch(()=>{});
const [prodOrder] = await db.insert(productionOrders).values({ companyId: comp.id, productId: prodA.id, bomId: bom?.id, routingId: routing?.id, productionNo: "WO-001", plannedQty: "20", status: "released", plannedStartDate: "2026-01-20", plannedEndDate: "2026-01-25" }).returning().catch(()=>[] ) as any;

// HR & Project
if (emp) {
  await db.insert(attendances).values({ employeeId: emp.id, attendanceDate: "2026-01-20", checkIn: new Date("2026-01-20T08:00:00Z"), checkOut: new Date("2026-01-20T17:00:00Z"), status: "present" }).catch(()=>{});
  const [lt] = await db.select().from(leaveTypes).limit(1);
  if (lt) await db.insert(leaveRequests).values({ employeeId: emp.id, leaveTypeId: lt.id, startDate: "2026-01-22", endDate: "2026-01-23", totalDays: "2", status: "approved" }).catch(()=>{});
  const [prun] = await db.insert(payrollRuns).values({ companyId: comp.id, periodStart: "2026-01-01", periodEnd: "2026-01-31", status: "posted" }).returning().catch(()=>[] ) as any;
  if (prun) {
    const [slip] = await db.insert(payslips).values({ payrollRunId: prun.id, employeeId: emp.id, grossAmount: "12000000", deductionAmount: "2000000", netAmount: "10000000", status: "posted" }).returning().catch(()=>[] ) as any;
    if (slip) await db.insert(payslipLines).values([
      { payslipId: slip.id, componentType: "earning", componentCode: "BASIC", componentName: "Gaji Pokok", amount: "10000000" },
      { payslipId: slip.id, componentType: "earning", componentCode: "ALLOW", componentName: "Tunjangan", amount: "2000000" },
      { payslipId: slip.id, componentType: "deduction", componentCode: "BPJS", componentName: "BPJS", amount: "2000000" },
    ]).catch(()=>{});
  }
}
const [proj] = await db.insert(projects).values({ companyId: comp.id, customerId: cust.id, projectNo: "PRJ-001", name: "Implementasi ERP", startDate: "2026-01-01", endDate: "2026-03-31", budgetAmount: "500000000", status: "open" }).returning().catch(()=>[] ) as any;
if (proj && emp) {
  const [tsk] = await db.insert(tasks).values({ projectId: proj.id, taskNo: "TSK-001", title: "Kickoff & Requirement", status: "done", progressPercent: "100", assignedEmployeeId: emp.id }).returning().catch(()=>[] ) as any;
  await db.insert(timesheets).values({ companyId: comp.id, employeeId: emp.id, projectId: proj.id, workDate: "2026-01-10", hours: "8", status: "approved" }).catch(()=>{});
  await db.insert(expenseClaims).values({ companyId: comp.id, employeeId: emp.id, projectId: proj.id, expenseDate: "2026-01-11", amount: "500000", status: "approved" }).catch(()=>{});
}

// Asset, Quality, POS, Governance
const [assetCat] = await db.insert(assetCategories).values({ companyId: comp.id, code: "IT-EQ", name: "IT Equipment", usefulLifeMonths: 36 }).returning().catch(()=>[] ) as any;
if (assetCat) {
  const [asset] = await db.insert(assets).values({ companyId: comp.id, assetCategoryId: assetCat.id, assetNo: "AST-001", name: "Laptop Dell", acquisitionDate: "2026-01-02", acquisitionCost: "15000000", status: "active" }).returning().catch(()=>[] ) as any;
  if (asset) {
    await db.insert(assetDepreciationSchedules).values({ assetId: asset.id, depreciationDate: "2026-01-31", depreciationAmount: "416666", accumulatedDepreciation: "416666", netBookValue: "14583334", status: "posted" }).catch(()=>{});
  }
}
const [qt] = await db.insert(qualityTemplates).values({ companyId: comp.id, code: "QT-001", name: "QC Keyboard" }).returning().catch(()=>[] ) as any;
if (qt) {
  const [param] = await db.insert(qualityTemplateParameters).values({ qualityTemplateId: qt.id, parameterName: "Key Travel", dataType: "number", minValue: "1.5", maxValue: "2.5", isRequired: true }).returning().catch(()=>[] ) as any;
  const [insp] = await db.insert(qualityInspections).values({ companyId: comp.id, productId: prodA.id, qualityTemplateId: qt.id, referenceType: "GOODS_RECEIPT", referenceId: gr?.id, inspectionNo: "QC-001", inspectionDate: "2026-01-15", status: "passed" }).returning().catch(()=>[] ) as any;
  if (insp && param) {
    await db.insert(qualityInspectionResults).values({ inspectionId: insp.id, templateParameterId: param.id, measuredValue: "2.0", isAccepted: true }).catch(()=>{});
  }
}
if (priceList && wh) {
  const [pp] = await db.insert(posProfiles).values({ companyId: comp.id, warehouseId: wh.id, priceListId: priceList.id, code: "POS-01", name: "Kasir Utama", isActive: true }).returning().catch(()=>[] ) as any;
  if (pp) {
    const [sess] = await db.insert(posSessions).values({ posProfileId: pp.id, openedBy: usr.id, openingCash: "1000000", status: "closed", closedAt: new Date(), closingCash: "2500000" }).returning().catch(()=>[] ) as any;
    if (sess) {
      const [trx] = await db.insert(posTransactions).values({ posSessionId: sess.id, customerId: cust.id, receiptNo: "POS-001", grandTotal: "750000", status: "posted" }).returning().catch(()=>[] ) as any;
      if (trx) await db.insert(posTransactionItems).values({ posTransactionId: trx.id, productId: prodA.id, qty: "1", unitPrice: "750000", lineTotal: "750000" }).catch(()=>{});
    }
  }
}
const [wf] = await db.insert(approvalWorkflows).values({ companyId: comp.id, documentType: "PURCHASE_ORDER", name: "Approval PO > 1jt", isActive: true }).returning().catch(()=>[] ) as any;
if (wf) {
  const [st] = await db.insert(approvalSteps).values({ workflowId: wf.id, stepNo: 1, roleId: role.id, minAmount: "1000000" }).returning().catch(()=>[] ) as any;
  if (po && st) {
    const [ar] = await db.insert(approvalRequests).values({ workflowId: wf.id, documentType: "PURCHASE_ORDER", documentId: po.id, status: "approved", currentStep: 1 }).returning().catch(()=>[] ) as any;
    if (ar) await db.insert(approvalActions).values({ approvalRequestId: ar.id, userId: usr.id, stepNo: 1, action: "approved", comment: "OK" }).catch(()=>{});
  }
}
await db.insert(auditLogs).values({ companyId: comp.id, userId: usr.id, entityType: "SALES_ORDER", entityId: so?.id ?? comp.id, action: "create", newValues: { orderNo: "SO-001" } }).catch(()=>{});
await db.insert(attachments).values({ companyId: comp.id, entityType: "SALES_ORDER", entityId: so?.id ?? comp.id, fileName: "so-001.pdf", storageKey: "attachments/so-001.pdf", mimeType: "application/pdf" }).catch(()=>{});


// ---------------------------------------------------------------------------
// Validation helpers (TypeBox via elysia t)
// ---------------------------------------------------------------------------
const UuidParam = t.Object({ id: t.String({ format: "uuid" }) });
const Q = t.Optional(t.Object({ search: t.Optional(t.String()), status: t.Optional(t.String()), sort: t.Optional(t.String()), page: t.Optional(t.Numeric()), limit: t.Optional(t.Numeric()) }));
const baseCreate = (fields: any) => t.Object(fields);

// ---------------------------------------------------------------------------
// rack() wiring — helper
// ---------------------------------------------------------------------------
function erpRack(path: string, table: any, meta: { id: string; label: string; plural: string; group: string; order: number; parent?: string; searchable?: string[]; filterable?: string[]; sortable?: string[]; softDelete?: boolean; idempotency?: boolean }) {
  return rack(path, {
    model: { drizzle: { db, table } },
    validation: {
      params: UuidParam as any,
      query: Q as any,
      create: t.Any() as any,
      update: t.Any() as any,
      replace: t.Any() as any,
    },
    query: {
      searchable: meta.searchable ?? ["name", "code"],
      filterable: meta.filterable ?? ["status", "companyId"],
      sortable: meta.sortable ?? ["createdAt", "name", "code"],
      pagination: { default: 20, max: 100 },
    },
    metadata: {
      id: meta.id,
      label: meta.label,
      pluralLabel: meta.plural,
      group: meta.group,
      order: meta.order,
      ...(meta.parent ? { parent: meta.parent } : {}),
    },
    openapi: { tags: [meta.group] },
    settings: { primaryKey: "id", returning: true, softDelete: meta.softDelete ?? true },
    idempotency: meta.idempotency === false ? { enabled: false } as any : undefined,
  });
}

// Header/detail pattern — untuk dokumen, detail items dibuat rack terpisah dengan parent
function docItemRack(path: string, table: any, parentId: string, meta: { id: string; label: string; plural: string; group: string; order: number }) {
  return rack(path, {
    model: { drizzle: { db, table } },
    validation: { params: UuidParam as any, query: Q as any, create: t.Any() as any, update: t.Any() as any },
    query: { filterable: [parentId], sortable: ["id"], pagination: { default: 20, max: 100 } },
    metadata: { id: meta.id, label: meta.label, pluralLabel: meta.plural, group: meta.group, order: meta.order, parent: meta.id.replace(/-items$/, "") },
    openapi: { tags: [meta.group] },
    settings: { primaryKey: "id", returning: true },
  });
}

// ---------------------------------------------------------------------------
// App — dashboard + all racks
// ---------------------------------------------------------------------------
const app = new Elysia()
  .use(reactPlugin())
  .use(dashboard({ title: "ERP Demo — elysia-rack", path: "/" }))

  // CORE / SECURITY — 11 racks
  .use(erpRack("/core/companies", companies, { id: "companies", label: "Company", plural: "Companies", group: "Core", order: 1, searchable: ["name","code"], filterable: ["status"], sortable: ["name","code"], softDelete: false }))
  .use(erpRack("/core/business-units", businessUnits, { id: "business-units", label: "Business Unit", plural: "Business Units", group: "Core", order: 2 }))
  .use(erpRack("/core/branches", branches, { id: "branches", label: "Branch", plural: "Branches", group: "Core", order: 3 }))
  .use(erpRack("/core/users", users, { id: "users", label: "User", plural: "Users", group: "Core", order: 4, searchable: ["username","email"], filterable: ["status"], sortable: ["username"] }))
  .use(erpRack("/core/roles", roles, { id: "roles", label: "Role", plural: "Roles", group: "Core", order: 5, searchable: ["name","code"], sortable: ["code"] }))
  .use(erpRack("/core/permissions", permissions, { id: "permissions", label: "Permission", plural: "Permissions", group: "Core", order: 6, searchable: ["resource","action"] }))
  .use(erpRack("/core/currencies", currencies, { id: "currencies", label: "Currency", plural: "Currencies", group: "Core", order: 7, searchable: ["name","code"], sortable: ["code"], softDelete: false }))
  .use(erpRack("/core/exchange-rates", exchangeRates, { id: "exchange-rates", label: "Exchange Rate", plural: "Exchange Rates", group: "Core", order: 8, filterable: ["fromCurrencyCode","toCurrencyCode"], sortable: ["rateDate"] }))
  .use(erpRack("/core/taxes", taxes, { id: "taxes", label: "Tax", plural: "Taxes", group: "Core", order: 9, searchable: ["name","code"] }))
  .use(erpRack("/core/payment-terms", paymentTerms, { id: "payment-terms", label: "Payment Term", plural: "Payment Terms", group: "Core", order: 10, searchable: ["name","code"] }))
  .use(erpRack("/core/addresses", addresses, { id: "addresses", label: "Address", plural: "Addresses", group: "Core", order: 11, searchable: ["city","addressLine1"] }))
  .use(erpRack("/core/contacts", contacts, { id: "contacts", label: "Contact", plural: "Contacts", group: "Core", order: 12, searchable: ["name","email"] }))

  // MASTER — 13 racks
  .use(erpRack("/master/parties", parties, { id: "parties", label: "Party", plural: "Parties", group: "Master", order: 1, searchable: ["legalName","code"], filterable: ["partyType","status"] }))
  .use(erpRack("/master/customers", customers, { id: "customers", label: "Customer", plural: "Customers", group: "Master", order: 2, parent: "parties" }))
  .use(erpRack("/master/suppliers", suppliers, { id: "suppliers", label: "Supplier", plural: "Suppliers", group: "Master", order: 3, parent: "parties" }))
  .use(erpRack("/master/product-categories", productCategories, { id: "product-categories", label: "Product Category", plural: "Product Categories", group: "Master", order: 4, searchable: ["name","code"] }))
  .use(erpRack("/master/brands", brands, { id: "brands", label: "Brand", plural: "Brands", group: "Master", order: 5, searchable: ["name","code"] }))
  .use(erpRack("/master/uoms", uoms, { id: "uoms", label: "UoM", plural: "UoMs", group: "Master", order: 6, searchable: ["name","code"] }))
  .use(erpRack("/master/products", products, { id: "products", label: "Product", plural: "Products", group: "Master", order: 7, searchable: ["name","sku","barcode"], filterable: ["productType","status"], sortable: ["name","sku"] }))
  .use(erpRack("/master/warehouses", warehouses, { id: "warehouses", label: "Warehouse", plural: "Warehouses", group: "Master", order: 8, searchable: ["name","code"] }))
  .use(erpRack("/master/warehouse-locations", warehouseLocations, { id: "warehouse-locations", label: "Warehouse Location", plural: "Warehouse Locations", group: "Master", order: 9, parent: "warehouses", searchable: ["name","code"] }))
  .use(erpRack("/master/price-lists", priceLists, { id: "price-lists", label: "Price List", plural: "Price Lists", group: "Master", order: 10, searchable: ["name","code"] }))
  .use(erpRack("/master/batches", batches, { id: "batches", label: "Batch", plural: "Batches", group: "Master", order: 11, searchable: ["batchNo"], filterable: ["status"] }))
  .use(erpRack("/master/serial-numbers", serialNumbers, { id: "serial-numbers", label: "Serial Number", plural: "Serial Numbers", group: "Master", order: 12, searchable: ["serialNo"], filterable: ["status"] }))

  // CRM
  .use(erpRack("/crm/leads", leads, { id: "leads", label: "Lead", plural: "Leads", group: "CRM", order: 1, searchable: ["leadNo","source"], filterable: ["status"] }))
  .use(erpRack("/crm/opportunities", opportunities, { id: "opportunities", label: "Opportunity", plural: "Opportunities", group: "CRM", order: 2, searchable: ["opportunityNo","stage"], filterable: ["stage"] }))
  .use(erpRack("/crm/quotations", quotations, { id: "quotations", label: "Quotation", plural: "Quotations", group: "CRM", order: 3, searchable: ["quotationNo"], filterable: ["status"], sortable: ["quotationDate"] }))
  .use(docItemRack("/crm/quotation-items", quotationItems, "quotationId", { id: "quotation-items", label: "Quotation Item", plural: "Quotation Items", group: "CRM", order: 4 }))

  // SALES (O2C)
  .use(erpRack("/sales/orders", salesOrders, { id: "sales-orders", label: "Sales Order", plural: "Sales Orders", group: "Sales", order: 1, searchable: ["orderNo"], filterable: ["status"], sortable: ["orderDate"] }))
  .use(docItemRack("/sales/order-items", salesOrderItems, "salesOrderId", { id: "sales-order-items", label: "Sales Order Item", plural: "Sales Order Items", group: "Sales", order: 2 }))
  .use(erpRack("/sales/deliveries", salesDeliveries, { id: "sales-deliveries", label: "Sales Delivery", plural: "Sales Deliveries", group: "Sales", order: 3, searchable: ["deliveryNo"], filterable: ["status"] }))
  .use(docItemRack("/sales/delivery-items", salesDeliveryItems, "deliveryId", { id: "sales-delivery-items", label: "Delivery Item", plural: "Delivery Items", group: "Sales", order: 4 }))
  .use(erpRack("/sales/invoices", salesInvoices, { id: "sales-invoices", label: "Sales Invoice", plural: "Sales Invoices", group: "Sales", order: 5, searchable: ["invoiceNo"], filterable: ["status"], sortable: ["invoiceDate"] }))
  .use(docItemRack("/sales/invoice-items", salesInvoiceItems, "salesInvoiceId", { id: "sales-invoice-items", label: "Sales Invoice Item", plural: "Sales Invoice Items", group: "Sales", order: 6 }))

  // PURCHASING (P2P)
  .use(erpRack("/purchasing/requests", purchaseRequests, { id: "purchase-requests", label: "Purchase Request", plural: "Purchase Requests", group: "Purchasing", order: 1, searchable: ["requestNo"], filterable: ["status"] }))
  .use(docItemRack("/purchasing/request-items", purchaseRequestItems, "purchaseRequestId", { id: "purchase-request-items", label: "PR Item", plural: "PR Items", group: "Purchasing", order: 2 }))
  .use(erpRack("/purchasing/rfqs", requestForQuotations, { id: "rfqs", label: "RFQ", plural: "RFQs", group: "Purchasing", order: 3, searchable: ["rfqNo"], filterable: ["status"] }))
  .use(erpRack("/purchasing/supplier-quotations", supplierQuotations, { id: "supplier-quotations", label: "Supplier Quotation", plural: "Supplier Quotations", group: "Purchasing", order: 4, searchable: ["quotationNo"] }))
  .use(erpRack("/purchasing/orders", purchaseOrders, { id: "purchase-orders", label: "Purchase Order", plural: "Purchase Orders", group: "Purchasing", order: 5, searchable: ["poNo"], filterable: ["status"], sortable: ["orderDate"] }))
  .use(docItemRack("/purchasing/order-items", purchaseOrderItems, "purchaseOrderId", { id: "purchase-order-items", label: "PO Item", plural: "PO Items", group: "Purchasing", order: 6 }))
  .use(erpRack("/purchasing/goods-receipts", goodsReceipts, { id: "goods-receipts", label: "Goods Receipt", plural: "Goods Receipts", group: "Purchasing", order: 7, searchable: ["receiptNo"], filterable: ["status"] }))
  .use(docItemRack("/purchasing/goods-receipt-items", goodsReceiptItems, "goodsReceiptId", { id: "goods-receipt-items", label: "GR Item", plural: "GR Items", group: "Purchasing", order: 8 }))
  .use(erpRack("/purchasing/supplier-invoices", supplierInvoices, { id: "supplier-invoices", label: "Supplier Invoice", plural: "Supplier Invoices", group: "Purchasing", order: 9, searchable: ["billNo"], filterable: ["status"], sortable: ["billDate"] }))
  .use(docItemRack("/purchasing/supplier-invoice-items", supplierInvoiceItems, "supplierInvoiceId", { id: "supplier-invoice-items", label: "Supplier Invoice Item", plural: "Supplier Invoice Items", group: "Purchasing", order: 10 }))

  // INVENTORY (ledger)
  .use(erpRack("/inventory/movements", stockMovements, { id: "stock-movements", label: "Stock Movement", plural: "Stock Movements", group: "Inventory", order: 1, searchable: ["movementType","referenceType"], filterable: ["movementType"], sortable: ["movementAt"], softDelete: false }))
  .use(erpRack("/inventory/balances", inventoryBalances, { id: "inventory-balances", label: "Inventory Balance", plural: "Inventory Balances", group: "Inventory", order: 2, filterable: ["companyId"], sortable: ["qtyOnHand"], softDelete: false }))
  .use(erpRack("/inventory/reservations", stockReservations, { id: "stock-reservations", label: "Stock Reservation", plural: "Stock Reservations", group: "Inventory", order: 3, filterable: ["status"] }))
  .use(erpRack("/inventory/transfers", stockTransfers, { id: "stock-transfers", label: "Stock Transfer", plural: "Stock Transfers", group: "Inventory", order: 4, searchable: ["transferNo"], filterable: ["status"] }))
  .use(docItemRack("/inventory/transfer-items", stockTransferItems, "stockTransferId", { id: "stock-transfer-items", label: "Transfer Item", plural: "Transfer Items", group: "Inventory", order: 5 }))

  // ACCOUNTING
  .use(erpRack("/accounting/fiscal-years", fiscalYears, { id: "fiscal-years", label: "Fiscal Year", plural: "Fiscal Years", group: "Accounting", order: 1, searchable: ["name"], filterable: ["status"] }))
  .use(erpRack("/accounting/periods", accountingPeriods, { id: "accounting-periods", label: "Accounting Period", plural: "Accounting Periods", group: "Accounting", order: 2, parent: "fiscal-years", searchable: ["name"] }))
  .use(erpRack("/accounting/accounts", accounts, { id: "accounts", label: "Account", plural: "Chart of Accounts", group: "Accounting", order: 3, searchable: ["name","code"], filterable: ["accountType","isActive"], sortable: ["code"] }))
  .use(erpRack("/accounting/cost-centers", costCenters, { id: "cost-centers", label: "Cost Center", plural: "Cost Centers", group: "Accounting", order: 4, searchable: ["name","code"] }))
  .use(erpRack("/accounting/journal-entries", journalEntries, { id: "journal-entries", label: "Journal Entry", plural: "Journal Entries", group: "Accounting", order: 5, searchable: ["journalNo","description"], filterable: ["status"], sortable: ["postingDate"] }))
  .use(docItemRack("/accounting/journal-lines", journalEntryLines, "journalEntryId", { id: "journal-entry-lines", label: "Journal Line", plural: "Journal Lines", group: "Accounting", order: 6 }))
  .use(erpRack("/accounting/bank-accounts", bankAccounts, { id: "bank-accounts", label: "Bank Account", plural: "Bank Accounts", group: "Accounting", order: 7, searchable: ["bankName","accountNumber"] }))
  .use(erpRack("/accounting/bank-transactions", bankTransactions, { id: "bank-transactions", label: "Bank Transaction", plural: "Bank Transactions", group: "Accounting", order: 8, filterable: ["isReconciled"] }))
  .use(erpRack("/accounting/payments", payments, { id: "payments", label: "Payment", plural: "Payments", group: "Accounting", order: 9, searchable: ["paymentNo"], filterable: ["paymentType","direction","status"], sortable: ["paymentDate"] }))
  .use(docItemRack("/accounting/payment-allocations", paymentAllocations, "paymentId", { id: "payment-allocations", label: "Payment Allocation", plural: "Payment Allocations", group: "Accounting", order: 10 }))

  // MANUFACTURING
  .use(erpRack("/manufacturing/boms", boms, { id: "boms", label: "BOM", plural: "BOMs", group: "Manufacturing", order: 1, searchable: ["bomNo"], filterable: ["isActive"] }))
  .use(docItemRack("/manufacturing/bom-items", bomItems, "bomId", { id: "bom-items", label: "BOM Item", plural: "BOM Items", group: "Manufacturing", order: 2 }))
  .use(erpRack("/manufacturing/routings", routings, { id: "routings", label: "Routing", plural: "Routings", group: "Manufacturing", order: 3, searchable: ["code","name"] }))
  .use(erpRack("/manufacturing/work-centers", workCenters, { id: "work-centers", label: "Work Center", plural: "Work Centers", group: "Manufacturing", order: 4, searchable: ["code","name"] }))
  .use(docItemRack("/manufacturing/routing-operations", routingOperations, "routingId", { id: "routing-operations", label: "Routing Operation", plural: "Routing Operations", group: "Manufacturing", order: 5 }))
  .use(erpRack("/manufacturing/production-orders", productionOrders, { id: "production-orders", label: "Production Order", plural: "Production Orders", group: "Manufacturing", order: 6, searchable: ["productionNo"], filterable: ["status"] }))
  .use(erpRack("/manufacturing/material-issues", productionMaterialIssues, { id: "production-material-issues", label: "Material Issue", plural: "Material Issues", group: "Manufacturing", order: 7, filterable: ["status"] }))
  .use(erpRack("/manufacturing/receipts", productionReceipts, { id: "production-receipts", label: "Production Receipt", plural: "Production Receipts", group: "Manufacturing", order: 8, filterable: ["status"] }))

  // HR / PAYROLL
  .use(erpRack("/hr/departments", departments, { id: "departments", label: "Department", plural: "Departments", group: "HR", order: 1, searchable: ["name","code"] }))
  .use(erpRack("/hr/job-titles", jobTitles, { id: "job-titles", label: "Job Title", plural: "Job Titles", group: "HR", order: 2, searchable: ["name","code"] }))
  .use(erpRack("/hr/employees", employees, { id: "employees", label: "Employee", plural: "Employees", group: "HR", order: 3, searchable: ["employeeNo","firstName"], filterable: ["employmentStatus"] }))
  .use(erpRack("/hr/shifts", shifts, { id: "shifts", label: "Shift", plural: "Shifts", group: "HR", order: 4, searchable: ["code","name"] }))
  .use(erpRack("/hr/attendances", attendances, { id: "attendances", label: "Attendance", plural: "Attendances", group: "HR", order: 5, filterable: ["status"], sortable: ["attendanceDate"] }))
  .use(erpRack("/hr/leave-types", leaveTypes, { id: "leave-types", label: "Leave Type", plural: "Leave Types", group: "HR", order: 6, searchable: ["code","name"] }))
  .use(erpRack("/hr/leave-requests", leaveRequests, { id: "leave-requests", label: "Leave Request", plural: "Leave Requests", group: "HR", order: 7, filterable: ["status"] }))
  .use(erpRack("/hr/payroll-runs", payrollRuns, { id: "payroll-runs", label: "Payroll Run", plural: "Payroll Runs", group: "HR", order: 8, filterable: ["status"] }))
  .use(erpRack("/hr/payslips", payslips, { id: "payslips", label: "Payslip", plural: "Payslips", group: "HR", order: 9, parent: "payroll-runs", filterable: ["status"] }))
  .use(docItemRack("/hr/payslip-lines", payslipLines, "payslipId", { id: "payslip-lines", label: "Payslip Line", plural: "Payslip Lines", group: "HR", order: 10 }))

  // PROJECT
  .use(erpRack("/projects", projects, { id: "projects", label: "Project", plural: "Projects", group: "Project", order: 1, searchable: ["name","projectNo"], filterable: ["status"] }))
  .use(erpRack("/projects/tasks", tasks, { id: "tasks", label: "Task", plural: "Tasks", group: "Project", order: 2, parent: "projects", searchable: ["title","taskNo"], filterable: ["status"] }))
  .use(erpRack("/projects/timesheets", timesheets, { id: "timesheets", label: "Timesheet", plural: "Timesheets", group: "Project", order: 3, filterable: ["status"], sortable: ["workDate"] }))
  .use(erpRack("/projects/expense-claims", expenseClaims, { id: "expense-claims", label: "Expense Claim", plural: "Expense Claims", group: "Project", order: 4, filterable: ["status"] }))

  // ASSET
  .use(erpRack("/assets/categories", assetCategories, { id: "asset-categories", label: "Asset Category", plural: "Asset Categories", group: "Asset", order: 1, searchable: ["name","code"] }))
  .use(erpRack("/assets/assets", assets, { id: "assets", label: "Asset", plural: "Assets", group: "Asset", order: 2, parent: "asset-categories", searchable: ["name","assetNo"], filterable: ["status"] }))
  .use(erpRack("/assets/depreciation-schedules", assetDepreciationSchedules, { id: "asset-depreciation-schedules", label: "Depreciation Schedule", plural: "Depreciation Schedules", group: "Asset", order: 3, parent: "assets", filterable: ["status"] }))
  .use(erpRack("/assets/disposals", assetDisposals, { id: "asset-disposals", label: "Asset Disposal", plural: "Asset Disposals", group: "Asset", order: 4, filterable: ["status"] }))

  // QUALITY
  .use(erpRack("/quality/templates", qualityTemplates, { id: "quality-templates", label: "Quality Template", plural: "Quality Templates", group: "Quality", order: 1, searchable: ["name","code"] }))
  .use(docItemRack("/quality/template-parameters", qualityTemplateParameters, "qualityTemplateId", { id: "quality-template-parameters", label: "Template Parameter", plural: "Template Parameters", group: "Quality", order: 2 }))
  .use(erpRack("/quality/inspections", qualityInspections, { id: "quality-inspections", label: "Quality Inspection", plural: "Quality Inspections", group: "Quality", order: 3, searchable: ["inspectionNo"], filterable: ["status"] }))
  .use(docItemRack("/quality/inspection-results", qualityInspectionResults, "inspectionId", { id: "quality-inspection-results", label: "Inspection Result", plural: "Inspection Results", group: "Quality", order: 4 }))
  .use(erpRack("/quality/nonconformances", nonconformances, { id: "nonconformances", label: "Nonconformance", plural: "Nonconformances", group: "Quality", order: 5, searchable: ["ncNo"], filterable: ["severity","status"] }))

  // POS & PRICING
  .use(erpRack("/pos/profiles", posProfiles, { id: "pos-profiles", label: "POS Profile", plural: "POS Profiles", group: "POS", order: 1, searchable: ["code","name"] }))
  .use(erpRack("/pos/sessions", posSessions, { id: "pos-sessions", label: "POS Session", plural: "POS Sessions", group: "POS", order: 2, parent: "pos-profiles", filterable: ["status"] }))
  .use(erpRack("/pos/transactions", posTransactions, { id: "pos-transactions", label: "POS Transaction", plural: "POS Transactions", group: "POS", order: 3, parent: "pos-sessions", searchable: ["receiptNo"], filterable: ["status"] }))
  .use(docItemRack("/pos/transaction-items", posTransactionItems, "posTransactionId", { id: "pos-transaction-items", label: "POS Item", plural: "POS Items", group: "POS", order: 4 }))
  .use(docItemRack("/pricing/price-list-items", priceListItems, "priceListId", { id: "price-list-items", label: "Price List Item", plural: "Price List Items", group: "Pricing", order: 2 }))
  .use(erpRack("/pricing/rules", pricingRules, { id: "pricing-rules", label: "Pricing Rule", plural: "Pricing Rules", group: "Pricing", order: 3, searchable: ["ruleNo"], filterable: ["status"] }))

  // GOVERNANCE
  .use(erpRack("/governance/approval-workflows", approvalWorkflows, { id: "approval-workflows", label: "Approval Workflow", plural: "Approval Workflows", group: "Governance", order: 1, searchable: ["name","documentType"] }))
  .use(docItemRack("/governance/approval-steps", approvalSteps, "workflowId", { id: "approval-steps", label: "Approval Step", plural: "Approval Steps", group: "Governance", order: 2 }))
  .use(erpRack("/governance/approval-requests", approvalRequests, { id: "approval-requests", label: "Approval Request", plural: "Approval Requests", group: "Governance", order: 3, filterable: ["status"] }))
  .use(docItemRack("/governance/approval-actions", approvalActions, "approvalRequestId", { id: "approval-actions", label: "Approval Action", plural: "Approval Actions", group: "Governance", order: 4 }))
  .use(erpRack("/governance/attachments", attachments, { id: "attachments", label: "Attachment", plural: "Attachments", group: "Governance", order: 5, searchable: ["fileName","entityType"], softDelete: false }))
  .use(erpRack("/governance/audit-logs", auditLogs, { id: "audit-logs", label: "Audit Log", plural: "Audit Logs", group: "Governance", order: 6, searchable: ["entityType","action"], filterable: ["entityType","action"], sortable: ["createdAt"], softDelete: false }))

  .listen(5000);

console.log("ERP ready — PGlite in-memory");
console.log("  Dashboard              GET   http://localhost:5000/");
console.log("  Panel Companies        GET   http://localhost:5000/core/companies");
console.log("  Panel Products         GET   http://localhost:5000/master/products");
console.log("  Panel Sales Orders     GET   http://localhost:5000/sales/orders");
console.log("  Panel Stock Movements  GET   http://localhost:5000/inventory/movements  (ledger)");
console.log("  Panel Journal Entries  GET   http://localhost:5000/accounting/journal-entries");
console.log("  List via QUERY         QUERY http://localhost:5000/master/products/data  {search, filter, page, limit}");
console.log("  Create (Idempotency-Key required) POST http://localhost:5000/master/products -H 'Idempotency-Key: <uuid>'");
console.log("\\nSeeded: DEMO company, IDR/USD, WH-JKT, PCS, Keyboard/Mouse, customers/suppliers, COA, FY 2026");
console.log("Tips: semua route otomatis punya GET / (panel), QUERY /data, POST /, QUERY /data/:id, PUT/PATCH/DELETE /:id");

export { app };
export type App = typeof app;
