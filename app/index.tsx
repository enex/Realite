import { useSession } from "@/client/auth";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NativeLanding() {
  const handleSignIn = () => {
    // TODO: Implement sign in logic
    console.log("Sign in pressed");
    router.push("/auth/phone");
  };

  const { session, isLoading } = useSession();
  useEffect(() => {
    if (isLoading || !session) return;
    router.replace("/(tabs)");
  }, [session, isLoading]);

  return (
    <SafeAreaView className="bg-white flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white justify-center items-center px-8 py-8 min-h-full">
          {/* Logo/Icon Area */}
          <View className="items-center mb-12">
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 bg-blue-600 rounded-xl items-center justify-center mr-3 shadow-lg">
                <Text className="text-white text-xl font-bold">R</Text>
              </View>
              <Text className="text-3xl font-bold text-gray-900">Realite</Text>
              <View className="bg-blue-600 px-2 py-1 rounded-full ml-3">
                <Text className="text-white font-semibold text-xs">BETA</Text>
              </View>
            </View>
          </View>

          {/* Main Message - Simplified */}
          <View className="items-center mb-12">
            <Text className="text-2xl font-bold text-center text-gray-900 mb-4 leading-tight">
              Die App für echte Verbindungen
            </Text>
            <Text className="text-lg text-center text-gray-700 mb-6 leading-relaxed">
              Leg dein Handy weg. Erlebe echte Momente.
            </Text>
            <Text className="text-center text-amber-700 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
              Geschlossene Beta – Apps derzeit nicht für jeden verfügbar
            </Text>
          </View>

          {/* Key Features - Simplified */}
          <View className="flex-row justify-center gap-8 mb-12">
            <View className="items-center">
              <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center shadow-lg mb-2">
                <Text className="text-2xl">🤝</Text>
              </View>
              <Text className="text-sm font-semibold text-gray-800 text-center">
                Freunde
              </Text>
            </View>

            <View className="items-center">
              <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center shadow-lg mb-2">
                <Text className="text-2xl">🎯</Text>
              </View>
              <Text className="text-sm font-semibold text-gray-800 text-center">
                Aktivitäten
              </Text>
            </View>

            <View className="items-center">
              <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center shadow-lg mb-2">
                <Text className="text-2xl">✨</Text>
              </View>
              <Text className="text-sm font-semibold text-gray-800 text-center">
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
                Einladungscode eingeben
              </Text>
            </Pressable>

            <Pressable
              className="bg-green-600 py-4 rounded-2xl active:scale-95 transition-all"
              onPress={() =>
                Linking.openURL(
                  "https://whatsapp.com/channel/0029Vb5w20yKwqSOem15d11O"
                )
              }
            >
              <Text className="text-white font-semibold text-base text-center">
                🟢 WhatsApp Updates
              </Text>
            </Pressable>
          </View>

          {/* Security Badge - Simplified */}
          <View className="mt-8 bg-white px-6 py-3 rounded-2xl shadow-lg border border-gray-100">
            <View className="flex-row items-center">
              <Text className="text-xl mr-2">🔒</Text>
              <Text className="text-gray-800 font-semibold text-center">
                Invite-only • Sicher
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
