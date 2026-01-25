# Realite - Agent Documentation

**Realite** is a social planning app built with React Native (Expo) and a Bun-based backend that helps users discover and participate in activities with others in their area.

## Essentials

- **Package Manager**: Use `bun` (not npm) for all installs and scripts
- **Critical Architecture**: Event sourcing — never modify domain tables directly from feature code. All changes must flow through: Command → Authorization → Validation → Event → Projection
- **Key Commands**:
  - `bun run dev` - Start both server and client
  - `bun run db:push` - Apply database migrations
  - `bun run db:studio` - Open Drizzle Studio

## Documentation

For detailed information, see:

- [Event Sourcing System](docs/agent/event-sourcing.md) - Core architecture pattern and workflow
- [Database](docs/agent/database.md) - Schema, migrations, and Drizzle ORM
- [ORPC API](docs/agent/orpc-api.md) - Route structure and type-safe RPC
- [Frontend](docs/agent/frontend.md) - Expo Router, NativeWind, and components
- [Development Workflow](docs/agent/development.md) - Running the app and adding features
- [Docker](docs/agent/docker.md) - Container setup and deployment
- [Testing](docs/agent/testing.md) - Demo users and test data
