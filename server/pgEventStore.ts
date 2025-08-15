import { BaseEvent } from "./eventsourcing";

export function createPgEventStore<TInlineProjections, TProjections>(
  url: string,
  options: {
    projections: {
      /** Projections that directly run when an event gets published in the same transaction */
      inline: TInlineProjections;
      /** Projections that run async and thus are only eventually consistent */
      async: TProjections;
    };
  }
) {
  return {
    projections: {
      ...options.projections.inline,
      ...options.projections.async,
    },
  };
}

export interface PgProjectionContext {}

export interface PgProjectionDefinition<TEvent extends BaseEvent<string, any>> {
  version?: number;
  handlers: {
    [TType in TEvent["type"]]: (
      event: TEvent & { type: TType },
      ctx: PgProjectionContext
    ) => void | Promise<void>;
  };
  queries: Record<string, (ctx: PgProjectionContext) => Promise<any>>;
}

export class Builder<TEvent extends Record<string, any>> {
  projection<
    TInput extends {
      [TType in keyof TEvent]?: (
        event: BaseEvent<TType & string, TEvent[TType]>
      ) => Promise<void>;
    },
  >(handlers: TInput) {
    return {
      handlers,
      queries<
        TQueries extends Record<
          string,
          (ctx: PgProjectionContext, input: any) => Promise<any>
        >,
      >(queries: TQueries) {
        return {
          handlers,
          queries,
        };
      },
    };
  }
}
