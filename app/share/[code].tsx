import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, Platform, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";

import { useSession } from "@/client/auth";
import rpc from "@/client/orpc";
import { setPendingShareCode } from "@/client/share-link";
import { isDefinedError } from "@orpc/client";

/**
 * This page redirects to the server-rendered API route which includes
 * proper meta tags in the initial HTML response for crawlers (WhatsApp, Facebook, Twitter, etc.)
 *
 * The API route /api/share/[code] serves server-rendered HTML with all meta tags
 * already in the <head>, which is essential for proper social media previews.
 */
export default function ShareProfileScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = params.code as string;
  const router = useRouter();
  const { session, isLoading } = useSession();
  const hasResolved = useRef(false);
  const trackShareLink = useMutation(
    rpc.user.trackShareLinkOpen.mutationOptions(),
  );

  useEffect(() => {
    // Redirect to the API route which serves server-rendered HTML with proper meta tags
    // This ensures crawlers get the meta tags in the initial HTML response
    if (Platform.OS === "web" && typeof window !== "undefined") {
      // Only redirect if we're not already on the API route
      if (!window.location.pathname.startsWith("/api/share/")) {
        window.location.replace(`/api/share/${code}`);
      }
    }
  }, [code]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!code || hasResolved.current || isLoading) return;

    if (!session?.id) {
      setPendingShareCode(code);
      router.replace("/auth/phone" as never);
      return;
    }

    hasResolved.current = true;
    trackShareLink.mutate(
      { code },
      {
        onSuccess: (data) => {
          router.replace(`/user/${data.targetId}` as never);
        },
        onError: (error) => {
          if (isDefinedError(error) && error.code === "NOT_FOUND") {
            Alert.alert("Fehler", "Dieser Share-Link ist ungültig.");
            router.replace("/(tabs)" as never);
          } else {
            Alert.alert(
              "Fehler",
              "Der Share-Link konnte nicht geladen werden.",
            );
            hasResolved.current = false;
          }
        },
      },
    );
  }, [code, isLoading, router, session?.id, trackShareLink]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Lade...</Text>
    </View>
  );
}
