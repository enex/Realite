import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PostHogProvider
          apiKey={POSTHOG_API_KEY}
          options={{
            host: POSTHOG_HOST,
            enableSessionReplay: true,
            storage: FileSystem,
          }}
        >
          <QueryClientProvider client={queryClient}>
            <BottomSheetModalProvider>
              <ThemeProvider
                value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
              >
                <Stack>
                  <Stack.Screen
                    name="index"
                    options={{
                      headerShown: false,
                      title: "Realite - Die App für echte Verbindungen",
                    }}
                  />
                  <Stack.Screen
                    name="onboarding"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen name="plan" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
              </ThemeProvider>
            </BottomSheetModalProvider>
          </QueryClientProvider>
        </PostHogProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
