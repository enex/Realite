import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HowItWorksScreen() {
  const router = useRouter();

  const steps = [
    {
      icon: "event",
      title: "1. Termine importieren",
      description:
        "Verbinde deinen Kalender und importiere deine Termine automatisch als Pläne in Realite.",
    },
    {
      icon: "people",
      title: "2. Freunde einladen",
      description:
        "Lade deine Freunde zu deinen Plänen ein oder finde gemeinsame Zeitfenster für Aktivitäten.",
    },
    {
      icon: "notifications",
      title: "3. Benachrichtigungen erhalten",
      description:
        "Erhalte Erinnerungen für deine Pläne und Updates über neue Einladungen oder Änderungen.",
    },
    {
      icon: "location-on",
      title: "4. Lokale Aktivitäten entdecken",
      description:
        "Finde spannende Aktivitäten in deiner Nähe und lerne neue Leute kennen.",
    },
    {
      icon: "verified",
      title: "5. Echte Verbindungen schaffen",
      description:
        "Triff dich mit Menschen, teile Erlebnisse und baue echte, nachhaltige Beziehungen auf.",
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
              💡 Tipp: Starte mit deinen bestehenden Terminen!
            </Text>
            <Text className="text-muted-foreground">
              Verbinde deinen Kalender, um deine Termine automatisch zu
              importieren und Freunde zu deinen Plänen einzuladen. So wird
              Realite zu einem natürlichen Teil deines Alltags.
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
