# ORPC API

ORPC provides type-safe RPC communication between client and server.

## Route Structure

Routes are organized in `server/router/`:

- `auth.ts` - Authentication routes
- `plan.ts` - Plan management
- `user.ts` - User management
- `contact.ts` - Contact management
- `location.ts` - Location services
- `intent.ts` - User intents and matching
- `link.ts` - Share link management
- `share.ts` - Sharing functionality

## Route Types

- `publicRoute` - No authentication required
- `protectedRoute` - Requires valid session

## Client Usage

Client-side ORPC setup is in `client/orpc.ts`. Routes are accessed via the ORPC client with full type safety.

## Server Configuration

ORPC server configuration is in `server/orpc.ts`, which sets up:
- Event sourcing context (`context.es`)
- Authentication context
- Database connection
- Projection access

## Important Files

- `server/orpc.ts` - Server-side ORPC configuration
- `client/orpc.ts` - Client-side ORPC setup
- `server/router/` - Route handlers
