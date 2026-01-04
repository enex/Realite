import { useSignOut } from "@/client/auth";
import rpc from "@/client/orpc";
import { cn } from "@/lib/utils";
import {
  Gender,
  genders,
  RelationshipStatus,
  relationshipStatuses,
} from "@/shared/validation";
import { isDefinedError } from "@orpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  Text as RNText,
  Share,
  TextInput,
  View,
} from "react-native";

import { BirthdateField } from "@/components/birthdate-field";
import { ThemedText } from "@/components/themed-text";
import { ToggleRow } from "@/components/toggle-row";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { GroupedInput, GroupedInputItem } from "@/components/ui/input";
import { ModeToggle } from "@/components/ui/mode-toggle";
import Page from "@/components/ui/page";
import { Picker } from "@/components/ui/picker";
import { Text } from "@/components/ui/text";
import {
  ChevronRightIcon,
  CircleIcon,
  HeartIcon,
  Mail,
  MarsIcon,
  Phone,
  User,
  VenusIcon,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function Divider() {
  return <View className="h-px bg-zinc-200/70 dark:bg-zinc-800" />;
}

export default function ProfileScreen() {
  const router = useRouter();
  const signOut = useSignOut();
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

  const shareMyPlans = useCallback(async () => {
    try {
      const result = await getShareLink.mutateAsync(undefined);
      const shareUrl = result.url;

      if (Platform.OS === "web") {
        try {
          if (
            typeof navigator !== "undefined" &&
            navigator.clipboard &&
            navigator.clipboard.writeText
          ) {
            await navigator.clipboard.writeText(shareUrl);
            if (typeof window !== "undefined") {
              window.alert("Link wurde in die Zwischenablage kopiert!");
            }
            return;
          }

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
              window.alert("Link wurde in die Zwischenablage kopiert!");
            }
          } catch {
            textArea.remove();
            if (typeof window !== "undefined") {
              window.prompt("Kopiere diesen Link:", shareUrl);
            }
          }
        } catch (clipboardError: any) {
          console.error("Clipboard error:", clipboardError);
          if (typeof window !== "undefined") {
            window.prompt("Kopiere diesen Link:", shareUrl);
          }
        }
        return;
      }

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
    } catch (error: any) {
      Alert.alert(
        "Fehler",
        error?.message || "Link konnte nicht erstellt werden."
      );
    }
  }, [getShareLink]);

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

  const isAndroid = Platform.OS === "android";

  const resolvedName = (name ?? me.data?.name ?? "").trim();
  const initialName = (me.data?.name ?? "").trim();
  const insets = useSafeAreaInsets();

  return (
    <Page
      contentContainerStyle={{
        flexDirection: "column",
        gap: 16,
        paddingBottom: 128 + insets.bottom,
      }}
    >
      <Card>
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
                <RNText
                  className="text-white"
                  style={{ fontSize: 16, fontWeight: "700" }}
                >
                  ✎
                </RNText>
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
          <Icon name={ChevronRightIcon} size={22} />
        </View>
      </Card>

      <GroupedInput title="Personal Information">
        <GroupedInputItem label="Name" placeholder="John Doe" icon={User} />
        <GroupedInputItem
          label="Email"
          placeholder="john@example.com"
          icon={Mail}
          keyboardType="email-address"
          value={me.data?.email}
          onChangeText={(text) => update.mutate({ email: text })}
        />
        <GroupedInputItem
          label="Telefon"
          placeholder="+49 (555) 123-4567"
          icon={Phone}
          value={me.data?.phoneNumber}
          keyboardType="phone-pad"
        />
        <Picker
          value={me.data?.gender}
          onValueChange={(value) => update.mutate({ gender: value as Gender })}
          options={genders.map((g) => ({ label: GENDER_LABEL[g], value: g }))}
          placeholder="Geschlecht"
          icon={
            { default: CircleIcon, male: MarsIcon, female: VenusIcon }[
              me.data?.gender || "default"
            ] || CircleIcon
          }
          label="Geschlecht"
          variant="group"
        />
        <Picker
          value={me.data?.relationshipStatus}
          onValueChange={(value) =>
            update.mutate({ relationshipStatus: value as RelationshipStatus })
          }
          options={relationshipStatuses.map((rs) => ({
            label: REL_LABEL[rs],
            value: rs,
          }))}
          placeholder="Beziehung"
          icon={HeartIcon}
          label="Beziehung"
          variant="group"
        />
      </GroupedInput>

      <Card>
        <View className="px-4 pt-4 pb-3">
          <ThemedText
            type="subtitle"
            className="text-zinc-900 dark:text-zinc-50 mb-4"
          >
            Basisdaten
          </ThemedText>
        </View>

        <View className="px-4 pb-4">
          <ThemedText className="mb-2 text-zinc-600 dark:text-zinc-400">
            Name
          </ThemedText>
          <TextInput
            className={cn(
              "rounded-xl border px-4 py-3 text-zinc-900 dark:text-zinc-50",
              isAndroid
                ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
                : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            )}
            placeholder="Dein Name"
            placeholderTextColor={Platform.OS === "ios" ? undefined : "#9CA3AF"}
            value={name ?? me.data?.name ?? ""}
            onChangeText={(text) => setName(text)}
            onBlur={() => {
              const next = resolvedName;
              if (next === initialName) return;
              update.mutate({ name: next ? next : undefined });
            }}
          />
        </View>

        <Divider />
        <Link href="/auth/change-phone" asChild>
          <Pressable className="px-4 py-4" accessibilityRole="button">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <ThemedText className="text-zinc-900 dark:text-zinc-50">
                  Telefonnummer
                </ThemedText>
                <ThemedText className="mt-1 text-zinc-600 dark:text-zinc-400">
                  {me.data?.phoneNumber || "—"}
                </ThemedText>
              </View>
              <View className="flex-row items-center gap-2">
                <RNText className="text-primary font-medium">Ändern</RNText>
                <Icon name={ChevronRightIcon} size={22} />
              </View>
            </View>
          </Pressable>
        </Link>

        <Divider />
        <View className="px-4 py-4">
          <ThemedText className="mb-2 text-gray-600 dark:text-gray-400">
            Geschlecht
          </ThemedText>
          <View className="flex-row flex-wrap gap-2">
            {genders.map((g) => (
              <Chip
                key={g}
                label={GENDER_LABEL[g]}
                selected={me.data?.gender === g}
                onPress={() => update.mutate({ gender: g })}
              />
            ))}
          </View>
        </View>

        <Divider />
        <View className="px-4 py-4">
          <BirthdateField
            value={me.data?.birthDate}
            onChange={(v) => update.mutate({ birthDate: v })}
          />
        </View>

        <Divider />
        <View className="px-4 py-4">
          <ThemedText className="mb-2 text-gray-600 dark:text-gray-400">
            Beziehungsstatus
          </ThemedText>
          <View className="flex-row flex-wrap gap-2">
            {relationshipStatuses.map((rs) => (
              <Chip
                key={rs}
                label={REL_LABEL[rs]}
                selected={me.data?.relationshipStatus === rs}
                onPress={() => update.mutate({ relationshipStatus: rs })}
              />
            ))}
          </View>
        </View>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sichtbarkeit</CardTitle>
        </CardHeader>
        <ToggleRow
          label="Geschlecht anzeigen"
          value={me.data?.privacySettings?.showGender ?? true}
          onChange={(v) =>
            update.mutate({ privacySettings: { showGender: v } })
          }
        />
        <Divider />
        <ToggleRow
          label="Alter anzeigen"
          value={me.data?.privacySettings?.showAge ?? true}
          onChange={(v) => update.mutate({ privacySettings: { showAge: v } })}
        />
        <Divider />
        <ToggleRow
          label="Beziehungsstatus anzeigen"
          value={me.data?.privacySettings?.showRelationshipStatus ?? true}
          onChange={(v) =>
            update.mutate({ privacySettings: { showRelationshipStatus: v } })
          }
        />
      </Card>

      <ModeToggle />

      <Card>
        <CardHeader>
          <CardTitle>Benachrichtigungen</CardTitle>
        </CardHeader>
        <CardContent>
          <Text>
            Push-Benachrichtigungen können in den System-Einstellungen verwaltet
            werden.
          </Text>
        </CardContent>
        <CardFooter>
          <Button onPress={openNotificationSettings} variant="default">
            Benachrichtigungen verwalten
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teilen</CardTitle>
        </CardHeader>
        <CardContent>
          <Text>
            Teile deine Pläne mit anderen. Sie können sehen, was du vorhast und
            mitmachen.
          </Text>
        </CardContent>
        <CardFooter>
          <Button
            onPress={shareMyPlans}
            disabled={getShareLink.isPending}
            variant="default"
          >
            {getShareLink.isPending ? "Wird erstellt..." : "Meine Pläne teilen"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding</CardTitle>
        </CardHeader>
        <CardContent>
          <Text>
            Wiederhole das Onboarding, um deine Einstellungen und Berechtigungen
            zu konfigurieren.
          </Text>
        </CardContent>
        <CardFooter>
          <Button
            onPress={() => router.push("/onboarding/welcome?repeat=1")}
            variant="default"
          >
            Onboarding wiederholen
          </Button>
        </CardFooter>
      </Card>

      <Card>
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
          Abmelden
        </Button>
      </Card>

      <Card>
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
          variant="destructive"
        >
          Account löschen
        </Button>
      </Card>

      <View className="opacity-80">
        <ThemedText className="text-center text-gray-500 dark:text-gray-400">
          Änderungen werden automatisch gespeichert
        </ThemedText>
      </View>
    </Page>
  );
}

const Chip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    className={cn(
      "rounded-full border px-3 py-2",
      selected
        ? "border-primary bg-primary/15"
        : "border-zinc-300 bg-transparent dark:border-zinc-700"
    )}
  >
    <RNText
      className={cn(
        selected ? "text-primary" : "text-zinc-900 dark:text-zinc-50"
      )}
    >
      {label}
    </RNText>
  </Pressable>
);
