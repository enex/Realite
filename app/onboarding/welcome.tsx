import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-6">
        {/* Logo/Icon */}
        <View className="mb-8 items-center">
          <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-primary">
            <MaterialIcons name="people" size={48} color="white" />
          </View>
          <Text className="text-center text-3xl font-bold text-foreground">
            Willkommen bei Realite
          </Text>
        </View>

        {/* Description */}
        <View className="mb-12">
          <Text className="text-center text-lg leading-relaxed text-muted-foreground">
            Entdecke echte Verbindungen und erlebe unvergessliche Momente mit
            Menschen in deiner Nähe.
          </Text>
        </View>

        {/* Features */}
        <View className="mb-12 flex flex-col gap-4">
          <View className="flex-row items-center">
            <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <MaterialIcons
                name="location-on"
                size={20}
                color={isDark ? "#818CF8" : "#4F46E5"}
              />
            </View>
            <Text className="flex-1 text-foreground">
              Finde Aktivitäten in deiner Umgebung
            </Text>
          </View>

          <View className="flex-row items-center">
            <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <MaterialIcons
                name="group"
                size={20}
                color={isDark ? "#818CF8" : "#4F46E5"}
              />
            </View>
            <Text className="flex-1 text-foreground">
              Lerne neue Leute kennen oder triff alte Bekannte
            </Text>
          </View>

          <View className="flex-row items-center">
            <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <MaterialIcons
                name="event"
                size={20}
                color={isDark ? "#818CF8" : "#4F46E5"}
              />
            </View>
            <Text className="flex-1 text-foreground">
              Erstelle eigene Aktivitäten und lade andere ein
            </Text>
          </View>
        </View>

        {/* CTA Button */}
        <Pressable
          onPress={() => router.push("/onboarding/how-it-works" as never)}
          className="items-center rounded-lg bg-primary px-6 py-4"
        >
          <Text className="text-lg font-semibold text-primary-foreground">
            Los geht&apos;s!
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
