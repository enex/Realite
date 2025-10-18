import rpc from "@/client/orpc";
import { genders, relationshipStatuses } from "@/shared/validation";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useFeatureFlag } from "posthog-react-native";
import { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function ProfileScreen() {
  const router = useRouter();
  const simpleAppBar = useFeatureFlag("simple-appbar-for-starpage");
  const me = useQuery(rpc.auth.me.queryOptions());

  const [name, setName] = useState<string | null>(null);

  const GENDER_LABEL: Record<string, string> = {
    MALE: "Männlich",
    FEMALE: "Weiblich",
    NON_BINARY: "Nicht-binär",
    OTHER: "Andere",
    PREFER_NOT_TO_SAY: "Keine Angabe",
  };

  const REL_LABEL: Record<string, string> = {
    SINGLE: "Single",
    IN_RELATIONSHIP: "In Beziehung",
    MARRIED: "Verheiratet",
    PREFER_NOT_TO_SAY: "Keine Angabe",
    COMPLICATED: "Es ist kompliziert",
  };

  const queryClient = useQueryClient();

  const update = useMutation(
    rpc.user.update.mutationOptions({
      onMutate: (data) => {
        const old = queryClient.getQueryData(rpc.auth.me.key());
        queryClient.setQueryData(rpc.auth.me.key(), (old: any) => {
          console.log("old", old, data);
          const res = {
            ...old,
            ...data,
            privacySettings: {
              ...(old?.privacySettings ?? {}),
              ...(data.privacySettings ?? {}),
            },
          };
          console.log("res", res);
          return res;
        });
        return { old };
      },
      onSuccess: () => {
        queryClient.refetchQueries({ queryKey: rpc.auth.me.key() });
      },
      onError: (e, _, ctx) => {
        // Suppress noisy alerts for validation failures during autosave
        const msg = e.message || "";
        if (msg.toLowerCase().includes("validation")) {
          console.warn("Profile autosave validation:", msg);
          return;
        }
        Alert.alert("Fehler", msg);
        if (ctx?.old) {
          queryClient.setQueryData(rpc.auth.me.key(), ctx.old);
        }
      },
    })
  );

  const openNotificationSettings = async () => {
    try {
      if (Platform.OS === "ios") {
        await Linking.openURL("app-settings:");
      } else {
        await Linking.openSettings();
      }
    } catch {
      Alert.alert(
        "Hinweis",
        "Bitte öffne die System-Einstellungen und erlaube Benachrichtigungen für diese App."
      );
    }
  };

  const content = (
    <View className="px-6 pt-4 flex-col gap-y-8">
      <View className="items-center">
        <View className="h-24 w-24 rounded-full bg-white dark:bg-gray-700 items-center justify-center mb-3">
          <ThemedText className="text-3xl">👤</ThemedText>
        </View>
      </View>

      <View className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-700 p-5 shadow-sm">
        <ThemedText
          type="subtitle"
          className="text-zinc-900 dark:text-zinc-50 mb-4"
        >
          Basisdaten
        </ThemedText>

        <View className="mb-4">
          <ThemedText className="mb-2 text-zinc-600 dark:text-zinc-400">
            Name
          </ThemedText>
          <TextInput
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-zinc-900 dark:text-zinc-50"
            placeholder="Dein Name"
            placeholderTextColor={Platform.OS === "ios" ? undefined : "#9CA3AF"}
            value={name ?? me.data?.name ?? ""}
            onChangeText={(text) => setName(text)}
            onBlur={() => {
              if (name) {
                update.mutate({ name: name ?? undefined });
              }
            }}
          />
        </View>

        <View className="mb-4">
          <ThemedText className="mb-2 text-zinc-600 dark:text-zinc-400">
            Telefonnummer
          </ThemedText>
          <View className="flex-row items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
            <ThemedText className="text-gray-900 dark:text-white">
              {me.data?.phoneNumber || "—"}
            </ThemedText>
            <Link href="/auth/change-phone" asChild>
              <Pressable className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5">
                <Text className="text-primary">Ändern</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View className="mb-4">
          <ThemedText className="mb-2 text-gray-600 dark:text-gray-400">
            Geschlecht
          </ThemedText>
          <View className="flex-row flex-wrap gap-2">
            {genders.map((g) => (
              <Pressable
                key={g}
                onPress={() => {
                  update.mutate({ gender: g });
                }}
                className={`rounded-xl border px-3 py-2 ${me.data?.gender === g ? "bg-primary border-primary" : "bg-transparent dark:border-zinc-50 border-zinc-700"}`}
              >
                <Text
                  className={
                    me.data?.gender === g
                      ? "text-primary-foreground"
                      : "text-zinc-900 dark:text-zinc-50"
                  }
                >
                  {GENDER_LABEL[g]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <BirthdateField
          value={me.data?.birthDate}
          onChange={(v) => update.mutate({ birthDate: v })}
        />

        <View>
          <ThemedText className="mb-2 text-gray-600 dark:text-gray-400">
            Beziehungsstatus
          </ThemedText>
          <View className="flex-row flex-wrap gap-2">
            {relationshipStatuses.map((rs) => (
              <Pressable
                key={rs}
                onPress={() => update.mutate({ relationshipStatus: rs })}
                className={`rounded-xl border px-3 py-2 ${me.data?.relationshipStatus === rs ? "bg-primary border-primary" : "border-separate bg-transparent dark:border-zinc-50 border-zinc-700"}`}
              >
                <Text
                  className={
                    me.data?.relationshipStatus === rs
                      ? "text-primary-foreground"
                      : "text-zinc-900 dark:text-zinc-50"
                  }
                >
                  {REL_LABEL[rs]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 p-5 shadow-sm">
        <ThemedText
          type="subtitle"
          className="text-gray-900 dark:text-white mb-4"
        >
          Sichtbarkeit
        </ThemedText>
        <ToggleRow
          label="Geschlecht anzeigen"
          value={me.data?.privacySettings?.showGender ?? true}
          onChange={(v) =>
            update.mutate({ privacySettings: { showGender: v } })
          }
        />
        <ToggleRow
          label="Alter anzeigen"
          value={me.data?.privacySettings?.showAge ?? true}
          onChange={(v) => update.mutate({ privacySettings: { showAge: v } })}
        />
        <ToggleRow
          label="Beziehungsstatus anzeigen"
          value={me.data?.privacySettings?.showRelationshipStatus ?? true}
          onChange={(v) =>
            update.mutate({
              privacySettings: { showRelationshipStatus: v },
            })
          }
        />
      </View>

      <View className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 p-5 shadow-sm">
        <ThemedText
          type="subtitle"
          className="text-gray-900 dark:text-white mb-2"
        >
          Benachrichtigungen
        </ThemedText>
        <ThemedText className="mb-3 text-gray-600 dark:text-gray-400">
          Push-Benachrichtigungen können in den System-Einstellungen verwaltet
          werden.
        </ThemedText>
        <Pressable
          onPress={openNotificationSettings}
          className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3"
        >
          <Text className="text-primary">Benachrichtigungen verwalten</Text>
        </Pressable>
      </View>

      <View className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 p-5 shadow-sm">
        <ThemedText
          type="subtitle"
          className="text-gray-900 dark:text-white mb-2"
        >
          Onboarding
        </ThemedText>
        <ThemedText className="mb-3 text-gray-600 dark:text-gray-400">
          Wiederhole das Onboarding, um deine Einstellungen und Berechtigungen
          zu konfigurieren.
        </ThemedText>
        <Pressable
          onPress={() => router.push("/onboarding/welcome")}
          className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3"
        >
          <Text className="text-primary">Onboarding wiederholen</Text>
        </Pressable>
      </View>

      <View className="opacity-80">
        <ThemedText className="text-center text-gray-500 dark:text-gray-400">
          Änderungen werden automatisch gespeichert
        </ThemedText>
      </View>

      <View className="pb-8" />
    </View>
  );

  // Simple app bar version
  if (simpleAppBar) {
    return (
      <ScrollView
        className="flex-1 bg-zinc-100 dark:bg-zinc-950"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
      >
        {content}
      </ScrollView>
    );
  }

  // Original complex app bar version
  return (
    <SafeAreaView className="flex-1 bg-zinc-100 dark:bg-zinc-950">
      <ThemedView className="flex-1 bg-zinc-100 dark:bg-zinc-950">
        <View className="px-6 pt-2 pb-4 bg-zinc-100 dark:bg-zinc-950">
          <Text
            className="text-zinc-900 dark:text-zinc-50"
            style={{
              fontSize: 34,
              fontWeight: "700",
              lineHeight: 41,
              marginBottom: 4,
            }}
          >
            Profil
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 20, color: "#8E8E93" }}>
            Persönliche Daten und Einstellungen
          </Text>
        </View>

        <ScrollView
          className="flex-1 bg-zinc-100 dark:bg-zinc-950"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {content}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <ThemedText className="text-gray-700 dark:text-gray-300">
        {label}
      </ThemedText>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#D1D5DB", true: "#6366F1" }}
        thumbColor={
          Platform.OS === "android"
            ? value
              ? "#ffffff"
              : "#f4f4f5"
            : undefined
        }
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  );
}

function BirthdateField({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = useMemo(() => {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  return (
    <View className="mb-4">
      <ThemedText className="mb-2 text-gray-600 dark:text-gray-400">
        Geburtstag
      </ThemedText>
      <Pressable
        onPress={() => setOpen(true)}
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3"
      >
        <ThemedText className="text-gray-900 dark:text-white">
          {date ? date.toLocaleDateString() : "Auswählen"}
        </ThemedText>
      </Pressable>

      {open && (
        <View className="mt-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
          <DateTimePicker
            value={date ?? new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "calendar"}
            maximumDate={new Date()}
            onChange={(_, selectedDate) => {
              if (!selectedDate) return;
              const iso = selectedDate.toISOString().slice(0, 10);
              onChange(iso);
            }}
          />
          <View className="mt-3 flex-row justify-between">
            <Pressable
              onPress={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className="rounded-lg bg-muted px-4 py-2"
            >
              <ThemedText className="text-foreground">Entfernen</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setOpen(false)}
              className="rounded-lg bg-blue-600 px-4 py-2"
            >
              <ThemedText className="text-white">Fertig</ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
