import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { ShareIntentProvider } from "expo-share-intent";
import { useFonts } from "expo-font";
import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PostHogProvider } from "posthog-react-native";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/useColorScheme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { colorScheme as nativewindColorScheme } from "nativewind";

import { useSession } from "@/client/auth";
import { ShareLinkHandler } from "@/components/ShareLinkHandler";
import { ShareIntentHandler } from "@/components/ShareIntentHandler";
import { SplashScreenController } from "@/components/SplashScreenController";
import "../global.css";

const POSTHOG_API_KEY = "phc_3omBpOn5mo0ATpJZOmu7gU4RGpmLoXcef1YAGZY3e4O";
const POSTHOG_HOST = "https://eu.i.posthog.com";

// Create a client
const queryClient = new QueryClient();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    nativewindColorScheme.set(colorScheme ?? "system");
  }, [colorScheme]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    console.log("Setting navigation bar style", colorScheme);
    try {
      // With edge-to-edge enabled on Android, only style & visibility are effective.
      NavigationBar.setStyle(colorScheme === "dark" ? "light" : "dark");
      NavigationBar.setVisibilityAsync("visible");
    } catch {}
  }, [colorScheme]);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  const content = (
    <ShareIntentProvider>
      <QueryClientProvider client={queryClient}>
        <SplashScreenController />
        <ShareLinkHandler />
        <ShareIntentHandler />
        <BottomSheetModalProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <RootNavigator />
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          </ThemeProvider>
        </BottomSheetModalProvider>
      </QueryClientProvider>
    </ShareIntentProvider>
  );

  // Expo Router does server-side rendering for web; PostHog RN depends on `window` via AsyncStorage.
  const shouldInitPostHog =
    Platform.OS !== "web" ||
    (typeof window !== "undefined" && typeof document !== "undefined");

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {shouldInitPostHog ? (
          <PostHogProvider
            apiKey={POSTHOG_API_KEY}
            options={{
              host: POSTHOG_HOST,
              enableSessionReplay: true,
            }}
          >
            {content}
          </PostHogProvider>
        ) : (
          content
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { session } = useSession();
  return (
    <Stack>
      <Stack.Protected guard={!session}>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            title: "Realite - Die App für echte Verbindungen",
          }}
        />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="plan" options={{ headerShown: false }} />
        <Stack.Screen name="user/[id]/index" options={{ headerShown: false }} />
        <Stack.Screen
          name="(modals)/whatsapp-status-share"
          options={{
            headerShown: false,
            presentation: Platform.OS === "ios" ? "formSheet" : "modal",
          }}
        />
        <Stack.Screen
          name="(modals)/import-share"
          options={{
            headerShown: false,
            presentation: Platform.OS === "ios" ? "formSheet" : "modal",
          }}
        />
      </Stack.Protected>
      <Stack.Screen name="share/[code]" options={{ headerShown: false }} />
      <Stack.Screen name="delete-account" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
