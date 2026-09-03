import { describe, expect, it } from "bun:test";
import {
  coerceIdValue,
  getAdapter,
  isNumericColumn,
} from "../../src/rack/adapters/index";

describe("getAdapter", () => {
  it("resolves drizzle and prisma", async () => {
    const { drizzleAdapter } = await import("../../src/rack/adapters/drizzle");
    const { prismaAdapter } = await import("../../src/rack/adapters/prisma");
    expect(
      getAdapter({ drizzle: { db: {}, table: {} } } as any).name,
    ).toBe("drizzle");
    expect(
      getAdapter({ drizzle: { db: {}, table: {} } } as any),
    ).toBe(drizzleAdapter);
    expect(
      getAdapter({ prisma: { client: {}, model: {} } } as any),
    ).toBe(prismaAdapter);
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
