import { and, asc, eq, gte } from "drizzle-orm";
import { BunSQLDatabase } from "drizzle-orm/bun-sql";
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

export interface PgProjectionContext<TDatabase extends BunSQLDatabase<any>> {
  db: TDatabase;
}

export interface PgProjectionDefinition<
  TEvent extends BaseEvent<string, any>,
  TDatabase extends BunSQLDatabase<any>,
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

export class Builder<
  TEvents extends Record<string, any>,
  TDatabase extends BunSQLDatabase<any>,
> {
  constructor(
    private readonly db: TDatabase,
    private readonly schema: {
      events: AnyPgTable<{
        columns: {
          id: AnyPgColumn<{ isPrimaryKey: true }>;
          type: AnyPgColumn<{ notNull: true }>;
          data: AnyPgColumn<{ notNull: true }>;
          actor: AnyPgColumn<{}>;
          subject: AnyPgColumn<{}>;
          time: AnyPgColumn<{ notNull: true }>;
        };
      }>;
    }
  ) {}

  projection<
    TInput extends {
      [TType in keyof TEvents]?: (
        event: BaseEvent<TType & string, TEvents[TType]>,
        ctx: PgProjectionContext<TDatabase>
      ) => Promise<void>;
    },
  >(handlers: TInput) {
    return {
      handlers,
      queries: {},
      query<
        TQueryName extends string,
        TFn extends (
          ctx: PgProjectionContext<TDatabase>,
          input: any
        ) => Promise<any>,
      >(name: TQueryName, fn: TFn) {
        return {
          ...this,
          queries: { ...this.queries, [name]: fn },
        };
      },
    };
  }

  /** create a event store with the specified database */
  store<
    TInlineProjections extends Record<
      string,
      PgProjectionDefinition<EventFromDataMap<TEvents>, TDatabase>
    >,
    TProjections extends Record<
      string,
      PgProjectionDefinition<EventFromDataMap<TEvents>, TDatabase>
    >,
  >(options: {
    projections: {
      /** Projections that directly run when an event gets published in the same transaction */
      inline: TInlineProjections;
      /** Projections that run async and thus are only eventually consistent */
      async: TProjections;
    };
    /** hook to run after an event is published, can be used to track events in analytics */
    onEvent?: (event: EventFromDataMap<TEvents>) => Promise<void>;
  }) {
    const ctx = { db: this.db };
    const self = {
      projections: Object.fromEntries(
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
      add: async (event: EventInput<EventFromDataMap<TEvents>>) => {
        const newEvent = inputToFullEvent(event);
        const result = this.db.transaction(async (tx) => {
          await this.db.insert(this.schema.events).values(newEvent);

          for (const name in options.projections.inline) {
            const projection = options.projections.inline[name];
            await projection.handlers[event.type]?.(newEvent, ctx);
          }
        });
        if (options.onEvent) {
          await options.onEvent(newEvent).catch((err) => {
            console.error("Error in onEvent:", err);
          });
        }
        return result;
      },
      reduce: async <T>(
        filter: { subject?: string; actor?: string },
        fn: (acc: T, event: EventFromDataMap<TEvents>) => T,
        initial: T,
        {
          batchSize = 100,
          startTime = new Date(0),
        }: { batchSize?: number; startTime?: Date } = {}
      ): Promise<T> => {
        const eventsTable = this.schema.events as any as Record<
          string,
          AnyPgColumn<any>
        >;
        let result = initial;
        let lastTime = startTime;
        while (true) {
          const events = await this.db
            .select()
            .from(this.schema.events)
            .where(
              and(
                filter.subject
                  ? eq(eventsTable.subject, filter.subject)
                  : undefined,
                filter.actor ? eq(eventsTable.actor, filter.actor) : undefined,
                gte(eventsTable.time, lastTime)
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
      },
      migrate: async () => {},
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
