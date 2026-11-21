import { describe, expect, it } from "bun:test";
import {
  coerceIdValue,
  getAdapter,
  isNumericColumn,
} from "../../src/rack/adapters/index.ts";

describe("getAdapter", () => {
  it("resolves adapters", async () => {
    const { drizzleAdapter } = await import("../../src/rack/adapters/drizzle.ts");
    const { prismaAdapter } = await import("../../src/rack/adapters/prisma.ts");
    const { exceljsAdapter } = await import("../../src/rack/adapters/exceljs.ts");
    const { googleSheetsAdapter } = await import("../../src/rack/adapters/google-sheets.ts");
    expect(getAdapter({ drizzle: { db: {}, table: {} } } as any)).toBe(drizzleAdapter);
    expect(getAdapter({ prisma: { client: {}, model: {} } } as any)).toBe(prismaAdapter);
    expect(getAdapter({ exceljs: { worksheet: "Sheet1" } } as any)).toBe(exceljsAdapter);
    expect(getAdapter({ googleSheets: { auth: {}, spreadsheetId: "s", worksheet: "Sheet1" } } as any)).toBe(googleSheetsAdapter);
  });
});

describe("isNumericColumn", () => {
  it("treats unknown columns as numeric-friendly", () => {
    expect(isNumericColumn(undefined)).toBe(true);
    expect(isNumericColumn("PgSerial")).toBe(true);
    expect(isNumericColumn("PgInteger")).toBe(true);
    expect(isNumericColumn("number")).toBe(true);
    expect(isNumericColumn("PgText")).toBe(false);
    expect(isNumericColumn("PgUUID")).toBe(false);
  });
});

describe("coerceIdValue", () => {
  it("coerces numeric strings for numeric or unknown columns", () => {
    expect(coerceIdValue("42")).toBe(42);
    expect(coerceIdValue("42", "PgSerial")).toBe(42);
    expect(coerceIdValue("abc")).toBe("abc");
    expect(coerceIdValue("")).toBe("");
    expect(coerceIdValue("42", "PgText")).toBe("42");
    expect(coerceIdValue("abc", "PgInteger")).toBe("abc");
  });
});
