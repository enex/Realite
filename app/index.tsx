import { ThemedText } from "@/components/ThemedText";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

export default function LandingPage() {
  return (
    <View>
      <ThemedText>Landing Page</ThemedText>
      <Pressable onPress={() => router.push("/(tabs)")}>
        <ThemedText>Go to Home</ThemedText>
      </Pressable>
    </View>
  );
}
