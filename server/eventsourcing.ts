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
  actor: string; // id of the actor that caused the event
  time: Date; // date and time the event was created
  subject: string; // id of the subject that the event is about
  data: TData;
}

export type EventFromDataMap<TDataMap extends Record<string, any>> = {
  [TType in keyof TDataMap]: BaseEvent<TType & string, TDataMap[TType]>;
}[string];

export interface Projection<TEvent extends BaseEvent<string, any>, TContext> {
  name: string;
  version?: number; // when ever it increases the rejection gets rebuild.
  handlers: {
    [TType in TEvent["type"]]: (
      event: TEvent,
      ctx: TContext
    ) => void | Promise<void>;
  };
}
