import orpc from "@/client/orpc";
import { ActivityBottomSheet } from "@/components/activity-bottom-sheet";
import { Button } from "@/components/ui/button";
import Page from "@/components/ui/page";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getActivityLabel, type ActivityId } from "@/shared/activities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";

type IntentDraft = {
  id?: string;
  title: string;
  description?: string;
  activity: ActivityId;
  visibility: "public" | "contacts";
};

export default function IntentsSettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const queryClient = useQueryClient();
  const mine = useQuery(orpc.intent.listMine.queryOptions());
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [activity, setActivity] = useState<ActivityId | undefined>(undefined);
  const [title, setTitle] = useState("");

  const drafts = useMemo<IntentDraft[]>(() => {
    const intents = mine.data?.intents ?? [];
    return intents.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description ?? undefined,
      activity: i.activity as ActivityId,
      visibility: (i.visibility as any) ?? "public",
    }));
  }, [mine.data?.intents]);

  const save = useMutation(
    orpc.intent.setMine.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.intent.listMine.key(),
        } as any);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: (error) => {
        console.error(error);
        Alert.alert("Fehler", error.message);
      },
    })
  );

  const canAdd = useMemo(
    () => Boolean(activity) && Boolean(title.trim()),
    [activity, title]
  );

  const handleAdd = () => {
    if (!activity) return;
    const t = title.trim();
    if (!t) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    save.mutate({
      intents: [...drafts, { title: t, activity, visibility: "public" }],
    });
    setTitle("");
    setActivity(undefined);
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    save.mutate({ intents: drafts });
  };

  return (
    <Page>
      <Stack.Screen options={{ title: "Intentionen" }} />

      <Text variant="heading" className="mb-2">
        Deine Intentionen
      </Text>
      <Text className="mb-4 text-zinc-600 dark:text-zinc-300">
        Diese helfen dabei, passende Menschen und Plan-Vorschläge zu finden.
      </Text>

      <View className="gap-2 mb-4">
        {drafts.length === 0 ? (
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            Noch keine Intentionen. Füge unten eine hinzu.
          </Text>
        ) : (
          drafts.map((i, idx) => (
            <Pressable
              key={i.id ?? `${i.activity}-${idx}`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                save.mutate({ intents: drafts.filter((_, j) => j !== idx) });
              }}
              disabled={save.isPending}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {i.title}
              </Text>
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                {getActivityLabel(i.activity)} · Tippen zum Entfernen
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <View className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
          Neue Intention hinzufügen
        </Text>
        <View className="flex-row items-center justify-between gap-3 mb-2">
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            Aktivität: {activity ? getActivityLabel(activity) : "—"}
          </Text>
          <Button
            size="sm"
            variant="outline"
            onPress={() => setShowActivityPicker(true)}
          >
            <Text className="text-sm">Auswählen</Text>
          </Button>
        </View>
        <TextInput
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          value={title}
          onChangeText={setTitle}
          placeholder="z.B. Diese Woche bouldern gehen"
          placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
        />
        <View className="mt-3 flex-row gap-2">
          <Button onPress={handleAdd} variant="default" disabled={!canAdd}>
            Hinzufügen
          </Button>
          <View style={{ flex: 1 }} />
          <Button
            onPress={() => {
              setTitle("");
              setActivity(undefined);
            }}
            variant="ghost"
          >
            Zurücksetzen
          </Button>
        </View>
      </View>

      <View className="mt-4 flex-row gap-2">
        <Button variant="outline" onPress={() => router.back()}>
          Zurück
        </Button>
        <View style={{ flex: 1 }} />
        <Button onPress={handleSave} loading={save.isPending}>
          Speichern
        </Button>
      </View>

      {showActivityPicker && (
        <ActivityBottomSheet
          selected={activity}
          onSelect={(id) => {
            setActivity(id);
            setShowActivityPicker(false);
          }}
          onClose={() => setShowActivityPicker(false)}
        />
      )}
    </Page>
  );
}
