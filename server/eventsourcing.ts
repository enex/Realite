// Logic for event sourcing abstract with only in memory storage

/** Central object that controls dispatching of events and retrieval of projections */
export interface EventStore<TEvent> {
  dispatch(event: TEvent): Promise<void>;
}

export function createInMemoryEventStore<TEvent>(): EventStore<TEvent> {
  const events: TEvent[] = [];

  return {
    dispatch: async (event: TEvent) => {
      events.push(event);
    },
  };
}

export interface BaseEvent<TType extends string, TData> {
  id: string;
  type: TType;
  data: TData;
}

interface Projection<TEvent extends BaseEvent<string, any>, TContext> {
  name: string;
  version?: number; // when ever it increases the rejection gets rebuild.
  handlers: {
    [TType in TEvent["type"]]: (
      event: TEvent,
      ctx: TContext
    ) => void | Promise<void>;
  };
}
