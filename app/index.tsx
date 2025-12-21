import orpc from "@/client/orpc";
import { useSession } from "@/client/auth";
import { useFeatureFlagBoolean } from "@/hooks/useFeatureFlag";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NativeLanding() {
  const handleSignIn = () => {
    // TODO: Implement sign in logic
    console.log("Sign in pressed");
    router.push("/auth/phone");
  };

  // Verwende useSession für schnelle lokale Session-Prüfung
  const { session, isLoading: sessionLoading } = useSession();
  
  // Nur me Query ausführen, wenn eine Session vorhanden ist
  const meRes = useQuery(
    orpc.auth.me.queryOptions({
      enabled: !!session && !sessionLoading,
      retry: false, // Nicht wiederholen bei Fehlern
    })
  );
  
  const onboardingEnabled = useFeatureFlagBoolean("onboarding", false);
  
  useEffect(() => {
    // Warte bis Session-Prüfung abgeschlossen ist
    if (sessionLoading) return;
    
    // Wenn keine Session vorhanden ist, zeige Anmelde-Button
    if (!session) return;
    
    // Wenn me Query einen Fehler hat (z.B. ungültiger Token), zeige Anmelde-Button
    if (meRes.error) return;
    
    // Wenn Session vorhanden ist, aber me Query noch lädt, warte
    if (meRes.isLoading || !meRes.data) return;
    
    // Check Onboarding-Status
    if (meRes.data.onboarded && !onboardingEnabled) {
      router.replace("/(tabs)");
    } else {
      router.replace("/onboarding/welcome");
    }
  }, [session, sessionLoading, onboardingEnabled, meRes.data, meRes.isLoading, meRes.error]);

  // Zeige Loading-Screen während Authentifizierung geprüft wird
  // Aber nicht wenn ein Fehler aufgetreten ist (dann zeige Anmelde-Button)
  if ((sessionLoading || (session && meRes.isLoading)) && !meRes.error) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="min-h-full items-center justify-center px-8 py-8">
          {/* Logo/Icon Area */}
          <View className="items-center mb-12">
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 bg-blue-600 rounded-xl items-center justify-center mr-3 shadow-lg">
                <Text className="text-white text-xl font-bold">R</Text>
              </View>
              <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                Realite
              </Text>
              <View className="bg-blue-600 px-2 py-1 rounded-full ml-3">
                <Text className="text-white font-semibold text-xs">BETA</Text>
              </View>
            </View>
          </View>

          {/* Main Message - Simplified */}
          <View className="items-center mb-12">
            <Text className="mb-4 text-center text-2xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
              Die App für echte Verbindungen
            </Text>
            <Text className="mb-6 text-center text-lg leading-relaxed text-zinc-700 dark:text-zinc-200">
              Leg dein Handy weg. Erlebe echte Momente.
            </Text>
            <Text className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              Geschlossene Beta – Apps derzeit nicht für jeden verfügbar
            </Text>
          </View>

          {/* Key Features - Simplified */}
          <View className="flex-row justify-center gap-8 mb-12">
            <View className="items-center">
              <View className="mb-2 h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg dark:bg-zinc-900">
                <Text className="text-2xl">🤝</Text>
              </View>
              <Text className="text-center text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Freunde
              </Text>
            </View>

            <View className="items-center">
              <View className="mb-2 h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg dark:bg-zinc-900">
                <Text className="text-2xl">🎯</Text>
              </View>
              <Text className="text-center text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Aktivitäten
              </Text>
            </View>

            <View className="items-center">
              <View className="mb-2 h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg dark:bg-zinc-900">
                <Text className="text-2xl">✨</Text>
              </View>
              <Text className="text-center text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Erlebnisse
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="w-full max-w-sm gap-4">
            <Pressable
              className="bg-blue-600 py-5 rounded-2xl shadow-2xl active:scale-95 transition-all"
              onPress={handleSignIn}
            >
              <Text className="text-white font-bold text-xl text-center">
                Log Legen
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
