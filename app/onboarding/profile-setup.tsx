import orpc from "@/client/orpc";
import type { UpdateUserInput } from "@/server/router/user";
import { genders } from "@/shared/validation";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const genderMap = {
  MALE: "Männlich",
  FEMALE: "Weiblich",
  NON_BINARY: "Nicht-Binär",
  OTHER: "Andere",
  PREFER_NOT_TO_SAY: "Keine Angabe",
};

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [formData, setFormData] = useState<UpdateUserInput>({
    name: "",
    gender: undefined,
  });

  const updateProfile = useMutation(
    orpc.user.update.mutationOptions({
      onSuccess: () => {
        router.push("/onboarding/calendar-sync" as never);
      },
      onError: (error) => {
        Alert.alert("Fehler", error.message);
      },
    })
  );

  const handleSubmit = () => {
    if (!formData.name?.trim()) {
      Alert.alert("Name erforderlich", "Bitte gib deinen Namen ein.");
      return;
    }

    updateProfile.mutate(formData);
  };

  const handleSkip = () => {
    router.push("/onboarding/calendar-sync" as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6">
        <View className="py-6">
          <Text className="mb-2 text-center text-2xl font-bold text-foreground">
            Erzähl uns von dir
          </Text>
          <Text className="mb-8 text-center text-muted-foreground">
            Diese Informationen helfen anderen, dich besser kennenzulernen
          </Text>

          {/* Name Input */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-foreground">
              Wie sollen dich andere nennen? *
            </Text>
            <TextInput
              className="rounded-lg border border-input bg-background px-4 py-3 text-foreground"
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              placeholder="Dein Name"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
            />
          </View>

          {/* Gender Selection */}
          <View className="mb-8">
            <Text className="mb-3 text-sm font-medium text-foreground">
              Geschlecht (optional)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {genders.map((gender) => (
                <Pressable
                  key={gender}
                  onPress={() => setFormData((prev) => ({ ...prev, gender }))}
                  className={`rounded-full px-4 py-2 ${
                    formData.gender === gender ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      formData.gender === gender
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {genderMap[gender]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Info Box */}
          <View className="mb-8 rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
            <View className="flex-row items-start">
              <MaterialIcons
                name="info"
                size={20}
                color={isDark ? "#60A5FA" : "#3B82F6"}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text className="flex-1 text-sm text-blue-700 dark:text-blue-300">
                Du kannst diese Informationen jederzeit in den Einstellungen
                ändern. Deine Privatsphäre-Einstellungen bestimmen, was andere
                sehen können.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="flex flex-col gap-3 px-6 pb-6">
        <Pressable
          onPress={handleSubmit}
          disabled={updateProfile.isPending}
          className="items-center rounded-lg bg-primary px-6 py-4"
        >
          <Text className="text-lg font-semibold text-primary-foreground">
            {updateProfile.isPending ? "Speichere..." : "Weiter"}
          </Text>
        </Pressable>

        <Pressable onPress={handleSkip} className="items-center px-6 py-3">
          <Text className="text-muted-foreground">Überspringen</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
