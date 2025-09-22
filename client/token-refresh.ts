import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import type { AppStateStatus } from "react-native";
import { AppState } from "react-native";
import orpc from "./orpc";
import { deleteToken, getToken, setToken } from "./session-store";

// Check if token needs refresh (when less than 30 days remaining)
function shouldRefreshToken(token: string): boolean {
  try {
    // Decode JWT payload (simple base64 decode, no verification needed for expiry check)
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) {
      return false;
    }

    const payload = JSON.parse(atob(parts[1])) as { exp?: number };
    const exp = payload.exp;

    if (!exp) return false;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = exp - now;
    const thirtyDaysInSeconds = 60 * 60 * 24 * 30;

    return timeUntilExpiry < thirtyDaysInSeconds;
  } catch (error) {
    console.error("Error checking token expiry:", error);
    return false;
  }
}

// Hook for automatic token refresh
export function useTokenRefresh() {
  const refreshMutation = useMutation(orpc.auth.refreshToken.mutationOptions());
  const utils = useQueryClient();
  const router = useRouter();
  const lastRefreshAttempt = useRef<number>(0);
  const refreshInProgress = useRef<boolean>(false);

  const attemptTokenRefresh = async () => {
    // Prevent multiple simultaneous refresh attempts
    if (refreshInProgress.current) {
      return;
    }

    // Rate limiting: don't attempt refresh more than once per hour
    const now = Date.now();
    if (now - lastRefreshAttempt.current < 60 * 60 * 1000) {
      return;
    }

    const currentToken = await getToken();
    if (!currentToken || !shouldRefreshToken(currentToken)) {
      return;
    }

    try {
      refreshInProgress.current = true;
      lastRefreshAttempt.current = now;

      console.log("Attempting to refresh token...");
      const result = await refreshMutation.mutateAsync({});
      if (result.token) {
        setToken(result.token);
        await utils.invalidateQueries();
        console.log("Token refreshed successfully");
      }
    } catch (error) {
      console.error("Token refresh failed:", error);

      // Check if the error indicates an invalid token (unauthorized)
      if (error && typeof error === "object" && "data" in error) {
        const errorData = error.data as { code?: string };
        if (errorData.code === "UNAUTHORIZED") {
          await handleInvalidToken(router, utils);
          return;
        }
      }

      // For other errors, let the app continue with existing token
    } finally {
      refreshInProgress.current = false;
    }
  };

  // Check token on app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        // App came to foreground, check if token needs refresh
        void attemptTokenRefresh();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Also check immediately when hook is first used
    void attemptTokenRefresh();

    return () => subscription.remove();
  }, []);

  // Periodic check every 24 hours when app is active
  useEffect(() => {
    const interval = setInterval(
      () => {
        if (AppState.currentState === "active") {
          void attemptTokenRefresh();
        }
      },
      24 * 60 * 60 * 1000
    ); // 24 hours

    return () => clearInterval(interval);
  }, []);

  return {
    refreshToken: attemptTokenRefresh,
    isRefreshing: refreshMutation.isPending,
  };
}

// Function to handle invalid tokens - clears token and redirects to auth
export async function handleInvalidToken(
  router: ReturnType<typeof useRouter>,
  utils: ReturnType<typeof useQueryClient>
) {
  console.log("Token is invalid, redirecting to signup and clearing token");
  await deleteToken();
  await utils.invalidateQueries();
  // Defer navigation to avoid ScreenStackFragment error
  setTimeout(() => {
    router.replace("/auth/phone");
  }, 0);
}
