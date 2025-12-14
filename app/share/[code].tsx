import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Platform, Text, View } from "react-native";

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

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Lade...</Text>
    </View>
  );
}
