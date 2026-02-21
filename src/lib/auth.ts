import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";

import * as authSchema from "@/src/db/auth-schema";
import { getDb } from "@/src/db/client";

const authBaseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const authSecret = process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

export const auth = betterAuth({
  baseURL: authBaseUrl,
  secret: authSecret,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: authSchema,
    camelCase: true
  }),
  plugins: [nextCookies()],
  user: {
    modelName: "authUser"
  },
  session: {
    modelName: "authSession"
  },
  account: {
    modelName: "authAccount"
  },
  verification: {
    modelName: "authVerification"
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/contacts",
        "https://www.googleapis.com/auth/contacts.readonly"
      ],
      accessType: "offline",
      prompt: "consent"
    }
  }
});

export async function getAuthSession() {
  return auth.api.getSession({
    headers: new Headers(await headers())
  });
}
