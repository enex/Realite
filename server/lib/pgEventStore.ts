import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import {
  BaseEvent,
  EventFromDataMap,
  EventInput,
  inputToFullEvent,
} from "./eventsourcing";

type EventInputWithoutActor<TEvent extends BaseEvent<string, any>> = Omit<
  TEvent,
  "id" | "time" | "actor"
> &
  Partial<TEvent>;

export interface PgProjectionContext<TDatabase extends NodePgDatabase<any>> {
  db: TDatabase;
}

export interface PgProjectionDefinition<
  TEvent extends BaseEvent<string, any>,
  TDatabase extends NodePgDatabase<any>,
> {
  version?: number;
  handlers: {
    [TType in TEvent["type"]]?: (
      event: TEvent & { type: TType },
      ctx: PgProjectionContext<TDatabase>
    ) => void | Promise<void>;
  };
  queries: Record<
    string,
    (ctx: PgProjectionContext<TDatabase>, ...args: any[]) => Promise<any>
  >;
}

export type PgLazyProjectionContext<
  TDatabase extends NodePgDatabase<any>,
  TEvent extends BaseEvent<string, any>,
> = PgProjectionContext<TDatabase> & {
  reduce<T>(
    filter: { subject?: string; actor?: string; type?: TEvent["type"][] },
    fn: (acc: T, event: TEvent) => T,
    initial: T,
    options?: { batchSize?: number; startTime?: Date }
  ): Promise<T>;
};

export type LazyProjectionDefinition<
  TEvent extends BaseEvent<string, any>,
  TDatabase extends NodePgDatabase<any>,
> = Record<
  string,
  (
    ctx: PgLazyProjectionContext<TDatabase, TEvent>,
    ...args: any[]
  ) => Promise<any>
>;

export class Builder<
  TEvents extends Record<string, any>,
  TDatabase extends NodePgDatabase<any>,
> {
  constructor(
    private readonly db: TDatabase,
    private readonly schema: {
      events: AnyPgTable & {
        id: AnyPgColumn<{ isPrimaryKey: true }>;
        type: AnyPgColumn<{ notNull: true }>;
        data: AnyPgColumn<{ notNull: true }>;
        actor: AnyPgColumn<{}>;
        subject: AnyPgColumn<{}>;
        time: AnyPgColumn<{ notNull: true }>;
      };
      consumers: AnyPgTable & {
        id: AnyPgColumn<{ isPrimaryKey: true }>;
        name: AnyPgColumn<{ notNull: true }>;
        version: AnyPgColumn<{ notNull: true }>;
      };
    }
  ) {}

  projection<
    TInput extends {
      [TType in keyof TEvents]?: (
        event: BaseEvent<TType & string, TEvents[TType]>,
        ctx: PgProjectionContext<TDatabase>
      ) => Promise<void>;
    },
    TQueries extends Record<
      string,
      (ctx: PgProjectionContext<TDatabase>, ...args: any[]) => Promise<any>
    > = Record<string, never>,
  >(obj: { handlers: TInput; queries: TQueries; version?: number }) {
    return obj;
  }

  /** create a event store with the specified database */
  store<
    TInlineProjections extends Record<
      string,
      PgProjectionDefinition<EventFromDataMap<TEvents>, TDatabase>
    >,
    TAsyncProjections extends Record<
      string,
      PgProjectionDefinition<EventFromDataMap<TEvents>, TDatabase>
    >,
    TLazyProjections extends Record<
      string,
      LazyProjectionDefinition<EventFromDataMap<TEvents>, TDatabase>
    >,
  >(options: {
    projections: {
      /** Projections that directly run when an event gets published in the same transaction */
      inline: TInlineProjections;
      /** Projections that run async and thus are only eventually consistent */
      async?: TAsyncProjections;
      /** Projections that are not actually materialized, but that fetch their data on the fly. */
      lazy?: TLazyProjections;
    };
    /** hook to run after an event is published, can be used to track events in analytics */
    onEvent?: (event: EventFromDataMap<TEvents>) => Promise<void>;
  }) {
    type CTX = PgLazyProjectionContext<TDatabase, EventFromDataMap<TEvents>>;
    const ctx: CTX = {
      db: this.db,
      reduce: reducer(this.db, this.schema),
    };
    const self = {
      projections: {
        ...Object.fromEntries(
          Object.entries({
            ...options.projections.inline,
            ...options.projections.async,
          }).map(([name, projection]) => {
            return [
              name,
              {
                $version: projection.version,
                ...Object.fromEntries(
                  Object.entries(projection.queries).map(([name, handler]) => {
                    return [
                      name,
                      (...args: any[]) => {
                        return handler(ctx, ...args);
                      },
                    ];
                  })
                ),
              },
            ];
          })
        ),
        ...Object.fromEntries(
          Object.entries(options.projections.lazy ?? []).map(
            ([name, queries]) => {
              return [
                name,
                Object.fromEntries(
                  Object.entries(queries).map(([name, handler]) => {
                    return [
                      name,
                      (...args: any[]) => {
                        return handler(ctx, ...args);
                      },
                    ];
                  })
                ),
              ];
            }
          )
        ),
      } as ProjOut<TAsyncProjections & TInlineProjections> & {
        [K in keyof TLazyProjections]: {
          [K2 in keyof TLazyProjections[K]]: (
            ...args: ParametersExceptFirst<TLazyProjections[K][K2]>
          ) => Promise<ReturnType<TLazyProjections[K][K2]>>;
        };
      },
      add: async (event: EventInput<EventFromDataMap<TEvents>>) => {
        const newEvent = inputToFullEvent(event);
        const result = this.db.transaction(async (tx) => {
          await this.db.insert(this.schema.events).values(newEvent);

          for (const name in options.projections.inline) {
            try {
              const projection = options.projections.inline[name];
              await projection.handlers[event.type]?.(newEvent, ctx);
            } catch (err) {
              console.error("Error in inline projection:", err);
              throw new Error(
                `Error in inline projection ${name} while processing event ${event.type}`,
                {
                  cause: err,
                }
              );
            }
          }
        });
        if (options.onEvent) {
          await options.onEvent(newEvent).catch((err) => {
            console.error("Error in onEvent:", err);
          });
        }
        return result;
      },
      reduce: reducer(this.db, this.schema),
      migrate: async () => {
        const report = {
          unchanged: [] as string[],
          updated: [] as string[],
          numEvents: 0,
        };
        const projections = {
          ...options.projections.inline,
          ...options.projections.async,
        };
        return this.db.transaction(async (tx) => {
          const ctx: CTX = {
            db: tx as any,
            reduce: reducer(tx, this.schema),
          };
          for (const name in projections) {
            const projection = projections[name];
            const consumer = await tx
              .select()
              .from(this.schema.consumers)
              .where(eq(this.schema.consumers.name, name));
            const version =
              consumer.length === 0 ? -1 : (consumer[0].version as number);
            const needsUpdate = version < (projection.version ?? 0);
            if (!needsUpdate) {
              report.unchanged.push(name);
              continue;
            }
            report.updated.push(name);
            const types = Object.keys(projection.handlers);
            const events = await tx
              .select()
              .from(this.schema.events)
              .where(inArray(this.schema.events.type, types));
            console.log("applying", events.length, "events");
            for (const event of events) {
              console.log("applying event", event);
              report.numEvents++;
              const handler =
                projection.handlers[
                  event.type as keyof typeof projection.handlers
                ];
              if (handler) await handler(event as any, ctx);
            }
          }
          return report;
        });
      },
      withActor: (actor: string) => {
        return {
          ...self,
          add: async (
            event: EventInputWithoutActor<EventFromDataMap<TEvents>>
          ) => {
            return self.add({ actor, ...event } as EventInput<
              EventFromDataMap<TEvents>
            >);
          },
        };
      },
    };
    return self;
  }
}

type ProjOut<
  TProjections extends Record<
    string,
    PgProjectionDefinition<EventFromDataMap<any>, any>
  >,
> = {
  [T in keyof TProjections]: { $version: TProjections[T]["version"] } & {
    [K in keyof TProjections[T]["queries"]]: (
      ...args: ParametersExceptFirst<TProjections[T]["queries"][K]>
    ) => Promise<ReturnType<TProjections[T]["queries"][K]>>;
  };
};

type ParametersExceptFirst<F> = F extends (arg0: any, ...rest: infer R) => any
  ? R
  : never;

function reducer<TEvents extends Record<string, any>>(
  db: NodePgDatabase<any>,
  schema: { events: AnyPgTable }
) {
  return async <T>(
    filter: { subject?: string; actor?: string; type?: (keyof TEvents)[] },
    fn: (acc: T, event: EventFromDataMap<TEvents>) => T,
    initial: T,
    {
      batchSize = 100,
      startTime = new Date(0),
    }: { batchSize?: number; startTime?: Date } = {}
  ): Promise<T> => {
    const eventsTable = schema.events as any as Record<
      string,
      AnyPgColumn<any>
    >;
    let result = initial;
    let lastTime = startTime;
    while (true) {
      const events = await db
        .select()
        .from(schema.events)
        .where(
          and(
            filter.subject
              ? eq(eventsTable.subject, filter.subject)
              : undefined,
            filter.actor ? eq(eventsTable.actor, filter.actor) : undefined,
            gte(eventsTable.time, lastTime),
            filter.type ? inArray(eventsTable.type, filter.type) : undefined
          )
        )
        .orderBy(asc(eventsTable.time))
        .limit(batchSize);
      for (const event of events) {
        result = fn(result, event as any);
      }
      if (events.length < batchSize) break;
      lastTime = events[events.length - 1].time as any;
    }
    return result;
  };
}
