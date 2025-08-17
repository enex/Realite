import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

export default function HowItWorksScreen() {
  const router = useRouter();

  const steps = [
    {
      icon: "add-circle",
      title: "1. Aktivität vorschlagen",
      description:
        "Erstelle einen Vorschlag für eine Aktivität, die du gerne machen möchtest. Wähle aus beliebten Spots oder schlage neue vor.",
    },
    {
      icon: "notifications",
      title: "2. Andere benachrichtigen",
      description:
        "Deine Kontakte und passende Personen in der Nähe werden über deinen Vorschlag informiert.",
    },
    {
      icon: "thumb-up",
      title: "3. Interesse zeigen",
      description:
        "Andere können Interesse an deiner Aktivität zeigen oder eigene Zeitvorschläge machen.",
    },
    {
      icon: "event",
      title: "4. Realite bestätigen",
      description:
        "Sobald genug Interesse da ist, wird aus dem Vorschlag eine konkrete Realite mit Zeit und Ort.",
    },
    {
      icon: "verified",
      title: "5. Teilnahme bestätigen",
      description:
        "Nach der Realite bestätigt ihr gegenseitig eure Teilnahme, um eure Zuverlässigkeitsbewertung zu verbessern.",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6">
        <View className="py-6">
          <Text className="mb-2 text-center text-2xl font-bold text-foreground">
            So funktioniert Realite
          </Text>
          <Text className="mb-8 text-center text-muted-foreground">
            In 5 einfachen Schritten zu echten Begegnungen
          </Text>

          <View className="flex flex-col gap-6">
            {steps.map((step, index) => (
              <View key={index} className="flex-row items-start">
                <View className="mr-4 mt-1 h-12 w-12 items-center justify-center rounded-full bg-primary">
                  <MaterialIcons
                    name={step.icon as keyof typeof MaterialIcons.glyphMap}
                    size={24}
                    color="white"
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-2 text-lg font-semibold text-foreground">
                    {step.title}
                  </Text>
                  <Text className="leading-relaxed text-muted-foreground">
                    {step.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View className="mt-8 rounded-lg bg-primary/10 p-4">
            <Text className="mb-2 font-semibold text-primary">
              💡 Tipp: Zuverlässigkeit ist wichtig!
            </Text>
            <Text className="text-muted-foreground">
              Je zuverlässiger du bist, desto mehr Vertrauen baust du auf und
              desto mehr Leute werden an deinen Aktivitäten teilnehmen wollen.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-6 pb-6">
        <Pressable
          onPress={() => router.push("/onboarding/profile-setup" as never)}
          className="items-center rounded-lg bg-primary px-6 py-4"
        >
          <Text className="text-lg font-semibold text-primary-foreground">
            Verstanden, weiter!
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
