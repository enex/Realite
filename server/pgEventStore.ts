import { BunSQLDatabase } from "drizzle-orm/bun-sql";
import { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import {
  BaseEvent,
  EventFromDataMap,
  EventInput,
  inputToFullEvent,
} from "./eventsourcing";

export interface PgProjectionContext<TDatabase extends BunSQLDatabase<any>> {
  db: TDatabase;
}

export interface PgProjectionDefinition<
  TEvent extends BaseEvent<string, any>,
  TDatabase extends BunSQLDatabase<any>,
> {
  version?: number;
  handlers: {
    [TType in TEvent["type"]]: (
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
  }) {
    const ctx = { db: this.db };
    return {
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
      add: (event: EventInput<EventFromDataMap<TEvents>>) => {
        return this.db.transaction(async (tx) => {
          const newEvent = inputToFullEvent(event);
          await this.db.insert(this.schema.events).values(newEvent);

          for (const name in options.projections.inline) {
            const projection = options.projections.inline[name];
            await projection.handlers[event.type](newEvent, ctx);
          }
        });
      },
      migrate: async () => {},
    };
  }
}
