import orpc from "@/client/orpc";
import { ActivityBottomSheet } from "@/components/activity-bottom-sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getActivityLabel, type ActivityId } from "@/shared/activities";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type IntentDraft = {
  id?: string;
  title: string;
  activity: ActivityId;
  visibility: "public" | "contacts";
};

const templates: Array<{ key: string; title: string; activity: ActivityId }> = [
  { key: "bouldern", title: "Bouldern gehen", activity: "sport/climbing" },
  {
    key: "wein",
    title: "Bei einem Glas Wein connecten",
    activity: "food_drink/wine_tasting",
  },
  { key: "essen", title: "Mit Leuten essen gehen", activity: "food_drink/restaurant" },
  { key: "kaffee", title: "Kaffee trinken", activity: "social/coffee_chat" },
  { key: "spiele", title: "Brettspiele spielen", activity: "social/board_games" },
];

export default function IntentsOnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [customIntents, setCustomIntents] = useState<IntentDraft[]>([]);

  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [customActivity, setCustomActivity] = useState<ActivityId | undefined>(
    undefined
  );
  const [customTitle, setCustomTitle] = useState("");

  const drafts: IntentDraft[] = useMemo(() => {
    const picked = templates
      .filter((t) => selected[t.key])
      .map(
        (t): IntentDraft => ({
          title: t.title,
          activity: t.activity,
          visibility: "public",
        })
      );
    return [...picked, ...customIntents];
  }, [selected, customIntents]);

  const save = useMutation(
    orpc.intent.setMine.mutationOptions({
      onSuccess: () => {
        router.push("/onboarding/permissions");
      },
      onError: (error) => {
        console.error(error);
        Alert.alert("Fehler", error.message);
      },
    })
  );

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    save.mutate({ intents: drafts });
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/onboarding/permissions");
  };

  const toggleTemplate = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addCustom = () => {
    if (!customActivity) return;
    const title = customTitle.trim();
    if (!title) {
      Alert.alert("Titel fehlt", "Gib kurz ein, was du vorhast.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCustomIntents((prev) => [
      ...prev,
      { title, activity: customActivity, visibility: "public" },
    ]);
    setCustomTitle("");
    setCustomActivity(undefined);
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-100 dark:bg-zinc-950">
      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="pb-8">
          <Text className="mb-2 text-center text-3xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
            Was hast du vor?
          </Text>
          <Text className="mb-6 px-2 text-center text-base leading-relaxed text-zinc-500 dark:text-zinc-300">
            Wähle ein paar Intentionen aus – wir schlagen dir direkt passende
            konkrete Pläne vor.
          </Text>

          <View className="flex-row flex-wrap gap-2 mb-6 justify-center">
            {templates.map((t) => {
              const isSelected = Boolean(selected[t.key]);
              return (
                <Button
                  key={t.key}
                  onPress={() => toggleTemplate(t.key)}
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
                    {t.title}
                  </Text>
                </Button>
              );
            })}
          </View>

          <View className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <View className="flex-row items-center justify-between gap-3 mb-3">
              <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Eigenes hinzufügen (optional)
              </Text>
              <Button
                size="sm"
                variant="outline"
                onPress={() => setShowActivityPicker(true)}
              >
                <Text className="text-sm">Aktivität wählen</Text>
              </Button>
            </View>

            <Text className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              Aktivität:{" "}
              {customActivity ? getActivityLabel(customActivity) : "—"}
            </Text>

            <TextInput
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              value={customTitle}
              onChangeText={setCustomTitle}
              placeholder="z.B. Heute Abend bouldern gehen"
              placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
            />

            <View className="mt-3 flex-row gap-2">
              <Button
                onPress={addCustom}
                variant="default"
                disabled={!customActivity}
              >
                Hinzufügen
              </Button>
              <View style={{ flex: 1 }} />
              <Button
                onPress={() => {
                  setCustomTitle("");
                  setCustomActivity(undefined);
                }}
                variant="ghost"
              >
                Zurücksetzen
              </Button>
            </View>
          </View>

          {customIntents.length > 0 && (
            <View className="mb-6">
              <Text className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Deine hinzugefügten Intentionen
              </Text>
              <View className="gap-2">
                {customIntents.map((i, idx) => (
                  <Pressable
                    key={`${i.activity}-${idx}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCustomIntents((prev) =>
                        prev.filter((_, j) => j !== idx)
                      );
                    }}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {i.title}
                    </Text>
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                      {getActivityLabel(i.activity)} · Tippen zum Entfernen
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/40 dark:bg-indigo-500/10 shadow-sm">
            <Text className="text-sm leading-relaxed text-indigo-700 dark:text-indigo-300">
              Du kannst deine Intentionen jederzeit in den Einstellungen ändern.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="border-t border-t-zinc-200 px-6 pb-6 pt-4 dark:border-t-zinc-800">
        <Button
          onPress={handleContinue}
          disabled={save.isPending}
          variant="default"
          size="lg"
          className="py-4 h-14"
        >
          {save.isPending ? (
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

      {showActivityPicker && (
        <ActivityBottomSheet
          selected={customActivity}
          onSelect={(id) => {
            setCustomActivity(id);
            setShowActivityPicker(false);
          }}
          onClose={() => setShowActivityPicker(false)}
        />
      )}
    </SafeAreaView>
  );
}

