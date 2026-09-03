import { describe, expect, it } from "bun:test";
import { prismaAdapter } from "../../src/rack/adapters/prisma";
import type { Rack } from "../../src/rack/index";

const ROW = { id: 1, name: "Phone", price: 500, status: "active" };

function mockDelegate(overrides: Record<string, any> = {}) {
  const calls: { method: string; args: any }[] = [];
  const base: Record<string, any> = {
    findMany: async (args: any) => {
      calls.push({ method: "findMany", args });
      return [ROW];
    },
    count: async (args: any) => {
      calls.push({ method: "count", args });
      return 1;
    },
    findFirst: async (args: any) => {
      calls.push({ method: "findFirst", args });
      return ROW;
    },
    create: async (args: any) => {
      calls.push({ method: "create", args });
      return { id: 3, ...args.data };
    },
    update: async (args: any) => {
      calls.push({ method: "update", args });
      return { ...ROW, ...args.data };
    },
    delete: async (args: any) => {
      calls.push({ method: "delete", args });
      return ROW;
    },
  };
  const model = {
    prisma: { client: {}, model: { ...base, ...overrides } },
  } as Rack.CrudModel;
  return { calls, model };
}

const opts = { primaryKey: "id" };
const baseQuery = () => ({
  search: undefined,
  filters: {},
  sort: undefined,
  page: 1,
  limit: 20,
});
const called = (calls: { method: string; args: any }[], method: string) =>
  calls.find((c) => c.method === method)?.args;

describe("prismaAdapter.list", () => {
  it("queries with where/orderBy/skip/take and counts", async () => {
    const { calls, model } = mockDelegate();
    const res = await prismaAdapter.list(
      model,
      {
        ...baseQuery(),
        filters: { status: "active" },
        search: { value: "ph", fields: ["name"] },
        sort: { field: "price", direction: "desc" as const },
        page: 2,
        limit: 10,
      },
      opts,
    );
    expect(res).toEqual({ data: [ROW], total: 1 });
    expect(called(calls, "findMany")).toEqual({
      where: {
        status: "active",
        OR: [{ name: { contains: "ph", mode: "insensitive" } }],
      },
      orderBy: { price: "desc" },
      skip: 10,
      take: 10,
    });
    expect(called(calls, "count")).toEqual({
      where: {
        status: "active",
        OR: [{ name: { contains: "ph", mode: "insensitive" } }],
      },
    });
  });

  it("maps array filters to in and adds soft-delete filter", async () => {
    const { calls, model } = mockDelegate();
    await prismaAdapter.list(
      model,
      { ...baseQuery(), filters: { status: ["a", "b"] } },
      { ...opts, softDelete: true },
    );
    expect(called(calls, "findMany").where).toEqual({
      deletedAt: null,
      status: { in: ["a", "b"] },
    });
  });
});

describe("prismaAdapter.detail", () => {
  it("finds by coerced id with soft-delete filter", async () => {
    const { calls, model } = mockDelegate();
    expect(await prismaAdapter.detail(model, "1", { ...opts, softDelete: true })).toEqual(ROW);
    expect(called(calls, "findFirst")).toEqual({
      where: { id: 1, deletedAt: null },
    });
  });

  it("keeps non-numeric ids as strings", async () => {
    const { calls, model } = mockDelegate();
    await prismaAdapter.detail(model, "uuid-1", opts);
    expect(called(calls, "findFirst").where).toEqual({ id: "uuid-1" });
  });
});

describe("prismaAdapter mutations", () => {
  it("creates and honors returning false", async () => {
    const { calls, model } = mockDelegate();
    expect(
      await prismaAdapter.create(model, { name: "N" }, opts),
    ).toEqual({ id: 3, name: "N" });
    expect(called(calls, "create")).toEqual({ data: { name: "N" } });
    expect(
      await prismaAdapter.create(model, { name: "Q" }, { ...opts, returning: false }),
    ).toBeUndefined();
  });

  it("updates, maps P2025 to null, rethrows other errors", async () => {
    const { calls, model } = mockDelegate();
    expect(await prismaAdapter.update(model, "1", { price: 9 }, opts)).toEqual({
      ...ROW,
      price: 9,
    });
    expect(called(calls, "update")).toEqual({
      where: { id: 1 },
      data: { price: 9 },
    });
    expect(
      await prismaAdapter.replace(model, "1", { name: "R" }, { ...opts, returning: false }),
    ).toBeUndefined();

    const missing = mockDelegate({
      update: async () => {
        throw { code: "P2025" };
      },
    });
    expect(await prismaAdapter.update(missing.model, "9", {}, opts)).toBeNull();

    const broken = mockDelegate({
      update: async () => {
        throw new Error("boom");
      },
    });
    await expect(prismaAdapter.update(broken.model, "9", {}, opts)).rejects.toThrow("boom");
  });

  it("deletes hard and soft, maps P2025 to null", async () => {
    const { calls, model } = mockDelegate();
    expect(await prismaAdapter.remove(model, "1", opts)).toEqual(ROW);
    expect(called(calls, "delete")).toEqual({ where: { id: 1 } });

    const soft = mockDelegate();
    const res = (await prismaAdapter.remove(soft.model, "1", {
      ...opts,
      softDelete: true,
    })) as any;
    expect(res.deletedAt).toBeInstanceOf(Date);
    expect(
      called(soft.calls, "update").data.deletedAt,
    ).toBeInstanceOf(Date);

    const missing = mockDelegate({
      delete: async () => {
        throw { code: "P2025" };
      },
    });
    expect(await prismaAdapter.remove(missing.model, "9", opts)).toBeNull();
  });
});
