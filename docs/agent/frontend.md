# Frontend Architecture

## Expo Router

File-based routing in `app/` directory:

- Tab navigation in `app/(tabs)/`
- Authentication flow in `app/auth/`
- Onboarding in `app/onboarding/`
- Modals in `app/(modals)/`
- API routes in `app/api/`

## Styling

- **NativeWind** - Tailwind CSS for React Native
- Component library in `components/ui/`
- Theme support with dark/light modes
- Theme configuration in `theme/`

## Key Components

- `PlanCard` - Display activity plans
- `ParticipantSelector` - Select participants
- `SmartDateTimePicker` / `OnboardingDateTimePicker` - Date/time selection
- `AIPlanBottomSheet` - AI-powered plan creation

## Hooks

Custom React hooks in `hooks/`:
- `use-calendar-events.ts` - Calendar integration
- `use-contact.ts` - Contact management
- `use-location.ts` - Location services
- `use-feature-flag.ts` - Feature flags

## Running the App

```bash
bun run start     # Start Expo dev server
bun run ios       # iOS simulator
bun run android   # Android emulator
bun run web       # Web version
```

## Important Directories

- `app/` - Expo Router screens
- `components/` - Reusable React Native components
- `hooks/` - Custom React hooks
- `client/` - Client-side utilities (auth, ORPC, etc.)
