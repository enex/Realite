import { client } from "@/client/orpc";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useLocation } from "@/hooks/useLocation";
import { HeaderButton } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Platform, ScrollView, TextInput, View } from "react-native";

export default function AIPlanCreateScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";

  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  const { latitude, longitude, hasPermission } = useLocation();

  const canSubmit = useMemo(
    () => Boolean(text.trim()) && !isLoading,
    [text, isLoading]
  );

  const dismiss = useCallback(() => {
    router.back();
  }, [router]);

  const goToEdit = useCallback(
    (plan: any) => {
      const target = {
        pathname: "/plan/new/edit",
        params: { planData: JSON.stringify(plan) },
      } as any;

      // Close modal/formSheet first, then navigate to edit screen.
      if (Platform.OS !== "web") {
        router.back();
        setTimeout(() => router.push(target), 0);
        return;
      }

      router.push(target);
    },
    [router]
  );

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) {
      Alert.alert("Bitte gib ein, was du tun möchtest");
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await client.plan.withAI({
        text: text.trim(),
        location: hasPermission
          ? {
              latitude,
              longitude,
              radius: 50000,
            }
          : undefined,
      });

      if (result.plan) {
        setText("");
        goToEdit(result.plan);
        return;
      }

      Alert.alert(
        "Fehler",
        "Konnte keinen Plan aus deiner Anfrage erstellen. Bitte versuch es erneut."
      );
    } catch (error) {
      console.error("Error creating AI plan:", error);
      Alert.alert(
        "Fehler",
        "Etwas ist schiefgelaufen. Bitte versuch es erneut."
      );
    } finally {
      setIsLoading(false);
    }
  }, [text, hasPermission, latitude, longitude, goToEdit]);

  const headerTitle = "Plan erstellen";

  return (
    <ScrollView
      className="flex-1"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: isIOS ? 16 : 20,
        paddingBottom: 24,
      }}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen
        options={{
          title: headerTitle,
          headerShown: isIOS,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: isDark ? "#09090B" : "#FFFFFF" },
          headerTintColor: isDark ? "#FFFFFF" : "#000000",
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: true,
          headerLeft: () => (
            <HeaderButton onPress={dismiss}>
              <Text>Abbrechen</Text>
            </HeaderButton>
          ),
          headerRight: () => (
            <HeaderButton disabled={!canSubmit} onPress={handleSubmit}>
              <Text>Erstellen</Text>
            </HeaderButton>
          ),
        }}
      />
      <View className="mb-5">
        <Text variant="heading">Was möchtest du tun?</Text>
        <Text>
          Beschreibe kurz deine Idee – wir erstellen daraus einen Plan.
        </Text>
      </View>
      <TextInput
        ref={textInputRef}
        className="mb-3 min-h-[140px] rounded-2xl border border-zinc-200 bg-white p-4 text-base text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
        style={{ textAlignVertical: "top" }}
        placeholder="z.B. Ich möchte dieses Wochenende mit Freunden wandern gehen oder ein gemütliches Abendessen zu Hause haben..."
        placeholderTextColor={isDark ? "#71717a" : "#8E8E93"}
        multiline
        value={text}
        onChangeText={setText}
        maxLength={500}
        autoFocus
        textContentType="none"
        autoCorrect
        autoCapitalize="sentences"
        blurOnSubmit={false}
      />

      <Text className="text-right text-sm text-zinc-500 dark:text-zinc-400">
        {text.length}/500
      </Text>
    </ScrollView>
  );
}
