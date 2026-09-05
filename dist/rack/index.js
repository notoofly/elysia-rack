import {
  buildRackTree,
  clearRacks,
  flatRackTree,
  getRack,
  getRackTree,
  listRacks,
  registerRack
} from "../index-4wxvmd8a.js";
import"../index-37x76zdn.js";

// src/rack/index.ts
import Elysia2, { status as status2 } from "elysia";

// src/rack/adapter.ts
function resolveAdapter(model) {
  return "drizzle" in model && model.drizzle !== undefined ? "drizzle" : "prisma";
}

// node_modules/drizzle-orm/entity.js
var entityKind = Symbol.for("drizzle:entityKind");
var hasOwnEntityKind = Symbol.for("drizzle:hasOwnEntityKind");
function is(value, type) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (value instanceof type) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(type, entityKind)) {
    throw new Error(`Class "${type.name ?? "<unknown>"}" doesn't look like a Drizzle entity. If this is incorrect and the class is provided by Drizzle, please report this as a bug.`);
  }
  let cls = Object.getPrototypeOf(value).constructor;
  if (cls) {
    while (cls) {
      if (entityKind in cls && cls[entityKind] === type[entityKind]) {
        return true;
      }
      cls = Object.getPrototypeOf(cls);
    }
  }
  return false;
}

// node_modules/drizzle-orm/column.js
class Column {
  constructor(table, config) {
    this.table = table;
    this.config = config;
    this.name = config.name;
    this.keyAsName = config.keyAsName;
    this.notNull = config.notNull;
    this.default = config.default;
    this.defaultFn = config.defaultFn;
    this.onUpdateFn = config.onUpdateFn;
    this.hasDefault = config.hasDefault;
    this.primary = config.primaryKey;
    this.isUnique = config.isUnique;
    this.uniqueName = config.uniqueName;
    this.uniqueType = config.uniqueType;
    this.dataType = config.dataType;
    this.columnType = config.columnType;
    this.generated = config.generated;
    this.generatedIdentity = config.generatedIdentity;
  }
  static [entityKind] = "Column";
  name;
  keyAsName;
  primary;
  notNull;
  default;
  defaultFn;
  onUpdateFn;
  hasDefault;
  isUnique;
  uniqueName;
  uniqueType;
  dataType;
  columnType;
  enumValues = undefined;
  generated = undefined;
  generatedIdentity = undefined;
  config;
  mapFromDriverValue(value) {
    return value;
  }
  mapToDriverValue(value) {
    return value;
  }
  shouldDisableInsert() {
    return this.config.generated !== undefined && this.config.generated.type !== "byDefault";
  }
}

// node_modules/drizzle-orm/table.utils.js
var TableName = Symbol.for("drizzle:Name");

// node_modules/drizzle-orm/tracing-utils.js
function iife(fn, ...args) {
  return fn(...args);
}

// node_modules/drizzle-orm/pg-core/unique-constraint.js
function uniqueKeyName(table, columns) {
  return `${table[TableName]}_${columns.join("_")}_unique`;
}

// node_modules/drizzle-orm/pg-core/columns/common.js
class PgColumn extends Column {
  constructor(table, config) {
    if (!config.uniqueName) {
      config.uniqueName = uniqueKeyName(table, [config.name]);
    }
    super(table, config);
    this.table = table;
  }
  static [entityKind] = "PgColumn";
}

class ExtraConfigColumn extends PgColumn {
  static [entityKind] = "ExtraConfigColumn";
  getSQLType() {
    return this.getSQLType();
  }
  indexConfig = {
    order: this.config.order ?? "asc",
    nulls: this.config.nulls ?? "last",
    opClass: this.config.opClass
  };
  defaultConfig = {
    order: "asc",
    nulls: "last",
    opClass: undefined
  };
  asc() {
    this.indexConfig.order = "asc";
    return this;
  }
  desc() {
    this.indexConfig.order = "desc";
    return this;
  }
  nullsFirst() {
    this.indexConfig.nulls = "first";
    return this;
  }
  nullsLast() {
    this.indexConfig.nulls = "last";
    return this;
  }
  op(opClass) {
    this.indexConfig.opClass = opClass;
    return this;
  }
}

// node_modules/drizzle-orm/pg-core/columns/enum.js
class PgEnumObjectColumn extends PgColumn {
  static [entityKind] = "PgEnumObjectColumn";
  enum;
  enumValues = this.config.enum.enumValues;
  constructor(table, config) {
    super(table, config);
    this.enum = config.enum;
  }
  getSQLType() {
    return this.enum.enumName;
  }
}
var isPgEnumSym = Symbol.for("drizzle:isPgEnum");
function isPgEnum(obj) {
  return !!obj && typeof obj === "function" && isPgEnumSym in obj && obj[isPgEnumSym] === true;
}
class PgEnumColumn extends PgColumn {
  static [entityKind] = "PgEnumColumn";
  enum = this.config.enum;
  enumValues = this.config.enum.enumValues;
  constructor(table, config) {
    super(table, config);
    this.enum = config.enum;
  }
  getSQLType() {
    return this.enum.enumName;
  }
}

// node_modules/drizzle-orm/subquery.js
class Subquery {
  static [entityKind] = "Subquery";
  constructor(sql, fields, alias, isWith = false, usedTables = []) {
    this._ = {
      brand: "Subquery",
      sql,
      selectedFields: fields,
      alias,
      isWith,
      usedTables
    };
  }
}

// node_modules/drizzle-orm/version.js
var version = "0.45.2";

// node_modules/drizzle-orm/tracing.js
var otel;
var rawTracer;
var tracer = {
  startActiveSpan(name, fn) {
    if (!otel) {
      return fn();
    }
    if (!rawTracer) {
      rawTracer = otel.trace.getTracer("drizzle-orm", version);
    }
    return iife((otel2, rawTracer2) => rawTracer2.startActiveSpan(name, (span) => {
      try {
        return fn(span);
      } catch (e) {
        span.setStatus({
          code: otel2.SpanStatusCode.ERROR,
          message: e instanceof Error ? e.message : "Unknown error"
        });
        throw e;
      } finally {
        span.end();
      }
    }), otel, rawTracer);
  }
};

// node_modules/drizzle-orm/view-common.js
var ViewBaseConfig = Symbol.for("drizzle:ViewBaseConfig");

// node_modules/drizzle-orm/table.js
var Schema = Symbol.for("drizzle:Schema");
var Columns = Symbol.for("drizzle:Columns");
var ExtraConfigColumns = Symbol.for("drizzle:ExtraConfigColumns");
var OriginalName = Symbol.for("drizzle:OriginalName");
var BaseName = Symbol.for("drizzle:BaseName");
var IsAlias = Symbol.for("drizzle:IsAlias");
var ExtraConfigBuilder = Symbol.for("drizzle:ExtraConfigBuilder");
var IsDrizzleTable = Symbol.for("drizzle:IsDrizzleTable");

class Table {
  static [entityKind] = "Table";
  static Symbol = {
    Name: TableName,
    Schema,
    OriginalName,
    Columns,
    ExtraConfigColumns,
    BaseName,
    IsAlias,
    ExtraConfigBuilder
  };
  [TableName];
  [OriginalName];
  [Schema];
  [Columns];
  [ExtraConfigColumns];
  [BaseName];
  [IsAlias] = false;
  [IsDrizzleTable] = true;
  [ExtraConfigBuilder] = undefined;
  constructor(name, schema, baseName) {
    this[TableName] = this[OriginalName] = name;
    this[Schema] = schema;
    this[BaseName] = baseName;
  }
}

// node_modules/drizzle-orm/sql/sql.js
function isSQLWrapper(value) {
  return value !== null && value !== undefined && typeof value.getSQL === "function";
}
function mergeQueries(queries) {
  const result = { sql: "", params: [] };
  for (const query of queries) {
    result.sql += query.sql;
    result.params.push(...query.params);
    if (query.typings?.length) {
      if (!result.typings) {
        result.typings = [];
      }
      result.typings.push(...query.typings);
    }
  }
  return result;
}

class StringChunk {
  static [entityKind] = "StringChunk";
  value;
  constructor(value) {
    this.value = Array.isArray(value) ? value : [value];
  }
  getSQL() {
    return new SQL([this]);
  }
}

class SQL {
  constructor(queryChunks) {
    this.queryChunks = queryChunks;
    for (const chunk of queryChunks) {
      if (is(chunk, Table)) {
        const schemaName = chunk[Table.Symbol.Schema];
        this.usedTables.push(schemaName === undefined ? chunk[Table.Symbol.Name] : schemaName + "." + chunk[Table.Symbol.Name]);
      }
    }
  }
  static [entityKind] = "SQL";
  decoder = noopDecoder;
  shouldInlineParams = false;
  usedTables = [];
  append(query) {
    this.queryChunks.push(...query.queryChunks);
    return this;
  }
  toQuery(config) {
    return tracer.startActiveSpan("drizzle.buildSQL", (span) => {
      const query = this.buildQueryFromSourceParams(this.queryChunks, config);
      span?.setAttributes({
        "drizzle.query.text": query.sql,
        "drizzle.query.params": JSON.stringify(query.params)
      });
      return query;
    });
  }
  buildQueryFromSourceParams(chunks, _config) {
    const config = Object.assign({}, _config, {
      inlineParams: _config.inlineParams || this.shouldInlineParams,
      paramStartIndex: _config.paramStartIndex || { value: 0 }
    });
    const {
      casing,
      escapeName,
      escapeParam,
      prepareTyping,
      inlineParams,
      paramStartIndex
    } = config;
    return mergeQueries(chunks.map((chunk) => {
      if (is(chunk, StringChunk)) {
        return { sql: chunk.value.join(""), params: [] };
      }
      if (is(chunk, Name)) {
        return { sql: escapeName(chunk.value), params: [] };
      }
      if (chunk === undefined) {
        return { sql: "", params: [] };
      }
      if (Array.isArray(chunk)) {
        const result = [new StringChunk("(")];
        for (const [i, p] of chunk.entries()) {
          result.push(p);
          if (i < chunk.length - 1) {
            result.push(new StringChunk(", "));
          }
        }
        result.push(new StringChunk(")"));
        return this.buildQueryFromSourceParams(result, config);
      }
      if (is(chunk, SQL)) {
        return this.buildQueryFromSourceParams(chunk.queryChunks, {
          ...config,
          inlineParams: inlineParams || chunk.shouldInlineParams
        });
      }
      if (is(chunk, Table)) {
        const schemaName = chunk[Table.Symbol.Schema];
        const tableName = chunk[Table.Symbol.Name];
        return {
          sql: schemaName === undefined || chunk[IsAlias] ? escapeName(tableName) : escapeName(schemaName) + "." + escapeName(tableName),
          params: []
        };
      }
      if (is(chunk, Column)) {
        const columnName = casing.getColumnCasing(chunk);
        if (_config.invokeSource === "indexes") {
          return { sql: escapeName(columnName), params: [] };
        }
        const schemaName = chunk.table[Table.Symbol.Schema];
        return {
          sql: chunk.table[IsAlias] || schemaName === undefined ? escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName) : escapeName(schemaName) + "." + escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName),
          params: []
        };
      }
      if (is(chunk, View)) {
        const schemaName = chunk[ViewBaseConfig].schema;
        const viewName = chunk[ViewBaseConfig].name;
        return {
          sql: schemaName === undefined || chunk[ViewBaseConfig].isAlias ? escapeName(viewName) : escapeName(schemaName) + "." + escapeName(viewName),
          params: []
        };
      }
      if (is(chunk, Param)) {
        if (is(chunk.value, Placeholder)) {
          return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
        }
        const mappedValue = chunk.value === null ? null : chunk.encoder.mapToDriverValue(chunk.value);
        if (is(mappedValue, SQL)) {
          return this.buildQueryFromSourceParams([mappedValue], config);
        }
        if (inlineParams) {
          return { sql: this.mapInlineParam(mappedValue, config), params: [] };
        }
        let typings = ["none"];
        if (prepareTyping) {
          typings = [prepareTyping(chunk.encoder)];
        }
        return { sql: escapeParam(paramStartIndex.value++, mappedValue), params: [mappedValue], typings };
      }
      if (is(chunk, Placeholder)) {
        return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
      }
      if (is(chunk, SQL.Aliased) && chunk.fieldAlias !== undefined) {
        return { sql: escapeName(chunk.fieldAlias), params: [] };
      }
      if (is(chunk, Subquery)) {
        if (chunk._.isWith) {
          return { sql: escapeName(chunk._.alias), params: [] };
        }
        return this.buildQueryFromSourceParams([
          new StringChunk("("),
          chunk._.sql,
          new StringChunk(") "),
          new Name(chunk._.alias)
        ], config);
      }
      if (isPgEnum(chunk)) {
        if (chunk.schema) {
          return { sql: escapeName(chunk.schema) + "." + escapeName(chunk.enumName), params: [] };
        }
        return { sql: escapeName(chunk.enumName), params: [] };
      }
      if (isSQLWrapper(chunk)) {
        if (chunk.shouldOmitSQLParens?.()) {
          return this.buildQueryFromSourceParams([chunk.getSQL()], config);
        }
        return this.buildQueryFromSourceParams([
          new StringChunk("("),
          chunk.getSQL(),
          new StringChunk(")")
        ], config);
      }
      if (inlineParams) {
        return { sql: this.mapInlineParam(chunk, config), params: [] };
      }
      return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
    }));
  }
  mapInlineParam(chunk, { escapeString }) {
    if (chunk === null) {
      return "null";
    }
    if (typeof chunk === "number" || typeof chunk === "boolean") {
      return chunk.toString();
    }
    if (typeof chunk === "string") {
      return escapeString(chunk);
    }
    if (typeof chunk === "object") {
      const mappedValueAsString = chunk.toString();
      if (mappedValueAsString === "[object Object]") {
        return escapeString(JSON.stringify(chunk));
      }
      return escapeString(mappedValueAsString);
    }
    throw new Error("Unexpected param value: " + chunk);
  }
  getSQL() {
    return this;
  }
  as(alias) {
    if (alias === undefined) {
      return this;
    }
    return new SQL.Aliased(this, alias);
  }
  mapWith(decoder) {
    this.decoder = typeof decoder === "function" ? { mapFromDriverValue: decoder } : decoder;
    return this;
  }
  inlineParams() {
    this.shouldInlineParams = true;
    return this;
  }
  if(condition) {
    return condition ? this : undefined;
  }
}

class Name {
  constructor(value) {
    this.value = value;
  }
  static [entityKind] = "Name";
  brand;
  getSQL() {
    return new SQL([this]);
  }
}
function isDriverValueEncoder(value) {
  return typeof value === "object" && value !== null && "mapToDriverValue" in value && typeof value.mapToDriverValue === "function";
}
var noopDecoder = {
  mapFromDriverValue: (value) => value
};
var noopEncoder = {
  mapToDriverValue: (value) => value
};
var noopMapper = {
  ...noopDecoder,
  ...noopEncoder
};

class Param {
  constructor(value, encoder = noopEncoder) {
    this.value = value;
    this.encoder = encoder;
  }
  static [entityKind] = "Param";
  brand;
  getSQL() {
    return new SQL([this]);
  }
}
function sql(strings, ...params) {
  const queryChunks = [];
  if (params.length > 0 || strings.length > 0 && strings[0] !== "") {
    queryChunks.push(new StringChunk(strings[0]));
  }
  for (const [paramIndex, param2] of params.entries()) {
    queryChunks.push(param2, new StringChunk(strings[paramIndex + 1]));
  }
  return new SQL(queryChunks);
}
((sql2) => {
  function empty() {
    return new SQL([]);
  }
  sql2.empty = empty;
  function fromList(list) {
    return new SQL(list);
  }
  sql2.fromList = fromList;
  function raw(str) {
    return new SQL([new StringChunk(str)]);
  }
  sql2.raw = raw;
  function join(chunks, separator) {
    const result = [];
    for (const [i, chunk] of chunks.entries()) {
      if (i > 0 && separator !== undefined) {
        result.push(separator);
      }
      result.push(chunk);
    }
    return new SQL(result);
  }
  sql2.join = join;
  function identifier(value) {
    return new Name(value);
  }
  sql2.identifier = identifier;
  function placeholder2(name2) {
    return new Placeholder(name2);
  }
  sql2.placeholder = placeholder2;
  function param2(value, encoder) {
    return new Param(value, encoder);
  }
  sql2.param = param2;
})(sql || (sql = {}));
((SQL2) => {

  class Aliased {
    constructor(sql2, fieldAlias) {
      this.sql = sql2;
      this.fieldAlias = fieldAlias;
    }
    static [entityKind] = "SQL.Aliased";
    isSelectionField = false;
    getSQL() {
      return this.sql;
    }
    clone() {
      return new Aliased(this.sql, this.fieldAlias);
    }
  }
  SQL2.Aliased = Aliased;
})(SQL || (SQL = {}));

class Placeholder {
  constructor(name2) {
    this.name = name2;
  }
  static [entityKind] = "Placeholder";
  getSQL() {
    return new SQL([this]);
  }
}
var IsDrizzleView = Symbol.for("drizzle:IsDrizzleView");

class View {
  static [entityKind] = "View";
  [ViewBaseConfig];
  [IsDrizzleView] = true;
  constructor({ name: name2, schema, selectedFields, query }) {
    this[ViewBaseConfig] = {
      name: name2,
      originalName: name2,
      schema,
      selectedFields,
      query,
      isExisting: !query,
      isAlias: false
    };
  }
  getSQL() {
    return new SQL([this]);
  }
}
Column.prototype.getSQL = function() {
  return new SQL([this]);
};
Table.prototype.getSQL = function() {
  return new SQL([this]);
};
Subquery.prototype.getSQL = function() {
  return new SQL([this]);
};

// node_modules/drizzle-orm/sql/expressions/conditions.js
function bindIfParam(value, column) {
  if (isDriverValueEncoder(column) && !isSQLWrapper(value) && !is(value, Param) && !is(value, Placeholder) && !is(value, Column) && !is(value, Table) && !is(value, View)) {
    return new Param(value, column);
  }
  return value;
}
var eq = (left, right) => {
  return sql`${left} = ${bindIfParam(right, left)}`;
};
function and(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter((c) => c !== undefined);
  if (conditions.length === 0) {
    return;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" and ")),
    new StringChunk(")")
  ]);
}
function or(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter((c) => c !== undefined);
  if (conditions.length === 0) {
    return;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" or ")),
    new StringChunk(")")
  ]);
}
function inArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`false`;
    }
    return sql`${column} in ${values.map((v) => bindIfParam(v, column))}`;
  }
  return sql`${column} in ${bindIfParam(values, column)}`;
}
function isNull(value) {
  return sql`${value} is null`;
}
function like(column, value) {
  return sql`${column} like ${value}`;
}
function ilike(column, value) {
  return sql`${column} ilike ${value}`;
}

// node_modules/drizzle-orm/sql/expressions/select.js
function asc(column) {
  return sql`${column} asc`;
}
function desc(column) {
  return sql`${column} desc`;
}

// node_modules/drizzle-orm/sql/functions/aggregate.js
function count(expression) {
  return sql`count(${expression || sql.raw("*")})`.mapWith(Number);
}

// src/rack/adapters/drizzle.ts
function tableOf(model) {
  return model.drizzle.table;
}
function dbOf(model) {
  return model.drizzle.db;
}
function escapeLike(value) {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}
function fieldKind(columnType, dataType, enumValues) {
  if (enumValues && enumValues.length > 0)
    return "enum";
  if (columnType && /serial|smallint|integer|bigint|int8/i.test(columnType))
    return "integer";
  if (columnType && /numeric|decimal|real|double|float/i.test(columnType))
    return "number";
  if (dataType === "boolean")
    return "boolean";
  if (dataType === "date")
    return "date";
  if (dataType === "json")
    return "json";
  if (dataType === "bigint" || dataType === "number")
    return "integer";
  return "text";
}
function isAutoIncrement(col, columnType) {
  if (columnType && /serial/i.test(columnType))
    return true;
  if (col.generated !== undefined && col.generated !== null)
    return true;
  if (col.primary && columnType && /sqliteinteger/i.test(columnType))
    return true;
  return false;
}
function resolvableId(table, primaryKey, id) {
  const col = table?.[primaryKey];
  const columnType = col?.columnType ?? col?.dataType;
  const value = coerceIdValue(id, columnType);
  if (col && isNumericColumn(columnType) && typeof value !== "number")
    return null;
  return value;
}
function aliveCondition(table, opts, withSoftDelete) {
  if (!withSoftDelete)
    return;
  const col = table[opts.deletedAtField ?? "deletedAt"];
  return col ? isNull(col) : undefined;
}
function whereFor(table, query, opts, withSoftDelete) {
  const conds = [];
  const alive = aliveCondition(table, opts, withSoftDelete);
  if (alive)
    conds.push(alive);
  for (const [key, value] of Object.entries(query.filters)) {
    const col = table[key];
    if (!col)
      continue;
    conds.push(Array.isArray(value) ? inArray(col, value) : eq(col, value));
  }
  if (query.search && query.search.fields.length > 0) {
    const pattern = `%${escapeLike(query.search.value)}%`;
    const ors = query.search.fields.map((f) => {
      const col = table[f];
      if (!col)
        return;
      try {
        return typeof ilike === "function" ? ilike(col, pattern) : like(col, pattern);
      } catch {
        return like(col, pattern);
      }
    }).filter((c) => c !== undefined);
    if (ors.length > 0)
      conds.push(or(...ors));
  }
  return conds.length > 0 ? and(...conds) : undefined;
}
function orderFor(table, query) {
  if (!query.sort)
    return;
  const col = table[query.sort.field];
  if (!col)
    return;
  return query.sort.direction === "desc" ? desc(col) : asc(col);
}
async function firstRow(promise) {
  const rows = await promise;
  return Array.isArray(rows) ? rows[0] ?? null : null;
}
async function applyUpdate(db, table, cond, body) {
  return firstRow(db.update(table).set(body).where(cond).returning());
}
async function findByKey(db, table, opts, key) {
  const cond = eq(table[opts.primaryKey], key);
  const alive = aliveCondition(table, opts, opts.softDelete ?? false);
  return firstRow(db.select().from(table).where(alive ? and(cond, alive) : cond).limit(1));
}
function isEmptyBody(body) {
  return typeof body === "object" && body !== null && Object.keys(body).length === 0;
}
var drizzleAdapter = {
  name: "drizzle",
  describe(model) {
    const table = tableOf(model);
    const out = [];
    for (const [name, col] of Object.entries(table)) {
      if (!(col instanceof Column))
        continue;
      const column = col;
      const columnType = typeof column["columnType"] === "string" ? column["columnType"] : undefined;
      const dataType = typeof column["dataType"] === "string" ? column["dataType"] : undefined;
      const enumValues = Array.isArray(column["enumValues"]) ? [...column["enumValues"]] : undefined;
      out.push({
        name,
        kind: fieldKind(columnType, dataType, enumValues),
        primary: column["primary"] === true,
        autoIncrement: isAutoIncrement(column, columnType),
        nullable: column["notNull"] !== true,
        ...enumValues ? { enumValues } : {}
      });
    }
    return out;
  },
  async list(model, query, opts) {
    const db = dbOf(model);
    const table = tableOf(model);
    const where = whereFor(table, query, opts, opts.softDelete ?? false);
    const order = orderFor(table, query);
    let select = db.select().from(table);
    if (where)
      select = select.where(where);
    if (order)
      select = select.orderBy(order);
    const data = await select.limit(query.limit).offset((query.page - 1) * query.limit);
    let counted = db.select({ n: count() }).from(table);
    if (where)
      counted = counted.where(where);
    const totalRows = await counted;
    return { data, total: totalRows[0]?.n ?? 0 };
  },
  async detail(model, id, opts) {
    const db = dbOf(model);
    const table = tableOf(model);
    const key = resolvableId(table, opts.primaryKey, id);
    if (key === null)
      return null;
    return findByKey(db, table, opts, key);
  },
  async create(model, body, opts) {
    const db = dbOf(model);
    const table = tableOf(model);
    if (opts.returning === false) {
      await db.insert(table).values(body);
      return;
    }
    return firstRow(db.insert(table).values(body).returning());
  },
  async replace(model, id, body, opts) {
    const db = dbOf(model);
    const table = tableOf(model);
    const key = resolvableId(table, opts.primaryKey, id);
    if (key === null)
      return null;
    if (isEmptyBody(body))
      return findByKey(db, table, opts, key);
    const row = await applyUpdate(db, table, eq(table[opts.primaryKey], key), body);
    if (row === null)
      return null;
    return opts.returning === false ? undefined : row;
  },
  async update(model, id, body, opts) {
    const db = dbOf(model);
    const table = tableOf(model);
    const key = resolvableId(table, opts.primaryKey, id);
    if (key === null)
      return null;
    if (isEmptyBody(body))
      return findByKey(db, table, opts, key);
    const row = await applyUpdate(db, table, eq(table[opts.primaryKey], key), body);
    if (row === null)
      return null;
    return opts.returning === false ? undefined : row;
  },
  async remove(model, id, opts) {
    const db = dbOf(model);
    const table = tableOf(model);
    const key = resolvableId(table, opts.primaryKey, id);
    if (key === null)
      return null;
    const cond = eq(table[opts.primaryKey], key);
    const row = await firstRow(opts.softDelete ? db.update(table).set({ [opts.deletedAtField ?? "deletedAt"]: new Date }).where(cond).returning() : db.delete(table).where(cond).returning());
    if (row === null)
      return null;
    return opts.returning === false ? undefined : row;
  }
};

// src/rack/adapters/prisma.ts
function delegateOf(model) {
  return model.prisma.model;
}
function deletedAtFilter(opts) {
  return opts.softDelete ? { [opts.deletedAtField ?? "deletedAt"]: null } : {};
}
function whereFor2(query, opts) {
  const where = {
    ...deletedAtFilter(opts)
  };
  for (const [key, value] of Object.entries(query.filters)) {
    where[key] = Array.isArray(value) ? { in: value } : value;
  }
  if (query.search && query.search.fields.length > 0) {
    where["OR"] = query.search.fields.map((field) => ({
      [field]: { contains: query.search.value, mode: "insensitive" }
    }));
  }
  return where;
}
function isNotFound(error) {
  return typeof error === "object" && error !== null && error.code === "P2025";
}
async function applyUpdate2(delegate, primaryKey, id, body, returning) {
  try {
    const row = await delegate.update({
      where: { [primaryKey]: coerceIdValue(id) },
      data: body
    });
    return returning === false ? undefined : row;
  } catch (error) {
    if (isNotFound(error))
      return null;
    throw error;
  }
}
var prismaAdapter = {
  name: "prisma",
  describe() {
    return [];
  },
  async list(model, query, opts) {
    const delegate = delegateOf(model);
    const where = whereFor2(query, opts);
    const [data, total] = await Promise.all([
      delegate.findMany({
        where,
        ...query.sort ? { orderBy: { [query.sort.field]: query.sort.direction } } : {},
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      delegate.count({ where })
    ]);
    return { data, total };
  },
  async detail(model, id, opts) {
    const delegate = delegateOf(model);
    return delegate.findFirst({
      where: {
        [opts.primaryKey]: coerceIdValue(id),
        ...deletedAtFilter(opts)
      }
    });
  },
  async create(model, body, opts) {
    const delegate = delegateOf(model);
    const row = await delegate.create({ data: body });
    return opts.returning === false ? undefined : row;
  },
  async replace(model, id, body, opts) {
    return applyUpdate2(delegateOf(model), opts.primaryKey, id, body, opts.returning);
  },
  async update(model, id, body, opts) {
    return applyUpdate2(delegateOf(model), opts.primaryKey, id, body, opts.returning);
  },
  async remove(model, id, opts) {
    const delegate = delegateOf(model);
    const where = { [opts.primaryKey]: coerceIdValue(id) };
    try {
      const row = opts.softDelete ? await delegate.update({
        where,
        data: { [opts.deletedAtField ?? "deletedAt"]: new Date }
      }) : await delegate.delete({ where });
      return opts.returning === false ? undefined : row;
    } catch (error) {
      if (isNotFound(error))
        return null;
      throw error;
    }
  }
};

// src/rack/adapters/index.ts
function getAdapter(model) {
  return "drizzle" in model && model.drizzle !== undefined ? drizzleAdapter : prismaAdapter;
}
function isNumericColumn(columnType) {
  return columnType === undefined || /serial|smallint|integer|bigint|int8|^(number|bigint)$/i.test(columnType);
}
function coerceIdValue(id, columnType) {
  if (!isNumericColumn(columnType))
    return id;
  if (id.trim() === "")
    return id;
  const n = Number(id);
  return Number.isNaN(n) ? id : n;
}

// src/rack/authorization.ts
import { status } from "elysia";
async function authorize(operation, rule, ctx) {
  const forbidden = (extra) => status(403, {
    error: "Forbidden",
    operation,
    ...extra ?? {}
  });
  if (rule === undefined || rule === true)
    return null;
  if (rule === false)
    return forbidden();
  if (typeof rule === "string") {
    const fromContext = Array.isArray(ctx.permissions) ? ctx.permissions : Array.isArray(ctx.store?.["permissions"]) ? ctx.store?.["permissions"] : null;
    if (fromContext !== null)
      return fromContext.includes(rule) ? null : forbidden({ requiredPermission: rule });
    const header = ctx.request.headers.get("x-permissions");
    if (typeof header === "string" && header.length > 0) {
      const granted = header.split(",").map((s) => s.trim());
      return granted.includes(rule) ? null : forbidden({ requiredPermission: rule });
    }
    return null;
  }
  const allowed = await rule({
    operation,
    request: ctx.request,
    id: ctx.id,
    resource: ctx.resource
  });
  return allowed ? null : forbidden();
}

// src/rack/idempotency.ts
function createMemoryIdempotencyStore(maxEntries = 1000) {
  const entries = new Map;
  return {
    get(key) {
      const entry = entries.get(key);
      if (entry === undefined)
        return;
      if (Date.now() >= entry.expiresAt) {
        entries.delete(key);
        return;
      }
      return entry.record;
    },
    set(key, record, ttlSeconds = 86400) {
      if (entries.size >= maxEntries && !entries.has(key)) {
        const oldest = entries.keys().next();
        if (!oldest.done)
          entries.delete(oldest.value);
      }
      entries.set(key, {
        record,
        expiresAt: Date.now() + ttlSeconds * 1000
      });
    }
  };
}

// src/rack/openapi.ts
function detailFor(options, operation) {
  const baseTags = options.openapi?.tags ?? (options.metadata?.label !== undefined ? [options.metadata.label] : options.metadata?.id !== undefined ? [options.metadata.id] : undefined);
  const baseDescription = options.openapi?.description;
  const over = options.openapi?.operations?.[operation];
  const detail = {};
  const tags = over?.tags ?? baseTags;
  if (tags !== undefined)
    detail["tags"] = [...tags];
  const description = over?.description ?? baseDescription;
  if (description !== undefined)
    detail["description"] = description;
  if (over?.summary !== undefined)
    detail["summary"] = over.summary;
  if (over?.operationId !== undefined)
    detail["operationId"] = over.operationId;
  if (over?.deprecated !== undefined)
    detail["deprecated"] = over.deprecated;
  return detail;
}

// src/rack/page.ts
var PANEL_PAGE_KEY = "@elysia-panel/react";
function panelPage(path, props) {
  return {
    [Symbol.for(PANEL_PAGE_KEY)]: true,
    path,
    props
  };
}

// src/rack/query.ts
function parseListQuery(raw, queryOptions) {
  const pagination = queryOptions?.pagination ?? {};
  const max = pagination.max ?? 100;
  const fallbackLimit = pagination.default ?? 20;
  const limit = Math.min(Math.max(Number(raw["limit"] ?? raw["perPage"] ?? fallbackLimit) || 1, 1), Math.max(max, 1));
  const page = Math.max(Number(raw["page"] ?? 1) || 1, 1);
  const search = typeof raw["search"] === "string" && raw["search"].length > 0 ? {
    value: raw["search"],
    fields: queryOptions?.searchable ?? []
  } : undefined;
  const requestedSort = typeof raw["sort"] === "string" && raw["sort"].length > 0 ? raw["sort"] : undefined;
  const requestedDirection = raw["order"] === "asc" || raw["order"] === "desc" ? raw["order"] : raw["direction"] === "asc" || raw["direction"] === "desc" ? raw["direction"] : undefined;
  const sortField = requestedSort !== undefined && (queryOptions?.sortable === undefined || queryOptions.sortable.includes(requestedSort)) ? requestedSort : queryOptions?.defaultSort?.field;
  const sort = sortField !== undefined ? {
    field: sortField,
    direction: requestedDirection ?? queryOptions?.defaultSort?.direction ?? "asc"
  } : undefined;
  const reserved = new Set([
    "search",
    "sort",
    "order",
    "direction",
    "page",
    "limit",
    "perPage"
  ]);
  const filters = {};
  for (const [key, value] of Object.entries(raw)) {
    if (reserved.has(key))
      continue;
    if (queryOptions?.filterable !== undefined && !queryOptions.filterable.includes(key))
      continue;
    filters[key] = value;
  }
  return { search, filters, sort, page, limit };
}
// src/rack/dashboard.ts
import Elysia from "elysia";
function dashboard(options) {
  const path = options?.path ?? "/";
  const pagePath = options?.pagePath ?? "/dashboard";
  const title = options?.title;
  return new Elysia({ name: "rack:dashboard" }).get(path, ({ query }) => ({
    [Symbol.for(PANEL_PAGE_KEY)]: true,
    path: pagePath,
    props: {
      ...title !== undefined ? { name: title } : {},
      ...options?.donate !== undefined ? { donate: options.donate } : {},
      resource: typeof query.resource === "string" ? query.resource : undefined
    }
  }));
}

// src/rack/index.ts
var DEFAULT_OPERATIONS = {
  list: true,
  detail: true,
  create: true,
  replace: true,
  update: true,
  delete: true
};
function rack(path, options) {
  const operations = { ...DEFAULT_OPERATIONS, ...options.operations };
  const primaryKey = options.settings?.primaryKey ?? "id";
  const itemPath = `/:${primaryKey}`;
  const resource = options.metadata?.id ?? path;
  const adapter = resolveAdapter(options.model);
  registerRack({
    path,
    metadata: { ...options.metadata, id: resource },
    operations
  });
  const dataAdapter = getAdapter(options.model);
  const adapterOpts = {
    primaryKey,
    deletedAtField: options.settings?.deletedAtField,
    returning: options.settings?.returning,
    softDelete: options.settings?.softDelete
  };
  const app = new Elysia2({ name: `rack:${path}`, prefix: path });
  const notFound = (operation, id) => status2(404, { error: "Not Found", operation, id });
  const envelope = (operation) => ({
    resource,
    operation,
    adapter,
    ...options.metadata !== undefined ? { metadata: options.metadata } : {}
  });
  const authContext = (context, operation) => ({
    request: context.request,
    id: context.params?.[primaryKey] !== undefined ? String(context.params[primaryKey]) : undefined,
    resource: options.model,
    permissions: context.permissions,
    store: context.store
  });
  const maybeBody = (schema) => schema !== undefined ? { body: schema } : {};
  const maybeParams = () => options.validation?.params !== undefined ? { params: options.validation.params } : {};
  if (operations.list && options.page?.enabled !== false)
    app.get("/", async (context) => {
      const denied = await authorize("list", options.authorization?.list, authContext(context, "list"));
      if (denied)
        return denied;
      return panelPage(options.page?.path ?? "/panel", {
        resource,
        metadata: options.metadata,
        query: options.query,
        operations,
        primaryKey,
        params: { ...context.query ?? {} },
        queryUrl: `${path.replace(/\/$/, "")}/data`,
        fields: dataAdapter.describe(options.model),
        deletedAtField: options.settings?.deletedAtField ?? "deletedAt",
        load: (input) => dataAdapter.list(options.model, parseListQuery(input, options.query), adapterOpts).then(({ data, total }) => ({ data, total }))
      });
    }, { detail: detailFor(options, "list") });
  if (operations.list)
    app.route("QUERY", "/data", async (context) => {
      const denied = await authorize("list", options.authorization?.list, authContext(context, "list"));
      if (denied)
        return denied;
      const body = typeof context.body === "object" && context.body !== null ? context.body : {};
      const parsed = parseListQuery({ ...context.query ?? {}, ...body }, options.query);
      const result = await dataAdapter.list(options.model, parsed, adapterOpts);
      return {
        ...envelope("list"),
        via: "QUERY",
        query: parsed,
        data: result.data,
        total: result.total
      };
    }, {
      ...maybeBody(options.validation?.query),
      detail: detailFor(options, "list")
    });
  if (operations.create) {
    const idem = options.idempotency;
    const idemStore = idem?.enabled !== false ? idem?.store ?? createMemoryIdempotencyStore() : undefined;
    const idemHeader = idem?.header ?? "Idempotency-Key";
    const idemRequired = idem?.required ?? true;
    const idemTtl = idem?.ttl ?? 86400;
    const idemInflight = new Map;
    const buildCreatedBody = (context, row) => ({
      ...envelope("create"),
      ...row !== undefined ? { data: row } : {},
      ...options.settings?.returning !== undefined ? { returning: options.settings.returning } : {}
    });
    const replay = (context, record) => {
      (context.set.headers ??= {})["Idempotent-Replayed"] = "true";
      return status2(record.status, record.body);
    };
    app.post("/", async (context) => {
      const denied = await authorize("create", options.authorization?.create, authContext(context, "create"));
      if (denied)
        return denied;
      if (idemStore !== undefined) {
        const clientKey = context.request.headers.get(idemHeader);
        if (!clientKey) {
          if (idemRequired)
            return status2(400, {
              error: `${idemHeader} header is required`,
              operation: "create"
            });
        } else {
          const scoped = `${resource}::${clientKey}`;
          const stored = await idemStore.get(scoped);
          if (stored !== undefined)
            return replay(context, stored);
          let pending = idemInflight.get(scoped);
          if (pending === undefined) {
            pending = (async () => {
              const row2 = await dataAdapter.create(options.model, context.body, adapterOpts);
              const record = {
                status: 201,
                body: buildCreatedBody(context, row2)
              };
              await idemStore.set(scoped, record, idemTtl);
              return record;
            })();
            idemInflight.set(scoped, pending);
            try {
              return status2(201, (await pending).body);
            } finally {
              idemInflight.delete(scoped);
            }
          }
          return replay(context, await pending);
        }
      }
      const row = await dataAdapter.create(options.model, context.body, adapterOpts);
      return status2(201, buildCreatedBody(context, row));
    }, {
      ...maybeBody(options.validation?.create),
      detail: detailFor(options, "create")
    });
  }
  if (operations.detail)
    app.route("QUERY", `/data${itemPath}`, async (context) => {
      const denied = await authorize("detail", options.authorization?.detail, authContext(context, "detail"));
      if (denied)
        return denied;
      const id = String(context.params[primaryKey]);
      const row = await dataAdapter.detail(options.model, id, adapterOpts);
      if (row == null)
        return notFound("detail", id);
      return {
        ...envelope("detail"),
        id,
        data: row
      };
    }, {
      ...maybeParams(),
      detail: detailFor(options, "detail")
    });
  if (operations.replace)
    app.put(itemPath, async (context) => {
      const denied = await authorize("replace", options.authorization?.replace, authContext(context, "replace"));
      if (denied)
        return denied;
      const id = String(context.params[primaryKey]);
      const row = await dataAdapter.replace(options.model, id, context.body, adapterOpts);
      if (row == null)
        return notFound("replace", id);
      return {
        ...envelope("replace"),
        id,
        ...row !== undefined ? { data: row } : {},
        ...options.settings?.returning !== undefined ? { returning: options.settings.returning } : {}
      };
    }, {
      ...maybeBody(options.validation?.replace),
      ...maybeParams(),
      detail: detailFor(options, "replace")
    });
  if (operations.update)
    app.patch(itemPath, async (context) => {
      const denied = await authorize("update", options.authorization?.update, authContext(context, "update"));
      if (denied)
        return denied;
      const id = String(context.params[primaryKey]);
      const row = await dataAdapter.update(options.model, id, context.body, adapterOpts);
      if (row == null)
        return notFound("update", id);
      return {
        ...envelope("update"),
        id,
        ...row !== undefined ? { data: row } : {},
        ...options.settings?.returning !== undefined ? { returning: options.settings.returning } : {}
      };
    }, {
      ...maybeBody(options.validation?.update),
      ...maybeParams(),
      detail: detailFor(options, "update")
    });
  if (operations.delete)
    app.delete(itemPath, async (context) => {
      const denied = await authorize("delete", options.authorization?.delete, authContext(context, "delete"));
      if (denied)
        return denied;
      const id = String(context.params[primaryKey]);
      const row = await dataAdapter.remove(options.model, id, adapterOpts);
      if (row == null)
        return notFound("delete", id);
      return {
        ...envelope("delete"),
        id,
        ...row !== undefined ? { data: row } : {},
        ...options.settings?.softDelete !== undefined ? { softDelete: options.settings.softDelete } : {}
      };
    }, {
      ...maybeParams(),
      detail: detailFor(options, "delete")
    });
  return app;
}
export {
  resolveAdapter,
  registerRack,
  rack,
  prismaAdapter,
  parseListQuery,
  panelPage,
  listRacks,
  getRackTree,
  getRack,
  getAdapter,
  flatRackTree,
  drizzleAdapter,
  detailFor,
  dashboard,
  createMemoryIdempotencyStore,
  clearRacks,
  buildRackTree,
  authorize,
  PANEL_PAGE_KEY
};
