import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import {
  ensureAlleGroupForUser,
  ensureKontakteGroupForUser,
  ensureUserSuggestionSettings,
  upsertGoogleConnection,
  upsertUser
} from "@/src/lib/repository";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/contacts.readonly",
          access_type: "offline",
          include_granted_scopes: "true",
          prompt: "consent"
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      const appUser = await upsertUser({
        email: user.email,
        name: user.name,
        image: user.image
      });

      await ensureAlleGroupForUser(appUser.id);
      await ensureKontakteGroupForUser(appUser.id);
      await ensureUserSuggestionSettings(appUser.id);

      if (account?.provider === "google" && account.access_token) {
        await upsertGoogleConnection({
          userId: appUser.id,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          scope: account.scope
        });
      }

      return true;
    },
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.scope = account.scope;
      }

      return token;
    }
  }
};
