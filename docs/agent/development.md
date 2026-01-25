# Development Workflow

## Running the App

```bash
# Start both server and client
bun run dev

# Or separately
bun run server    # Backend only (Bun server)
bun run start     # Frontend only (Expo)
bun run ios       # iOS simulator
bun run android   # Android emulator
bun run web       # Web version
```

## Adding New Features

Follow the event-sourcing workflow:

1. **Define Events** in `server/events.ts`
2. **Create ORPC Route** in `server/router/`
3. **Add Authorization** and validation (use `shared/validation/`)
4. **Emit Events** from route handlers
5. **Update Projections** in `server/es.ts` to handle events and update read models
6. **Create Frontend Components** in `app/` or `components/`

## Database Changes

1. Update schema in `db/schema.ts`
2. Run `bun run db:generate` to create migration
3. Run `bun run db:push` to apply changes
4. Or use `bun run db:studio` to inspect the database

## TypeScript Conventions

- Use strict TypeScript throughout
- Avoid `any` types
- Keep shared types in `shared/`
- Preserve existing indentation and formatting

## Project Structure

```
├── app/                    # Expo Router screens
├── components/             # Reusable React Native components
├── server/                 # Bun backend
│   ├── router/            # ORPC route handlers
│   ├── lib/               # Event sourcing utilities
│   └── utils/             # Server utilities
├── client/                # ORPC client and auth utilities
├── db/                    # Database schema and migrations
├── shared/                # Shared types and validation
└── hooks/                 # React hooks
```
