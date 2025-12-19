import { useSignOut } from "@/client/auth";
import rpc from "@/client/orpc";
import { useFeatureFlagBoolean } from "@/hooks/useFeatureFlag";
import { genders, relationshipStatuses } from "@/shared/validation";
import { isDefinedError } from "@orpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BirthdateField } from "@/components/BirthdateField";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ToggleRow } from "@/components/ToggleRow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { GradientBackdrop } from "@/components/ui/gradient-backdrop";

export default function ProfileScreen() {
  const router = useRouter();
  const signOut = useSignOut();
  const simpleAppBar = useFeatureFlagBoolean(
    "simple-appbar-for-starpage",
    false
  );
  const me = useQuery(rpc.auth.me.queryOptions());
  const avatarUploadViaServer = useMutation(
    rpc.user.uploadAvatar.mutationOptions()
  );
  const getShareLink = useMutation(rpc.user.getShareLink.mutationOptions());
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

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

  const pickAndUploadAvatar = async () => {
    try {
      setIsUploadingAvatar(true);

      const showError = (message: string) => {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.alert(message);
          return;
        }
        Alert.alert("Fehler", message);
      };

      if (Platform.OS === "web") {
        const file = await new Promise<File | null>((resolve) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.onchange = () => resolve(input.files?.[0] ?? null);
          input.click();
        });

        if (!file) return;
        const contentType = file.type || "image/jpeg";
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(file);
        });

        const res = await avatarUploadViaServer.mutateAsync({
          dataUrl,
          contentType,
        });
        queryClient.setQueryData(rpc.auth.me.key(), (old: any) => ({
          ...old,
          image: res.publicUrl,
        }));
        await queryClient.invalidateQueries({ queryKey: rpc.auth.me.key() });
        return;
      }

      const ImagePickerModule = await import("expo-image-picker");
      const ImagePicker = ImagePickerModule.default || ImagePickerModule;

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError(
          "Bitte erlaube den Zugriff auf deine Fotos, um ein Profilbild auszuwählen."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      const contentType = asset.mimeType || "image/jpeg";

      // Read file as base64 using native expo-file-system (legacy API)
      // We cannot use z.file() here due to an incompatibility between Expo/React Native
      // and oRPC's file handling. oRPC's FormData serialization tries to set the 'name'
      // property on File/Blob objects, but Expo's polyfill only provides a getter,
      // causing "Cannot assign to property 'name' which has only a getter" errors.
      // Using base64 data URLs works reliably across all platforms.
      const FileSystemLegacy = await import("expo-file-system/legacy");
      const base64 = await FileSystemLegacy.readAsStringAsync(asset.uri, {
        encoding: FileSystemLegacy.EncodingType.Base64,
      });
      const dataUrl = `data:${contentType};base64,${base64}`;

      // Upload via server (ORPC) - server handles S3 upload
      const res = await avatarUploadViaServer.mutateAsync({
        dataUrl,
        contentType,
      });

      queryClient.setQueryData(rpc.auth.me.key(), (old: any) => ({
        ...old,
        image: res.publicUrl,
      }));
      await queryClient.invalidateQueries({ queryKey: rpc.auth.me.key() });
    } catch (e: any) {
      console.error("Avatar upload failed:", e);
      if (isDefinedError(e) && e.code === "MISCONFIGURED") {
        Alert.alert(
          "Upload nicht verfügbar",
          "Der Server ist noch nicht für S3 konfiguriert (S3_BUCKET/S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY). Optional: S3_OBJECT_ACL, S3_CACHE_CONTROL, S3_PATH_STYLE."
        );
        return;
      }
      Alert.alert(
        "Fehler",
        e?.message || "Profilbild konnte nicht gespeichert werden."
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const content = (
    <View className="px-6 pt-4 flex-col gap-y-8">
      <Card className="rounded-3xl p-5 shadow-sm">
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={pickAndUploadAvatar}
            className="relative"
            accessibilityRole="button"
            accessibilityLabel="Profilbild ändern"
          >
            <View className="h-24 w-24 rounded-full overflow-hidden border border-white/30 dark:border-white/15 bg-white/50 dark:bg-white/10 items-center justify-center">
              {me.data?.image ? (
                <Image
                  source={{ uri: me.data.image }}
                  style={{ width: 96, height: 96 }}
                  resizeMode="cover"
                />
              ) : (
                <ThemedText className="text-3xl">👤</ThemedText>
              )}
            </View>
            <View className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-primary items-center justify-center border border-white/60">
              {isUploadingAvatar ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text
                  className="text-white"
                  style={{ fontSize: 16, fontWeight: "700" }}
                >
                  ✎
                </Text>
              )}
            </View>
          </Pressable>

          <View className="flex-1">
            <ThemedText
              type="title"
              className="text-zinc-900 dark:text-zinc-50"
            >
              {me.data?.name?.trim() ? me.data.name : "Dein Profil"}
            </ThemedText>
            <ThemedText className="mt-1 text-zinc-600 dark:text-zinc-300">
              Tippe auf dein Foto, um es zu ändern
            </ThemedText>
          </View>
        </View>
      </Card>

      <Card className="rounded-2xl p-5 shadow-sm">
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
      </Card>

      <Card className="rounded-2xl p-5 shadow-sm">
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
      </Card>

      <Card className="rounded-2xl p-5 shadow-sm">
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
        <Button onPress={openNotificationSettings} variant="default">
          <Text>Benachrichtigungen verwalten</Text>
        </Button>
      </Card>

      <Card className="rounded-2xl p-5 shadow-sm">
        <ThemedText
          type="subtitle"
          className="text-gray-900 dark:text-white mb-2"
        >
          Teilen
        </ThemedText>
        <ThemedText className="mb-3 text-gray-600 dark:text-gray-400">
          Teile deine Pläne mit anderen. Sie können sehen, was du vorhast und
          mitmachen.
        </ThemedText>
        <Button
          onPress={async () => {
            try {
              const result = await getShareLink.mutateAsync(undefined);
              const shareUrl = result.url;

              if (Platform.OS === "web") {
                // Web: Copy to clipboard
                try {
                  if (
                    typeof navigator !== "undefined" &&
                    navigator.clipboard &&
                    navigator.clipboard.writeText
                  ) {
                    await navigator.clipboard.writeText(shareUrl);
                    // Use window.alert for web as Alert.alert might not work properly
                    if (typeof window !== "undefined") {
                      window.alert("Link wurde in die Zwischenablage kopiert!");
                    }
                  } else {
                    // Fallback: Use legacy clipboard API or show URL
                    const textArea = document.createElement("textarea");
                    textArea.value = shareUrl;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-999999px";
                    textArea.style.top = "-999999px";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    try {
                      document.execCommand("copy");
                      textArea.remove();
                      if (typeof window !== "undefined") {
                        window.alert(
                          "Link wurde in die Zwischenablage kopiert!"
                        );
                      }
                    } catch (err) {
                      textArea.remove();
                      // Last resort: show the URL
                      if (typeof window !== "undefined") {
                        window.prompt("Kopiere diesen Link:", shareUrl);
                      }
                    }
                  }
                } catch (clipboardError: any) {
                  console.error("Clipboard error:", clipboardError);
                  // Fallback: show the URL
                  if (typeof window !== "undefined") {
                    window.prompt("Kopiere diesen Link:", shareUrl);
                  }
                }
              } else {
                // Native: Use Share API
                try {
                  await Share.share({
                    message: shareUrl,
                    title: "Meine Pläne teilen",
                  });
                } catch (error: any) {
                  if (error?.message !== "User did not share") {
                    Alert.alert("Teilen", shareUrl);
                  }
                }
              }
            } catch (error: any) {
              Alert.alert(
                "Fehler",
                error?.message || "Link konnte nicht erstellt werden."
              );
            }
          }}
          disabled={getShareLink.isPending}
          variant="default"
        >
          <Text>
            {getShareLink.isPending ? "Wird erstellt..." : "Meine Pläne teilen"}
          </Text>
        </Button>
      </Card>

      <Card className="rounded-2xl p-5 shadow-sm">
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
        <Button
          onPress={() => router.push("/onboarding/welcome")}
          variant="default"
        >
          <Text>Onboarding wiederholen</Text>
        </Button>
      </Card>

      <Card className="rounded-2xl p-5 shadow-sm">
        <ThemedText
          type="subtitle"
          className="text-zinc-900 dark:text-zinc-50 mb-2"
        >
          Abmelden
        </ThemedText>
        <ThemedText className="mb-3 text-zinc-600 dark:text-zinc-400">
          Du bist angemeldet als {me.data?.phoneNumber}.
        </ThemedText>
        <Button
          onPress={() => {
            if (Platform.OS === "web") {
              if (confirm("Möchtest du dich wirklich abmelden?")) {
                signOut();
              }
            } else {
              Alert.alert("Abmelden", "Möchtest du dich wirklich abmelden?", [
                { text: "Abbrechen", style: "cancel" },
                {
                  text: "Abmelden",
                  style: "destructive",
                  onPress: () => signOut(),
                },
              ]);
            }
          }}
          variant="outline"
        >
          <Text>Abmelden</Text>
        </Button>
      </Card>

      <Card className="rounded-2xl p-5 shadow-sm border-red-200 dark:border-red-900/50">
        <ThemedText
          type="subtitle"
          className="text-red-600 dark:text-red-400 mb-2"
        >
          Gefährliche Zone
        </ThemedText>
        <ThemedText className="mb-3 text-gray-600 dark:text-gray-400">
          Du kannst deinen Account unwiderruflich löschen. Alle deine Daten
          werden dabei gelöscht.
        </ThemedText>
        <Button
          onPress={() => router.push("/delete-account")}
          variant="outline"
          className="border-red-300 dark:border-red-800"
        >
          <Text className="text-red-600 dark:text-red-400">
            Account löschen
          </Text>
        </Button>
      </Card>

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
      <View className="flex-1">
        <GradientBackdrop variant="cool" />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
        >
          {content}
        </ScrollView>
      </View>
    );
  }

  // Original complex app bar version
  return (
    <SafeAreaView className="flex-1">
      <GradientBackdrop variant="cool" />
      <ThemedView
        className="flex-1"
        lightColor="transparent"
        darkColor="transparent"
      >
        <View className="px-6 pt-2 pb-4">
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
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {content}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}
