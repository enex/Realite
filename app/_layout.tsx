import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PostHogProvider } from "posthog-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PostHogProvider
        apiKey={POSTHOG_API_KEY}
        options={{ host: POSTHOG_HOST, enableSessionReplay: true }}
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
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="plan" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}
