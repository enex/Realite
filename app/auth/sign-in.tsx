import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

export default function SignIn() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>
        Willkommen bei Realite
      </Text>
      <Text
        style={{
          fontSize: 16,
          marginBottom: 30,
          textAlign: "center",
          paddingHorizontal: 20,
        }}
      >
        Melde dich an, um Events zu entdecken und neue Leute kennenzulernen
      </Text>
      <Pressable
        onPress={() => {
          // Use the existing phone auth flow
          router.push("/auth/phone");
        }}
        style={{
          backgroundColor: "#4F46E5",
          padding: 16,
          borderRadius: 8,
          minWidth: 200,
        }}
      >
        <Text style={{ color: "white", fontSize: 16, textAlign: "center" }}>
          Mit Telefonnummer anmelden
        </Text>
      </Pressable>
    </View>
  );
}
