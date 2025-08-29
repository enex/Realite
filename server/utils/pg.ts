import { AnyColumn, GetColumnData, SQL, sql } from "drizzle-orm";

type InferSqlValue<T> = T extends AnyColumn
  ? GetColumnData<T, "raw">
  : T extends SQL<infer U>
    ? U
    : never;

/**
 * Coalesce a value to a default value if the value is null
 * Ex default array: themes: coalesce(pubThemeListQuery.themes, sql`'[]'`)
 * Ex default number: votesCount: coalesce(PubPollAnswersQuery.count, sql`0`)
 */
export function coalesce<T>(value: SQL.Aliased<T> | SQL<T>, defaultValue: SQL) {
  return sql<T>`coalesce(${value}, ${defaultValue})`;
}

// with filter non-null + distinct
export function jsonAgg<TInput extends AnyColumn | SQL<any>>(input: TInput) {
  return coalesce<InferSqlValue<TInput>[]>(
    sql`json_agg(distinct ${input}) filter (where ${input} is not null)`,
    sql`'[]'`
  );
}

// with filter non-null + distinct
export function jsonArrayAgg<TInput extends AnyColumn | SQL<any>>(
  input: TInput
) {
  return coalesce<InferSqlValue<TInput>[]>(sql`json_agg(${input})`, sql`'[]'`);
}

// json_agg with a WHERE filter clause to avoid aggregating placeholder rows
export function jsonArrayAggWhere<
  TInput extends AnyColumn | SQL<any>,
  TBool extends boolean = boolean,
>(input: TInput, where: SQL<TBool>) {
  return coalesce<InferSqlValue<TInput>[]>(
    sql`json_agg(${input}) filter (where ${where})`,
    sql`'[]'`
  );
}

// Sometimes you want an array and not a json
export function arrayAgg<TColumn extends AnyColumn>(column: TColumn) {
  return sql<
    GetColumnData<TColumn, "raw">[]
  >`array_agg(distinct ${sql`${column}`}) filter (where ${column} is not null)`;
}

export function jsonBuildObject<
  T extends Record<
    string,
    AnyColumn | SQL<any> | SQL.Aliased<AnyColumn | SQL<any>>
  >,
>(
  args: T
): SQL<{
  [K in keyof T]: T[K] extends AnyColumn
    ? GetColumnData<T[K], "raw">
    : T[K] extends SQL<infer U>
      ? U
      : never;
}> {
  return sql<{
    [K in keyof T]: T[K] extends AnyColumn
      ? GetColumnData<T[K], "raw">
      : T[K] extends SQL<infer U>
        ? U
        : never;
  }>`json_build_object(${sql.join(
    Object.entries(args).map(
      ([key, value]) => sql`${sql.raw(`'${key}'`)}, ${value}`
    ),
    sql`, `
  )})`;
}

export function getX<T extends AnyColumn>(column: T) {
  return sql<number>`ST_X(${column})`;
}

export function getY<T extends AnyColumn>(column: T) {
  return sql<number>`ST_Y(${column})`;
}

export function tsrange(start: SQL | AnyColumn, end: SQL | AnyColumn) {
  return sql<[Date, Date]>`tsrange(${start}, ${end})`;
}

export function rangesOverlap(
  range1: SQL | AnyColumn,
  range2: SQL | AnyColumn
) {
  return sql<boolean>`${range1} && ${range2}`;
}

export function distance(point1: SQL | AnyColumn, point2: SQL | AnyColumn) {
  return sql<number>`ST_Distance(${point1}, ${point2})`;
}
