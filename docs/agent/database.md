# Database

## Schema

Database schema is defined in `db/schema.ts` using Drizzle ORM.

### Key Tables

- `events` - Event store for event sourcing
- `plans` - Activity plans (read model)
- `plan_locations` - Plan location data with PostGIS support
- `users` - User accounts
- `profiles` - User profile information

## Migrations

Migration files are located in `db/migrations/`. The schema is managed with Drizzle Kit.

### Database Commands

```bash
bun run db:generate    # Generate SQL migration from schema changes
bun run db:push        # Apply/push migrations to database
bun run db:studio      # Open Drizzle Studio (database GUI)
bun run db:migrate     # Run migration script
```

## Event Sourcing Constraint

**Important**: Only projections (in `server/es.ts`) should write to read models. Never mutate domain tables directly from commands or route handlers.

## Files

- `db/schema.ts` - Database schema definitions
- `db/migrations/` - SQL migration files
- `drizzle.config.ts` - Drizzle Kit configuration
