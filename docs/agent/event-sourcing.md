# Event Sourcing System

## Core Rule

**CRITICAL**: Never modify domain tables directly from feature code. Always follow the event-sourcing pipeline:

1. **Command** → ORPC route handler (`server/router/`)
2. **Authorization** → Verify user permissions
3. **Validation** → Validate command payload (use `shared/validation/`)
4. **Event** → Emit and persist event to event store
5. **Projection** → Update read models via Drizzle (in `server/es.ts`)

## Event Definitions

Events are defined in `server/events.ts`. Common events include:

- `realite.plan.created` / `realite.plan.scheduled` - New activity plan created
- `realite.plan.changed` - Plan details updated
- `realite.plan.cancelled` - Plan cancelled
- `realite.plan.realized` - Plan completed
- `realite.user.registered` - User registration
- `realite.auth.phone-code-verified` - Phone verification

## Event Store

- Events stored in PostgreSQL `events` table
- Each event has: `id`, `type`, `subject`, `actor`, `time`, `data`
- Event sourcing utilities in `server/lib/eventsourcing.ts`
- Event store implementation in `server/lib/pg-event-store.ts`

## Projections

Projections are defined in `server/es.ts` using the builder pattern. They handle events and update read models:

- **Inline projections**: Direct database writes in the same transaction (e.g., plan materialization)
- **Async projections**: Eventually consistent updates
- **Lazy projections**: Computed on-demand (e.g., user profiles)

Access projections via `context.es.projections.*` in route handlers.

## Implementation Guidance

When adding new domain behavior:

1. Define new events in `server/events.ts`
2. Create ORPC route in `server/router/`
3. Add authorization and validation
4. Emit events from route handlers
5. Update projections in `server/es.ts` to handle new events
6. Projections write to read models using Drizzle

## Important Files

- `server/events.ts` - Event definitions
- `server/es.ts` - Event sourcing setup and projections
- `server/lib/eventsourcing.ts` - Event sourcing utilities
- `server/lib/pg-event-store.ts` - PostgreSQL event store implementation
- `server/orpc.ts` - ORPC configuration with event sourcing context
