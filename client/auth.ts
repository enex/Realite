import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";

import { isDefinedError } from "@orpc/client";
import orpc, { client } from "./orpc";
import { deleteToken, getToken, setToken } from "./session-store";
import { handleInvalidToken } from "./token-refresh";

// Lokale Typdefinition für JWT Payload
interface JWTPayload {
  id: string;
  name?: string | null;
  image?: string | null;
  phoneNumber: string;
  exp?: number;
  iat?: number;
}

// Lokale JWT-Dekodierung ohne Verifikation (nur für initialen State)
function decodeJWTLocally(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) {
      return null;
    }

    // Base64 decode des Payloads
    const payload = JSON.parse(atob(parts[1])) as JWTPayload;

    // Prüfe ob Token abgelaufen ist
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        return null; // Token ist abgelaufen
      }
    }

    return payload;
  } catch (error) {
    console.error("Error decoding JWT locally:", error);
    return null;
  }
}

// Query function für lokale Session-Initialisierung
async function getLocalSession(): Promise<JWTPayload | null> {
  const token = getToken();
  if (!token) return null;
  return decodeJWTLocally(token);
}

export const useUser = () => {
  const { data: session } = useQuery(orpc.auth.getSession.queryOptions());
  return session;
};

export const useSession = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Lokale Session aus Token laden (cached)
  const { data: localSession, isLoading: localIsLoading } = useQuery({
    queryKey: ["local-session"],
    queryFn: getLocalSession,
    staleTime: Infinity, // Lokale Session ändert sich nur bei Token-Änderung
    gcTime: Infinity, // Nie aus dem Cache entfernen
  });

  // API-Anfrage für Verifikation im Hintergrund (nur wenn lokale Session existiert)
  const { data: apiSession, error } = useQuery(
    orpc.auth.getSession.queryOptions({
      enabled: !localIsLoading && localSession !== null,
      staleTime: 15 * 60 * 1000, // 15 Minuten
      retry: false, // Nicht wiederholen bei Fehlern, um schnell zu erkennen wenn Token ungültig ist
    }),
  );

  // Automatische Behandlung von ungültigen Tokens
  useEffect(() => {
    if (
      isDefinedError(error) &&
      error.code === "UNAUTHORIZED" &&
      localSession
    ) {
      console.log("Token is invalid, clearing session and redirecting to auth");
      // Token ist ungültig, lösche ihn und leite zur Anmeldung weiter
      void handleInvalidToken(router, queryClient);
      // Invalidiere auch die lokale Session Query
      void queryClient.invalidateQueries({ queryKey: ["local-session"] });
    }
  }, [error, localSession, router, queryClient]);

  // Optimistische Session-Logik:
  // 1. Verwende lokale Session sofort (optimistisch)
  // 2. Überschreibe mit API-Session wenn verfügbar
  // 3. Falls API-Session null ist (aber kein Fehler), verwende weiterhin lokale Session
  const session = apiSession !== undefined ? apiSession : localSession;

  // Loading ist nur true wenn:
  // 1. Lokale Session noch lädt UND keine lokale Session vorhanden
  // 2. Lokale Session existiert, API lädt noch, aber nur beim ersten Mal
  const isLoading = localIsLoading && !localSession;

  return { session, isLoading, error, localIsLoading };
};

export const useSignIn = () => {
  const router = useRouter();

  return () => {
    router.push("/auth/phone" as never);
  };
};

export const useSignInWithPhone = () => {
  const router = useRouter();
  const posthog = usePostHog();
  const queryClient = useQueryClient();

  const verifySMSCode = useMutation(
    orpc.auth.verifySMSCode.mutationOptions({
      onSuccess: async (data) => {
        setToken(data.token);
        posthog?.identify(data.id);
        posthog?.reloadFeatureFlags();

        // Invalidiere lokale Session Query um neue Session zu laden
        await queryClient.invalidateQueries();

        // Check onboarding status after successful login
        try {
          const userQuery = await client.auth.me();
          // Defer navigation to avoid ScreenStackFragment error
          setTimeout(() => {
            if (userQuery.onboarded) {
              // User has completed onboarding, go to main app
              router.replace("/");
            } else {
              // User hasn't completed onboarding, redirect to onboarding
              router.replace("/onboarding/welcome");
            }
          }, 0);
        } catch (error) {
          console.error("Error checking onboarding status:", error);
          // Fallback to main app if we can't check onboarding status
          setTimeout(() => {
            router.replace("/");
          }, 0);
        }
      },
      onError: (error) => {
        console.error("Error signing in with phone:", error);
        // Error will be handled by the calling component
      },
    }),
  );
  return async (phoneNumber: string, code: string) =>
    verifySMSCode.mutateAsync({ phoneNumber, code });
};

export function useSignOut() {
  const signOut = useMutation(orpc.auth.signOut.mutationOptions());
  const router = useRouter();
  const queryClient = useQueryClient();

  return async () => {
    await signOut.mutateAsync({}).catch((error) => {
      console.error("Error signing out:", error);
    });
    await deleteToken();
    await queryClient.invalidateQueries();

    // Invalidiere auch die lokale Session Query
    void queryClient.invalidateQueries({ queryKey: ["local-session"] });

    // Defer navigation to avoid ScreenStackFragment error
    setTimeout(() => {
      router.replace("/auth/phone");
    }, 0);
  };
}

/** ensure that the user is logged in, and if not redirect to the login page */
export function useEnsureUser() {
  const router = useRouter();
  const utils = useQueryClient();
  const {
    data: session,
    error,
    isLoading,
  } = useQuery(orpc.auth.getSession.queryOptions());

  // Automatische Weiterleitung bei Auth-Fehler
  useEffect(() => {
    if (isDefinedError(error) && error.code === "UNAUTHORIZED") {
      // Use the centralized invalid token handler
      void handleInvalidToken(router, utils);
    }
  }, [error, router, utils]);

  return { session, isLoading, error };
}
