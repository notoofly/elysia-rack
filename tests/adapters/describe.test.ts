import { describe, expect, it } from "bun:test";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { drizzleAdapter } from "../../src/rack/adapters/drizzle";
import { prismaAdapter } from "../../src/rack/adapters/prisma";

const mood = pgEnum("mood", ["happy", "grumpy"]);

const widgets = pgTable("widgets", {
  id: serial("id").primaryKey(),
  slug: text("slug"),
  mood: mood("mood"),
  count: integer("count"),
  price: numeric("price"),
  flag: boolean("flag"),
  at: timestamp("at"),
  meta: jsonb("meta"),
  name: text("name").notNull(),
});

const model = { drizzle: { db: {}, table: widgets } } as any;

describe("drizzleAdapter.describe", () => {
  it("introspects columns for smart forms", () => {
    expect(drizzleAdapter.describe(model)).toEqual([
      { name: "id", kind: "integer", primary: true, autoIncrement: true, nullable: false },
      { name: "slug", kind: "text", primary: false, autoIncrement: false, nullable: true },
      {
        name: "mood",
        kind: "enum",
        primary: false,
        autoIncrement: false,
        nullable: true,
        enumValues: ["happy", "grumpy"],
      },
      { name: "count", kind: "integer", primary: false, autoIncrement: false, nullable: true },
      { name: "price", kind: "number", primary: false, autoIncrement: false, nullable: true },
      { name: "flag", kind: "boolean", primary: false, autoIncrement: false, nullable: true },
      { name: "at", kind: "date", primary: false, autoIncrement: false, nullable: true },
      { name: "meta", kind: "json", primary: false, autoIncrement: false, nullable: true },
      { name: "name", kind: "text", primary: false, autoIncrement: false, nullable: false },
    ]);
  });
});

describe("prismaAdapter.describe", () => {
  it("returns no fields without runtime schema", () => {
    expect(
      prismaAdapter.describe({ prisma: { client: {}, model: {} } } as any),
    ).toEqual([]);
  });
});
