import orpc from "@/client/orpc";
import type { UpdateUserInput } from "@/server/router/user";
import { genders } from "@/shared/validation";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/hooks/use-color-scheme";

const genderMap = {
  MALE: "Männlich",
  FEMALE: "Weiblich",
  NON_BINARY: "Nicht-Binär",
  OTHER: "Andere",
  PREFER_NOT_TO_SAY: "Keine Angabe",
};

export default function ProfileSetupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [formData, setFormData] = useState<UpdateUserInput>({
    name: "",
    gender: undefined,
  });

  const updateProfile = useMutation(
    orpc.user.update.mutationOptions({
      onSuccess: () => {
        router.push("/onboarding/intents" as any);
      },
      onError: (error) => {
        console.error(error);
        Alert.alert("Fehler", error.message);
      },
    })
  );

  const handleSubmit = () => {
    if (!formData.name?.trim()) {
      Alert.alert("Name erforderlich", "Bitte gib deinen Namen ein.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateProfile.mutate(formData);
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/onboarding/intents" as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-100 dark:bg-zinc-950">
      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="pb-8">
          <Text className="mb-2 text-center text-3xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
            Erzähl uns von dir
          </Text>
          <Text className="mb-8 px-4 text-center text-base leading-relaxed text-zinc-500 dark:text-zinc-300">
            Diese Informationen helfen anderen, dich besser kennenzulernen
          </Text>

          {/* Name Input */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Wie sollen dich andere nennen? *
            </Text>
            <TextInput
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              placeholder="Dein Name"
              placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
            />
          </View>

          {/* Gender Selection */}
          <View className="mb-8">
            <Text className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Geschlecht (optional)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {genders.map((gender) => {
                const isSelected = formData.gender === gender;
                return (
                  <Button
                    key={gender}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFormData((prev) => ({ ...prev, gender }));
                    }}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                  >
                    <Text
                      className={
                        isSelected
                          ? "text-sm font-medium text-white"
                          : "text-sm font-medium text-zinc-700 dark:text-zinc-300"
                      }
                    >
                      {genderMap[gender]}
                    </Text>
                  </Button>
                );
              })}
            </View>
          </View>

          {/* Info Box */}
          <View className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/40 dark:bg-indigo-500/10 shadow-sm">
            <View className="flex-row items-start gap-3">
              <View className="mt-0.5">
                <Icon
                  name="questionmark.circle"
                  size={18}
                  color={isDark ? "#818cf8" : "#4f46e5"}
                />
              </View>
              <Text className="flex-1 text-sm leading-relaxed text-indigo-700 dark:text-indigo-300">
                Du kannst diese Informationen jederzeit in den Einstellungen
                ändern. Deine Privatsphäre-Einstellungen bestimmen, was andere
                sehen können.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="border-t border-t-zinc-200 px-6 pb-6 pt-4 dark:border-t-zinc-800">
        <Button
          onPress={handleSubmit}
          disabled={updateProfile.isPending}
          variant="default"
          size="lg"
          className="py-4 h-14"
        >
          {updateProfile.isPending ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="white" size="small" />
              <Text className="text-lg font-semibold text-white">
                Speichere...
              </Text>
            </View>
          ) : (
            <Text className="text-lg font-semibold text-white">Weiter</Text>
          )}
        </Button>

        <Button onPress={handleSkip} variant="ghost" className="mt-3">
          <Text className="text-base font-medium text-zinc-500 dark:text-zinc-400">
            Überspringen
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
