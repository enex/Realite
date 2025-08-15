import { ThemedText } from "@/components/ThemedText";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function LandingPage() {
  return (
    <View>
      <ThemedText>Landing Page</ThemedText>
      <Pressable onPress={() => router.push("/(tabs)")}>
        <ThemedText>Go to Home</ThemedText>
      </Pressable>
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-xl font-bold text-blue-500">
          Welcome to Nativewind!
        </Text>
      </View>
    </View>
  );
}
