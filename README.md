# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with `create-expo-app`.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## UI Components

This project uses UI components from [BNA UI](https://ui.ahmedbna.com/), a beautiful and accessible Expo React Native components library that works seamlessly across iOS and Android. The components are inspired by shadcn and provide a consistent design system for the app.

## Project Structure

```text
/
├── app/                    # Expo Router file-based routing
│   ├── (tabs)/            # Tab navigation screens
│   ├── (modals)/          # Modal screens
│   ├── auth/              # Authentication flows
│   ├── onboarding/        # Onboarding screens
│   ├── plan/              # Plan-related screens
│   ├── api/               # API route handlers
│   └── rpc/               # ORPC endpoint handlers
│
├── components/            # React components
│   ├── ui/                # Pure presentation components from BNA UI
│   │                      # These components don't know about the data model
│   │                      # and are purely presentational
│   └── [feature].tsx      # Feature-specific components with business logic
│
├── client/                # Client-side utilities and ORPC client
│   └── orpc.ts            # ORPC client configuration
│
├── server/                # Bun/Node TypeScript server
│   ├── router/            # ORPC route handlers (commands)
│   ├── services/         # Business logic services
│   ├── utils/            # Server utilities
│   ├── events.ts         # Event definitions
│   ├── es.ts             # Event sourcing utilities
│   └── projections.ts    # Event projections (read model updates)
│
├── shared/                # Shared code between client and server
│   ├── validation/       # Validation schemas
│   └── activities.ts     # Activity definitions
│
├── db/                    # Database schema and migrations
│   ├── schema.ts         # Drizzle ORM schema
│   └── migrations/       # Database migration files
│
├── hooks/                 # React hooks
├── theme/                 # Theme configuration
└── server.ts             # Server entry point
```

### Component Architecture

- `components/ui/`: Contains components primarily from [BNA UI](https://ui.ahmedbna.com/). These are pure presentation components that don't know about the data model and are reusable across the app.
- `components/[feature].tsx`: Feature-specific components that contain business logic and connect to the data model.

## Demo-Nutzer

Für Testzwecke und Store-Reviews stehen mehrere Demo-Nutzer zur Verfügung:

### Demo-Nutzer 1: Store Review User

- Telefonnummer: `+49 555 1111111` (oder `05551111111`)
- Verifizierungscode: `123456`
- Zweck: Für App Store Reviews

### Demo-Nutzer 2: Lokaler Testbenutzer

- Telefonnummer: `+49 555 2222222` (oder `05552222222`)
- Verifizierungscode: `123456`
- Zweck: Für lokales Testen und Entwicklung

### Demo-Nutzer 3: Zusätzlicher Testnutzer

- Telefonnummer: `+49 555 3333333` (oder `05553333333`)
- Verifizierungscode: `123456`
- Zweck: Für Tests mit mehreren Nutzern

### US Demo-Nutzer 1 & 2

- Telefonnummer: `+1 202 555-0001` und `+1 202 555-0002`
- Verifizierungscode: `123456`
- Zweck: Internationale Testnummern

**Hinweis:** Diese Telefonnummern sind valide aber speziell für Tests reserviert und werden niemals an echte Personen vergeben. Bei Verwendung dieser Nummern wird keine SMS versendet, und der Verifizierungscode ist fest eingestellt.

## Personas fürs Testen

Jeder Demonutzer hat eine Persona zugeordnet damit man während der Entwicklung
es einfach Hat szenarien nach zu stellen

1. Simon - Was ich machen würde
2. Anna - Studentin die Single ist, Laufen geht und Lerngruppen sachen Macht
3. Louis - Stundent der Calisthenics macht

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Docker

This project includes Docker support for running the Bun server in a containerized environment.

### Building the Docker Image

```bash
# Build using the provided script
./scripts/build-docker.sh

# Or build manually
docker build -t realite-server .
```

### Running with Docker

```bash
# Run the container
docker run -p 3000:3000 realite-server

# Or use docker-compose for development
docker-compose up
```

### Docker Compose

For local development with hot-reload:

```bash
# Start the service
docker-compose up

# Start in background
docker-compose up -d

# Stop the service
docker-compose down
```

## GitHub Container Registry

The Docker image is automatically built and published to GitHub Container Registry on:

- Push to `main` or `develop` branches
- New version tags (e.g., `v1.0.0`)
- Pull requests to `main` branch

The image will be available at: `ghcr.io/{your-username}/realite`

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
