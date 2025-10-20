# Realite - Agent Documentation

## Project Overview

**Realite** is a social planning app built with React Native (Expo) and a Bun-based backend. The app helps users discover and participate in activities with others in their area, focusing on real-world social connections and event planning.

## Architecture

### Tech Stack

- **Frontend**: Expo + React Native with Expo Router for file-based routing
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Bun/Node.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **RPC**: ORPC for type-safe client-server communication
- **Event Sourcing**: Custom event-sourcing implementation
- **Deployment**: Docker + docker-compose

### Core Architecture Pattern: Event Sourcing

**CRITICAL RULE**: Never modify domain tables directly from feature code. Always follow the event-sourcing pipeline:

1. **Command** → ORPC route handler
2. **Authorization** → Verify user permissions
3. **Validation** → Validate command payload
4. **Event** → Emit and persist event to event store
5. **Projection** → Update read models via Drizzle

## Key Directories

```
├── app/                    # Expo Router screens (file-based routing)
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

## Event Sourcing System

### Events (`server/events.ts`)

The system defines events for all domain operations:

- `realite.plan.created` - New activity plan created
- `realite.plan.changed` - Plan details updated
- `realite.plan.cancelled` - Plan cancelled
- `realite.plan.realized` - Plan completed
- `realite.user.registered` - User registration
- `realite.auth.phone-code-verified` - Phone verification
- And more...

### Projections (`server/es.ts`)

Projections handle events and update read models:

- **Inline projections**: Direct database writes (e.g., plan materialization)
- **Lazy projections**: Computed on-demand (e.g., user profiles)

### Event Store

- Events stored in PostgreSQL `events` table
- Each event has: `id`, `type`, `subject`, `actor`, `time`, `data`
- Event sourcing utilities in `server/lib/eventsourcing.ts`

## Database Schema

### Key Tables (`db/schema.ts`)

- `events` - Event store
- `plans` - Activity plans (read model)
- `plan_locations` - Plan location data with PostGIS support
- `users` - User accounts
- `profiles` - User profile information

### Database Commands

```bash
bun run db:generate    # Generate SQL from schema
bun run db:push        # Apply migrations
bun run db:studio      # Open Drizzle Studio
```

## ORPC API

### Route Structure (`server/router/`)

- `auth.ts` - Authentication routes
- `plan.ts` - Plan management
- `user.ts` - User management
- `contact.ts` - Contact management
- `location.ts` - Location services

### Route Types

- `publicRoute` - No authentication required
- `protectedRoute` - Requires valid session

## Frontend Architecture

### Expo Router

- File-based routing in `app/` directory
- Tab navigation in `app/(tabs)/`
- Authentication flow in `app/auth/`
- Onboarding in `app/onboarding/`

### Styling

- NativeWind for Tailwind CSS in React Native
- Component library in `components/ui/`
- Theme support with dark/light modes

### Key Components

- `PlanCard` - Display activity plans
- `ParticipantSelector` - Select participants
- `SmartDateTimePicker` - Date/time selection
- `AIPlanBottomSheet` - AI-powered plan creation

## Activities System

### Activity Categories (`shared/activities.ts`)

The app supports 9 main activity categories:

- **Sport** - Basketball, soccer, running, etc.
- **Food & Drink** - Restaurants, cafes, bars
- **Arts & Culture** - Museums, galleries, concerts
- **Social** - Parties, meetups, board games
- **Learning** - Workshops, classes, study groups
- **Outdoors** - Camping, hiking, beach activities
- **Travel** - Day trips, city tours, road trips
- **Wellness** - Meditation, spa, massage
- **At Home** - Movie nights, dinner parties

## Development Workflow

### Running the App

```bash
# Start both server and client
bun run dev

# Or separately
bun run server    # Backend only
bun run start     # Frontend only
bun run ios       # iOS simulator
bun run android   # Android emulator
bun run web       # Web version
```

### Adding New Features

1. **Define Events** in `server/events.ts`
2. **Create ORPC Route** in `server/router/`
3. **Add Authorization** and validation
4. **Emit Events** from route handlers
5. **Update Projections** in `server/es.ts`
6. **Create Frontend Components** in `app/` or `components/`

### Database Changes

1. Update schema in `db/schema.ts`
2. Run `bun run db:generate` to create migration
3. Run `bun run db:push` to apply changes

## Demo Users

For testing purposes, several demo users are available:

- `+49 555 1111111` (code: `123456`) - Store reviews
- `+49 555 2222222` (code: `123456`) - Local testing
- `+49 555 3333333` (code: `123456`) - Multi-user testing
- `+1 202 555-0001` & `+1 202 555-0002` (code: `123456`) - US numbers

## Docker Support

```bash
# Build Docker image
./scripts/build-docker.sh

# Run with docker-compose
docker-compose up

# Run container directly
docker run -p 3000:3000 realite-server
```

## Important Files

- `server/events.ts` - Event definitions
- `server/es.ts` - Event sourcing and projections
- `server/orpc.ts` - ORPC configuration
- `db/schema.ts` - Database schema
- `shared/validation.ts` - Validation schemas
- `shared/activities.ts` - Activity definitions
- `client/orpc.ts` - Client-side ORPC setup

## Key Principles

1. **Event Sourcing First** - All domain changes go through events
2. **Type Safety** - Full TypeScript throughout the stack
3. **Mobile-First** - React Native with web support
4. **Real-World Focus** - Emphasis on physical activities and locations
5. **Social Discovery** - Help users find others with similar interests

## Getting Started

1. Install dependencies: `bun install`
2. Set up environment variables
3. Start database: `docker-compose up -d postgres`
4. Run migrations: `bun run db:push`
5. Start development: `bun run dev`

The app will be available at:

- Mobile: Expo Go app
- Web: <http://localhost:3000>
- API: WebSocket RPC on port 3000
