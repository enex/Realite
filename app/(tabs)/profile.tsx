import rpc from "@/client/orpc";
import { genders, relationshipStatuses } from "@/shared/validation";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function ProfileScreen() {
  const me = useQuery(rpc.auth.me.queryOptions());

  const [name, setName] = useState("");
  const [gender, setGender] = useState<(typeof genders)[number] | undefined>(
    undefined
  );
  const [birthDate, setBirthDate] = useState<string | undefined>(undefined);
  const [relationshipStatus, setRelationshipStatus] = useState<
    (typeof relationshipStatuses)[number] | undefined
  >(undefined);
  const [showGender, setShowGender] = useState(true);
  const [showAge, setShowAge] = useState(true);
  const [showRelationshipStatus, setShowRelationshipStatus] = useState(true);

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

  useEffect(() => {
    if (!me.data) return;
    const raw = me.data as any;
    setName(raw?.name ?? "");
    // sanitize invalid server defaults
    const g = raw?.gender;
    setGender(genders.includes(g) ? g : undefined);
    const rs = raw?.relationshipStatus;
    setRelationshipStatus(relationshipStatuses.includes(rs) ? rs : undefined);
    const bd = raw?.birthDate as string | undefined;
    setBirthDate(
      typeof bd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(bd) ? bd : undefined
    );
    setShowGender((me.data as any)?.privacySettings?.showGender ?? true);
    setShowAge((me.data as any)?.privacySettings?.showAge ?? true);
    setShowRelationshipStatus(
      (me.data as any)?.privacySettings?.showRelationshipStatus ?? true
    );
  }, [me.data]);

  const update = useMutation(
    rpc.user.update.mutationOptions({
      onSuccess: () => {
        // Silent success for autosave
      },
      onError: (e) => {
        // Suppress noisy alerts for validation failures during autosave
        const msg = e.message || "";
        if (msg.toLowerCase().includes("validation")) {
          console.warn("Profile autosave validation:", msg);
          return;
        }
        Alert.alert("Fehler", msg);
      },
    })
  );

  // (Save button removed; autosave handles persistence)

  // Autosave with debounce, avoiding initial load dispatch and duplicate payloads
  const hasLoadedRef = useRef(false);
  const lastSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasLoadedRef.current) {
      // Wait until initial data mounted once to avoid saving server defaults back
      hasLoadedRef.current = true;
      return;
    }

    // Build payload only with valid values
    const payload: Record<string, unknown> = {
      privacySettings: { showGender, showAge, showRelationshipStatus },
    };
    if (name.trim().length > 0) payload.name = name.trim();
    if (gender && genders.includes(gender)) payload.gender = gender;
    if (birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate))
      payload.birthDate = birthDate;
    if (relationshipStatus && relationshipStatuses.includes(relationshipStatus))
      payload.relationshipStatus = relationshipStatus;
    const serialized = JSON.stringify(payload);
    if (serialized === lastSentRef.current) return;

    const t = setTimeout(() => {
      lastSentRef.current = serialized;
      update.mutate(payload as any);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    gender,
    birthDate,
    relationshipStatus,
    showGender,
    showAge,
    showRelationshipStatus,
  ]);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      <ThemedView style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
        <View className="px-6 pt-2 pb-4" style={{ backgroundColor: "#F2F2F7" }}>
          <Text
            style={{
              fontSize: 34,
              fontWeight: "700",
              lineHeight: 41,
              color: "#1C1C1E",
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
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View className="px-6 pt-4 flex-col gap-y-8">
            <View className="items-center">
              <View className="h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center mb-3">
                <ThemedText className="text-3xl">👤</ThemedText>
              </View>
            </View>

            <View className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <ThemedText
                type="subtitle"
                className="text-gray-900 dark:text-white mb-4"
              >
                Basisdaten
              </ThemedText>

              <View className="mb-4">
                <ThemedText className="mb-2 text-gray-600 dark:text-gray-400">
                  Name
                </ThemedText>
                <TextInput
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white"
                  placeholder="Dein Name"
                  placeholderTextColor={
                    Platform.OS === "ios" ? undefined : "#9CA3AF"
                  }
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View className="mb-4">
                <ThemedText className="mb-2 text-gray-600 dark:text-gray-400">
                  Telefonnummer
                </ThemedText>
                <View className="flex-row items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
                  <ThemedText className="text-gray-900 dark:text-white">
                    {(me.data as any)?.phoneNumber || "—"}
                  </ThemedText>
                  <Link href="/profile/change-phone" asChild>
                    <Pressable className="rounded-lg border border-blue-300 dark:border-blue-700/50 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5">
                      <ThemedText className="text-blue-700 dark:text-blue-300">
                        Ändern
                      </ThemedText>
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
                      onPress={() => setGender(g)}
                      className={`rounded-xl border px-3 py-2 ${gender === g ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"}`}
                    >
                      <ThemedText
                        className={
                          gender === g
                            ? "text-white"
                            : "text-gray-800 dark:text-gray-200"
                        }
                      >
                        {GENDER_LABEL[g]}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <BirthdateField value={birthDate} onChange={setBirthDate} />

              <View>
                <ThemedText className="mb-2 text-gray-600 dark:text-gray-400">
                  Beziehungsstatus
                </ThemedText>
                <View className="flex-row flex-wrap gap-2">
                  {relationshipStatuses.map((rs) => (
                    <Pressable
                      key={rs}
                      onPress={() => setRelationshipStatus(rs)}
                      className={`rounded-xl border px-3 py-2 ${relationshipStatus === rs ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"}`}
                    >
                      <ThemedText
                        className={
                          relationshipStatus === rs
                            ? "text-white"
                            : "text-gray-800 dark:text-gray-200"
                        }
                      >
                        {REL_LABEL[rs]}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <ThemedText
                type="subtitle"
                className="text-gray-900 dark:text-white mb-4"
              >
                Sichtbarkeit
              </ThemedText>
              <ToggleRow
                label="Geschlecht anzeigen"
                value={showGender}
                onChange={setShowGender}
              />
              <ToggleRow
                label="Alter anzeigen"
                value={showAge}
                onChange={setShowAge}
              />
              <ToggleRow
                label="Beziehungsstatus anzeigen"
                value={showRelationshipStatus}
                onChange={setShowRelationshipStatus}
              />
            </View>

            <View className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <ThemedText
                type="subtitle"
                className="text-gray-900 dark:text-white mb-2"
              >
                Benachrichtigungen
              </ThemedText>
              <ThemedText className="mb-3 text-gray-600 dark:text-gray-400">
                Push-Benachrichtigungen können in den System-Einstellungen
                verwaltet werden.
              </ThemedText>
              <Pressable
                onPress={openNotificationSettings}
                className="rounded-xl border border-blue-300 dark:border-blue-700/50 bg-blue-50 dark:bg-blue-900/30 px-4 py-3"
              >
                <ThemedText className="text-blue-700 dark:text-blue-300">
                  Benachrichtigungen verwalten
                </ThemedText>
              </Pressable>
            </View>

            <View className="opacity-80">
              <ThemedText className="text-center text-gray-500 dark:text-gray-400">
                Änderungen werden automatisch gespeichert
              </ThemedText>
            </View>

            <View className="pb-8" />
          </View>
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
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        onPress={() => onChange(!value)}
        className={`h-8 w-14 rounded-full ${value ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"} items-${value ? "end" : "start"} justify-center px-1`}
      >
        <View className="h-6 w-6 rounded-full bg-white dark:bg-gray-200" />
      </Pressable>
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
