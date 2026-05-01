import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins/anonymous";
import { jwt } from "better-auth/plugins";
import { oauthProvider } from "@better-auth/oauth-provider";
import { headers } from "next/headers";

import * as authSchema from "@/src/db/auth-schema";
import { getDb } from "@/src/db/client";
import { ANONYMOUS_SESSION_DISPLAY_NAME } from "@/src/lib/anonymous-session";
import {
  APPLE_AUTH_PROVIDER,
  GOOGLE_AUTH_PROVIDER,
  MICROSOFT_AUTH_PROVIDER,
  isDevelopmentAuthMode,
  isAuthProviderEnabled,
} from "@/src/lib/provider-adapters";

const authBaseUrl =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3000";
const authSecret =
  process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
export const AUTH_ISSUER = process.env.BETTER_AUTH_ISSUER ?? authBaseUrl;
export const MCP_RESOURCE_AUDIENCE = `${authBaseUrl}/api/mcp`;
export const MCP_RESOURCE_ALIAS_AUDIENCE = `${authBaseUrl}/mcp`;
const mcpScopes = ["realite:read", "realite:write"] as const;
const oauthScopes = [
  "openid",
  "profile",
  "email",
  "offline_access",
  ...mcpScopes,
] as const;

function createAuth() {
  const socialProviders: Record<string, Record<string, unknown>> = {};

  if (isAuthProviderEnabled("google")) {
    socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Nur minimale Login-Scopes. Kalender und Kontakte werden separat
      // über /api/auth/connect/google inkrementell angefragt.
      scope: [...GOOGLE_AUTH_PROVIDER.scopes],
      accessType: "offline",
      prompt: "consent",
    };
  }

  if (isAuthProviderEnabled("apple")) {
    socialProviders.apple = {
      clientId: process.env.APPLE_CLIENT_ID ?? "",
      clientSecret: process.env.APPLE_CLIENT_SECRET ?? "",
      scope: [...APPLE_AUTH_PROVIDER.scopes],
    };
  }

  if (isAuthProviderEnabled("microsoft")) {
    socialProviders.microsoft = {
      clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
      tenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
      scope: [...MICROSOFT_AUTH_PROVIDER.scopes],
    };
  }

  return betterAuth({
    baseURL: authBaseUrl,
    secret: authSecret,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: authSchema,
      camelCase: true,
    }),
    plugins: [
      nextCookies(),
      anonymous({
        emailDomainName: "guest.realite.local",
        generateName: () => ANONYMOUS_SESSION_DISPLAY_NAME,
      }),
      jwt({
        disableSettingJwtHeader: true,
        jwt: {
          issuer: AUTH_ISSUER,
        },
      }),
      oauthProvider({
        loginPage: "/mcp/oauth/login",
        consentPage: "/mcp/oauth/consent",
        scopes: [...oauthScopes],
        validAudiences: [MCP_RESOURCE_AUDIENCE, MCP_RESOURCE_ALIAS_AUDIENCE],
        clientRegistrationDefaultScopes: [...oauthScopes],
        clientRegistrationAllowedScopes: [...oauthScopes],
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
      }),
    ],
    user: {
      modelName: "authUser",
    },
    session: {
      modelName: "authSession",
      storeSessionInDatabase: true,
    },
    account: {
      modelName: "authAccount",
    },
    verification: {
      modelName: "authVerification",
    },
    emailAndPassword: isDevelopmentAuthMode()
      ? {
          enabled: true,
          autoSignIn: false,
        }
      : undefined,
    socialProviders,
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (authInstance) {
    return authInstance;
  }

  authInstance = createAuth();

  return authInstance;
}

export async function getAuthSessionFromHeaders(requestHeaders: Headers) {
  return getAuth().api.getSession({
    headers: requestHeaders,
  });
}

export async function getAuthSession() {
  return getAuthSessionFromHeaders(new Headers(await headers()));
}
