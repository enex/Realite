import rpc, { client } from "@/client/orpc";
import { Button, buttonTextVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useLocation } from "@/hooks/useLocation";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function normalizeParam(value: unknown): string | undefined {
  if (Array.isArray(value)) return normalizeParam(value[0]);
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return v ? v : undefined;
}

function buildAiPrompt({ url, text }: { url?: string; text?: string }) {
  const parts = [
    `Erstelle aus folgendem geteilten Inhalt einen Plan.`,
    text,
    url ? `Quelle: ${url}` : null,
  ].filter(Boolean);
  return parts.join("\n\n");
}

export default function ImportShareModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const initialUrl = normalizeParam(params?.url);
  const initialText = normalizeParam(params?.text);
  const initialSource = normalizeParam(params?.source);
  const initialMetaTitle = normalizeParam(params?.metaTitle);
  const initialMetaDescription = normalizeParam(params?.metaDescription);

  const [url, setUrl] = useState(initialUrl ?? "");
  const [text, setText] = useState(initialText ?? "");
  const [isLoading, setIsLoading] = useState(false);

  const { latitude, longitude, hasPermission } = useLocation();

  const receiveShare = useMutation(rpc.share.receive.mutationOptions());

  const canSubmit = useMemo(() => {
    const hasAny = Boolean(url.trim()) || Boolean(text.trim());
    return hasAny && !isLoading;
  }, [url, text, isLoading]);

  const didAutoRunRef = useRef(false);
  const didAutoRunThisOpenRef = useRef(false);

  const close = () => router.back();

  const goToEdit = (plan: any) => {
    const target = {
      pathname: "/plan/new/edit",
      params: { planData: JSON.stringify(plan) },
    } as any;

    if (Platform.OS !== "web") {
      router.back();
      setTimeout(() => router.push(target), 0);
      return;
    }
    router.push(target);
  };

  const handleImport = async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const urlTrimmed = url.trim() || undefined;
    const textTrimmed = text.trim() || undefined;
    const source =
      initialSource === "instagram" ||
      initialSource === "browser" ||
      initialSource === "whatsapp" ||
      initialSource === "other"
        ? initialSource
        : "unknown";

    try {
      await receiveShare.mutateAsync({
        url: urlTrimmed,
        text: textTrimmed,
        meta:
          initialMetaTitle || initialMetaDescription
            ? {
                title: initialMetaTitle || undefined,
                description: initialMetaDescription || undefined,
              }
            : undefined,
        source,
      });

      const enrichedText = [
        initialMetaTitle ? `Titel: ${initialMetaTitle}` : null,
        initialMetaDescription
          ? `Beschreibung: ${initialMetaDescription}`
          : null,
        textTrimmed || null,
      ]
        .filter(Boolean)
        .join("\n");

      const ai = await client.plan.withAI({
        text: buildAiPrompt({ url: urlTrimmed, text: enrichedText }),
        location: hasPermission
          ? {
              latitude,
              longitude,
              radius: 50000,
            }
          : undefined,
      });

      if (!ai?.plan) {
        Alert.alert(
          "Fehler",
          "Konnte keinen Plan aus dem Inhalt erstellen. Versuch es mit mehr Kontext oder einem anderen Link."
        );
        return;
      }

      const draft = {
        ...ai.plan,
        url: urlTrimmed || (ai.plan as any).url || undefined,
        inputText: buildAiPrompt({ url: urlTrimmed, text: enrichedText }),
        maybe: true,
      };

      setUrl("");
      setText("");
      goToEdit(draft);
    } catch (error: any) {
      console.error("Import share failed", error);
      Alert.alert("Fehler", error?.message || "Import ist fehlgeschlagen.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (didAutoRunRef.current) return;
    if (!initialUrl && !initialText) return;
    didAutoRunRef.current = true;
    didAutoRunThisOpenRef.current = true;
    handleImport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sourceLabel =
    initialSource === "instagram"
      ? "Instagram erkannt"
      : initialSource === "whatsapp"
        ? "WhatsApp erkannt"
        : initialSource === "browser"
          ? "Link erkannt"
          : "Geteilter Inhalt erkannt";

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: Platform.OS === "ios",
          title: "Teilen → Plan",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: isDark ? "#09090B" : "#FFFFFF" },
          headerTintColor: isDark ? "#FFFFFF" : "#000000",
          headerBackVisible: false,
          headerTitleAlign: "center",
          headerLeft: () => (
            <Pressable
              onPress={close}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={{ opacity: isLoading ? 0.6 : 1 }}
              disabled={isLoading}
            >
              <Icon
                name="xmark"
                size={22}
                color={isDark ? "#FFFFFF" : "#6B7280"}
              />
            </Pressable>
          ),
        }}
      />
      {Platform.OS === "android" ? (
        <View className="flex-1 bg-white dark:bg-zinc-950">
          <View
            className="bg-white dark:bg-zinc-950 border-b border-zinc-200/70 dark:border-zinc-800 px-5"
            style={{
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: 12,
            }}
          >
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={close}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={{ opacity: isLoading ? 0.6 : 1 }}
                disabled={isLoading}
              >
                <Icon
                  name="xmark"
                  size={22}
                  color={isDark ? "#FFFFFF" : "#6B7280"}
                />
              </Pressable>
              <Text className="text-zinc-900 dark:text-zinc-50 font-semibold text-base">
                Teilen → Plan
              </Text>
              <View style={{ width: 22 }} />
            </View>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 12) + 24,
              gap: 14,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {isLoading && didAutoRunThisOpenRef.current && (
              <View className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 p-4 flex-row items-center gap-3">
                <ActivityIndicator color="#10B981" />
                <View className="flex-1">
                  <Text className="text-zinc-900 dark:text-zinc-50 font-semibold text-base">
                    {sourceLabel} – analysiere…
                  </Text>
                  <Text className="text-zinc-600 dark:text-zinc-300 text-sm">
                    Wir erstellen gerade einen Plan-Vorschlag.
                  </Text>
                </View>
              </View>
            )}
            <View className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/40 p-5">
              <Text className="text-zinc-900 dark:text-zinc-50 font-extrabold text-2xl leading-8">
                Aus Link/Beitrag automatisch einen Plan erstellen
              </Text>
              <Text className="text-zinc-700 dark:text-zinc-200 text-base mt-2">
                Füge einen Link (z.B. Instagram) oder Text ein – wir lesen ihn
                aus und machen daraus einen Plan.
              </Text>
            </View>

            {(initialMetaTitle || initialMetaDescription) && (
              <View className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 p-5 gap-2">
                <Text className="text-zinc-900 dark:text-zinc-50 font-bold text-base">
                  Vorschau
                </Text>
                {initialMetaTitle && (
                  <Text className="text-zinc-900 dark:text-zinc-50 text-base">
                    {initialMetaTitle}
                  </Text>
                )}
                {initialMetaDescription && (
                  <Text className="text-zinc-600 dark:text-zinc-300 text-sm">
                    {initialMetaDescription}
                  </Text>
                )}
              </View>
            )}

            <View className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 p-4 gap-3">
              <Text className="text-zinc-900 dark:text-zinc-50 font-semibold text-base">
                Link (optional)
              </Text>
              <TextInput
                value={url}
                onChangeText={setUrl}
                placeholder="https://instagram.com/…"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-base text-zinc-900 dark:text-zinc-50"
              />

              <Text className="text-zinc-900 dark:text-zinc-50 font-semibold text-base mt-1">
                Text (optional)
              </Text>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Beschreibung, Caption, Ort/Datum…"
                placeholderTextColor="#9CA3AF"
                multiline
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-base text-zinc-900 dark:text-zinc-50 min-h-[120px]"
                style={{ textAlignVertical: "top" }}
              />
              <Text className="text-zinc-500 dark:text-zinc-400 text-sm">
                Tipp: Link reicht meistens – wir holen Details per Websuche.
              </Text>
            </View>

            <View className="mt-2">
              <Button
                onPress={handleImport}
                variant="default"
                size="lg"
                disabled={!canSubmit}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    className={buttonTextVariants({
                      variant: "default",
                      size: "lg",
                    })}
                  >
                    Plan erstellen
                  </Text>
                )}
              </Button>
            </View>
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12) + 24,
            gap: 14,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading && didAutoRunThisOpenRef.current && (
            <View className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 p-4 flex-row items-center gap-3">
              <ActivityIndicator color="#10B981" />
              <View className="flex-1">
                <Text className="text-zinc-900 dark:text-zinc-50 font-semibold text-base">
                  {sourceLabel} – analysiere…
                </Text>
                <Text className="text-zinc-600 dark:text-zinc-300 text-sm">
                  Wir erstellen gerade einen Plan-Vorschlag.
                </Text>
              </View>
            </View>
          )}
          <View className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/40 p-5">
            <Text className="text-zinc-900 dark:text-zinc-50 font-extrabold text-2xl leading-8">
              Aus Link/Beitrag automatisch einen Plan erstellen
            </Text>
            <Text className="text-zinc-700 dark:text-zinc-200 text-base mt-2">
              Füge einen Link (z.B. Instagram) oder Text ein – wir lesen ihn aus
              und machen daraus einen Plan.
            </Text>
          </View>

          {(initialMetaTitle || initialMetaDescription) && (
            <View className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 p-5 gap-2">
              <Text className="text-zinc-900 dark:text-zinc-50 font-bold text-base">
                Vorschau
              </Text>
              {initialMetaTitle && (
                <Text className="text-zinc-900 dark:text-zinc-50 text-base">
                  {initialMetaTitle}
                </Text>
              )}
              {initialMetaDescription && (
                <Text className="text-zinc-600 dark:text-zinc-300 text-sm">
                  {initialMetaDescription}
                </Text>
              )}
            </View>
          )}

          <View className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 p-4 gap-3">
            <Text className="text-zinc-900 dark:text-zinc-50 font-semibold text-base">
              Link (optional)
            </Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://instagram.com/…"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-base text-zinc-900 dark:text-zinc-50"
            />

            <Text className="text-zinc-900 dark:text-zinc-50 font-semibold text-base mt-1">
              Text (optional)
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Beschreibung, Caption, Ort/Datum…"
              placeholderTextColor="#9CA3AF"
              multiline
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-base text-zinc-900 dark:text-zinc-50 min-h-[120px]"
              style={{ textAlignVertical: "top" }}
            />
            <Text className="text-zinc-500 dark:text-zinc-400 text-sm">
              Tipp: Link reicht meistens – wir holen Details per Websuche.
            </Text>
          </View>

          <View className="mt-2">
            <Button
              onPress={handleImport}
              variant="default"
              size="lg"
              disabled={!canSubmit}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  className={buttonTextVariants({
                    variant: "default",
                    size: "lg",
                  })}
                >
                  Plan erstellen
                </Text>
              )}
            </Button>
          </View>
        </ScrollView>
      )}
    </>
  );
}
