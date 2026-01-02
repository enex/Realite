import { client } from "@/client/orpc";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useLocation } from "@/hooks/useLocation";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    [text, isLoading],
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
    [router],
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
        "Konnte keinen Plan aus deiner Anfrage erstellen. Bitte versuch es erneut.",
      );
    } catch (error) {
      console.error("Error creating AI plan:", error);
      Alert.alert(
        "Fehler",
        "Etwas ist schiefgelaufen. Bitte versuch es erneut.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [text, hasPermission, latitude, longitude, goToEdit]);

  const headerTitle = "Plan erstellen";

  return (
    <SafeAreaView className="flex-1 bg-zinc-100 dark:bg-zinc-950">
      <Stack.Screen
        options={{
          title: headerTitle,
          headerShown: isIOS,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: isDark ? "#09090B" : "#FFFFFF" },
          headerTintColor: isDark ? "#FFFFFF" : "#000000",
          headerLeft: () =>
            isIOS ? (
              <Pressable
                onPress={dismiss}
                accessibilityRole="button"
                hitSlop={10}
              >
                <Text className="text-primary text-base">Abbrechen</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={dismiss}
                accessibilityRole="button"
                hitSlop={10}
              >
                <Icon
                  name="xmark"
                  size={22}
                  color={isDark ? "#FFFFFF" : "#000000"}
                />
              </Pressable>
            ),
          headerRight: () =>
            isIOS ? (
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                accessibilityRole="button"
                hitSlop={10}
                style={{ opacity: canSubmit ? 1 : 0.4 }}
              >
                {isLoading ? (
                  <ActivityIndicator color={isDark ? "#FFFFFF" : "#000000"} />
                ) : (
                  <Text className="text-primary text-base font-semibold">
                    Erstellen
                  </Text>
                )}
              </Pressable>
            ) : null,
        }}
      />

      {!isIOS && (
        <View className="h-14 flex-row items-center border-b border-b-zinc-200 bg-zinc-100 px-4 dark:border-b-zinc-800 dark:bg-zinc-950">
          <Pressable
            onPress={dismiss}
            accessibilityRole="button"
            hitSlop={10}
            android_ripple={{
              color: isDark ? "#27272a" : "#e5e7eb",
              borderless: true,
            }}
            style={{ padding: 8, marginLeft: -8 }}
          >
            <Icon
              name="xmark"
              size={22}
              color={isDark ? "#FFFFFF" : "#000000"}
            />
          </Pressable>
          <Text className="ml-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {headerTitle}
          </Text>
        </View>
      )}

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: isIOS ? 16 : 20,
          paddingBottom: 24,
        }}
      >
        <View className="mb-5">
          <Text variant="h3" className="mb-1.5 text-zinc-900 dark:text-zinc-50">
            Was möchtest du tun?
          </Text>
          <Text className="text-base leading-6 text-zinc-600 dark:text-zinc-300">
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

      {!isIOS && (
        <View className="border-t border-t-zinc-200 bg-zinc-100 px-4 pb-6 pt-3 dark:border-t-zinc-800 dark:bg-zinc-950">
          <View className="flex-row items-center justify-end gap-3">
            <Button variant="ghost" onPress={dismiss} disabled={isLoading}>
              <Text className="text-zinc-600 dark:text-zinc-300">
                Abbrechen
              </Text>
            </Button>
            <Button
              variant="default"
              onPress={handleSubmit}
              disabled={!canSubmit}
              className="flex-row items-center gap-2 px-5"
            >
              {isLoading ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white">Erstelle...</Text>
                </>
              ) : (
                <>
                  <Icon name="sparkles" size={16} color="white" />
                  <Text className="text-white">Mit KI erstellen</Text>
                </>
              )}
            </Button>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
