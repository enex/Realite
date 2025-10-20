import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

export default function SignIn() {
  return (
    <View className="flex-1 justify-center items-center">
      <Text className="text-foreground text-2xl font-bold mb-4">
        Willkommen bei Realite
      </Text>
      <Text className="text-foreground/80 text-sm text-center mb-6 px-4">
        Melde dich an, um Events zu entdecken und neue Leute kennenzulernen
      </Text>
      <Pressable
        onPress={() => {
          // Use the existing phone auth flow
          router.push("/auth/phone");
        }}
        className="bg-primary rounded-xl px-4 py-2 min-w-[200px]"
      >
        <Text className="text-white text-sm text-center">
          Mit Telefonnummer anmelden
        </Text>
      </Pressable>
    </View>
  );
}
