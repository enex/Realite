import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ScrollView, View } from "react-native";

import { useSession } from "@/client/auth";
import orpc from "@/client/orpc";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, MapPinIcon, User2Icon } from "lucide-react-native";

export default function WelcomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ repeat?: string }>();
  const isRepeat = params.repeat === "1" || params.repeat === "true";
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const session = useSession();

  // Nur me Query ausführen, wenn eine Session vorhanden ist
  const meRes = useQuery(
    orpc.auth.me.queryOptions({
      enabled: !!session && !session.isLoading,
      retry: false, // Nicht wiederholen bei Fehlern
    })
  );
  const onboarded = meRes.data?.onboarded;
  useEffect(() => {
    if (onboarded && !isRepeat) {
      router.replace("/(tabs)");
    }
  }, [onboarded, isRepeat, router]);

  const iconColor = isDark ? "#d4d4d8" : "#3C3C43";

  const features = [
    {
      icon: CalendarIcon,
      title: "Pläne erstellen",
      text: "Erstelle Pläne für Aktivitäten mit Zeit, Ort und Beschreibung",
    },
    {
      icon: User2Icon,
      title: "Kontakte sehen deine Pläne",
      text: "Deine Kontakte sehen deine offenen Pläne und können beitreten",
    },
    {
      icon: MapPinIcon,
      title: "Pläne von anderen entdecken",
      text: "Sieh, was deine Kontakte planen, und tritt bei",
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-zinc-100 dark:bg-zinc-950"
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="flex-1 justify-center px-6">
        {/* Logo/Icon */}
        <View className="mb-8 items-center">
          <View className="mb-6 h-28 w-28 items-center justify-center rounded-full bg-primary shadow-md">
            <Icon name={User2Icon} size={56} />
          </View>
          <Text className="mb-2 text-center text-3xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
            Willkommen bei Realite
          </Text>
          <Text className="px-4 text-center text-base leading-relaxed text-zinc-500 dark:text-zinc-300">
            Einfach Pläne teilen und gemeinsam Zeit verbringen
          </Text>
        </View>

        {/* Features */}
        <View className="mb-8 gap-4">
          {features.map((feature, index) => (
            <View
              key={index}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <View className="flex-row items-start gap-4">
                <View className="rounded-xl border border-zinc-200 bg-zinc-100 p-3 dark:border-zinc-700 dark:bg-zinc-800/80">
                  <Icon name={feature.icon} size={20} color={iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {feature.title}
                  </Text>
                  <Text className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-300">
                    {feature.text}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* CTA Button */}
        <Button
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/onboarding/profile-setup");
          }}
          variant="default"
          size="lg"
          className="py-4 h-14"
        >
          <Text className="text-lg font-semibold text-white">
            Los geht&apos;s!
          </Text>
        </Button>
      </View>
    </ScrollView>
  );
}
