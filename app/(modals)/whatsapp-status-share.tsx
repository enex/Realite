import { useMutation } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import rpc from "@/client/orpc";
import { Icon } from "@/components/ui/Icon";
import { Button, buttonTextVariants } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

function useSurfaceParam() {
  const params = useLocalSearchParams();
  const raw = params?.surface;
  const surface = Array.isArray(raw) ? raw[0] : raw;
  if (surface === "plans" || surface === "profile") return surface;
  return "unknown" as const;
}

export default function WhatsAppStatusShareModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const surface = useSurfaceParam();

  const track = useMutation(
    rpc.user.trackWhatsAppStatusShareReminderEvent.mutationOptions(),
  );
  const getShareLink = useMutation(rpc.user.getShareLink.mutationOptions());

  const didTrackShownRef = useRef(false);

  useEffect(() => {
    if (didTrackShownRef.current) return;
    didTrackShownRef.current = true;
    track.mutate({ action: "shown", surface });
  }, [track, surface]);

  const title = "Teile deine Pläne im WhatsApp-Status";
  const body = useMemo(
    () =>
      "Dauert 5 Sekunden. Mehr Sichtbarkeit → mehr Leute, die mitmachen können.",
    [],
  );

  const shareTextPrefix = useMemo(() => "Meine Pläne auf Realite:", []);

  const close = () => router.back();

  const handleLater = async () => {
    track.mutate({ action: "dismissed", surface });
    close();
  };

  const shareMyLink = async () => {
    try {
      const result = await getShareLink.mutateAsync(undefined);
      const shareUrl = result.url;
      const message = `${shareTextPrefix}\n${shareUrl}\n\nMach mit oder schau rein 👇`;

      if (Platform.OS === "web") {
        try {
          if (
            typeof navigator !== "undefined" &&
            navigator.clipboard &&
            navigator.clipboard.writeText
          ) {
            await navigator.clipboard.writeText(message);
            if (typeof window !== "undefined") {
              window.alert("Text wurde in die Zwischenablage kopiert!");
            }
            track.mutate({ action: "shared", surface });
            close();
            return;
          }
        } catch {}

        if (typeof window !== "undefined") {
          window.prompt(
            "Kopiere diesen Text in deinen WhatsApp-Status:",
            message,
          );
        }
        track.mutate({ action: "shared", surface });
        close();
        return;
      }

      try {
        await Share.share({
          message,
          title: "WhatsApp Status",
        });
        track.mutate({ action: "shared", surface });
        close();
      } catch (error: any) {
        if (error?.message !== "User did not share") {
          Alert.alert("Teilen", message);
          track.mutate({ action: "shared", surface });
          close();
        }
      }
    } catch (error: any) {
      Alert.alert(
        "Fehler",
        error?.message || "Link konnte nicht erstellt werden.",
      );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: Platform.OS === "ios",
          title: "WhatsApp-Status",
          headerRight: () => (
            <Pressable
              onPress={handleLater}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ opacity: track.isPending ? 0.6 : 1 }}
              disabled={track.isPending}
            >
              <Icon name="xmark" size={22} color="#6B7280" />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 12) + 24,
          gap: 14,
        }}
      >
        <View className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 p-5">
          <Text className="text-zinc-900 dark:text-zinc-50 font-extrabold text-2xl leading-8">
            {title}
          </Text>
          <Text className="text-zinc-700 dark:text-zinc-200 text-base mt-2">
            {body}
          </Text>
          <View className="flex-row flex-wrap gap-2 mt-4">
            <View className="px-3 py-1 rounded-full bg-white/80 dark:bg-zinc-900/60 border border-emerald-200/60 dark:border-emerald-900/40">
              <Text className="text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                5 Sekunden
              </Text>
            </View>
            <View className="px-3 py-1 rounded-full bg-white/80 dark:bg-zinc-900/60 border border-emerald-200/60 dark:border-emerald-900/40">
              <Text className="text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                mehr Leute sehen dich
              </Text>
            </View>
            <View className="px-3 py-1 rounded-full bg-white/80 dark:bg-zinc-900/60 border border-emerald-200/60 dark:border-emerald-900/40">
              <Text className="text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                leichter Mitmacher finden
              </Text>
            </View>
          </View>
        </View>

        <View className="rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 p-5 gap-3">
          <Text className="text-zinc-900 dark:text-zinc-50 font-bold text-base">
            So geht’s
          </Text>
          <View className="flex-row gap-3 items-start">
            <View className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800 items-center justify-center">
              <Text className="text-zinc-900 dark:text-zinc-50 font-bold text-sm">
                1
              </Text>
            </View>
            <Text className="text-zinc-700 dark:text-zinc-200 text-base flex-1">
              Tippe auf „Jetzt teilen“ und wähle WhatsApp.
            </Text>
          </View>
          <View className="flex-row gap-3 items-start">
            <View className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800 items-center justify-center">
              <Text className="text-zinc-900 dark:text-zinc-50 font-bold text-sm">
                2
              </Text>
            </View>
            <Text className="text-zinc-700 dark:text-zinc-200 text-base flex-1">
              In WhatsApp → Status → Text → einfügen.
            </Text>
          </View>
          <View className="flex-row gap-3 items-start">
            <View className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800 items-center justify-center">
              <Text className="text-zinc-900 dark:text-zinc-50 font-bold text-sm">
                3
              </Text>
            </View>
            <Text className="text-zinc-700 dark:text-zinc-200 text-base flex-1">
              Teilen – fertig.
            </Text>
          </View>
        </View>

        <View className="rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 p-5">
          <Text className="text-zinc-900 dark:text-zinc-50 font-bold text-base">
            Was du teilst
          </Text>
          <Text className="text-zinc-600 dark:text-zinc-300 text-sm mt-2">
            Realite-Link zu deinem Profil/Plänen (Text wird automatisch
            erzeugt).
          </Text>
        </View>

        <View className="mt-2 gap-3">
          <Button
            onPress={shareMyLink}
            variant="default"
            size="lg"
            disabled={getShareLink.isPending}
          >
            <Text
              className={buttonTextVariants({
                variant: "default",
                size: "lg",
              })}
            >
              {getShareLink.isPending ? "Wird erstellt..." : "Jetzt teilen"}
            </Text>
          </Button>

          <Button onPress={handleLater} variant="secondary" size="lg">
            <Text
              className={buttonTextVariants({
                variant: "secondary",
                size: "lg",
              })}
            >
              Später erinnern
            </Text>
          </Button>
        </View>
      </ScrollView>
    </>
  );
}
