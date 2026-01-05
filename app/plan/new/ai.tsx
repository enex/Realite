import { client } from "@/client/orpc";
import { Button } from "@/components/ui/button";
import Page from "@/components/ui/page";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocation } from "@/hooks/use-location";
import { HeaderButton } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AIPlanCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialText?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";

  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const toaster = useToast();

  const { latitude, longitude, hasPermission } = useLocation();

  const canSubmit = useMemo(
    () => Boolean(text.trim()) && !isLoading,
    [text, isLoading]
  );

  useEffect(() => {
    const initial =
      typeof params.initialText === "string" ? params.initialText : "";
    if (!initial.trim()) return;
    setText(initial);
  }, [params.initialText]);

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
      toaster.warning("Bitte gib ein, was du tun möchtest");
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

      toaster.error(
        "Konnte keinen Plan aus deiner Anfrage erstellen",
        "Bitte versuch es erneut"
      );
    } catch (error) {
      console.error("Error creating AI plan:", error);
      toaster.error("Etwas ist schiefgelaufen. Bitte versuch es erneut.");
    } finally {
      setIsLoading(false);
    }
  }, [text, hasPermission, latitude, longitude, goToEdit, toaster]);

  const headerTitle = "Plan erstellen";
  const insets = useSafeAreaInsets();

  return (
    <Page
      keyboardShouldPersistTaps="handled"
      bottom={
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: 16,
            paddingBottom: 16 + insets.bottom,
          }}
        >
          <Button onPress={dismiss} variant="secondary">
            Abbrechen
          </Button>
          <View style={{ flex: 1 }} />
          <Button onPress={handleSubmit} loading={isLoading}>
            Erstellen
          </Button>
        </View>
      }
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
    </Page>
  );
}
