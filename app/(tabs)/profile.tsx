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
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  Text as RNText,
  Share,
  View,
} from "react-native";

import { syncContacts } from "@/client/contacts";
import { ThemedText } from "@/components/themed-text";
import { ToggleRow } from "@/components/toggle-row";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
  CalendarIcon,
  ChevronRightIcon,
  CircleIcon,
  ClockIcon,
  HeartIcon,
  Mail,
  MarsIcon,
  Phone,
  User,
  UsersIcon,
  VenusIcon,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function Divider() {
  return <View className="h-px bg-zinc-200/70 dark:bg-zinc-800" />;
}

// Availability day labels
const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function ProfileScreen() {
  const router = useRouter();
  const signOut = useSignOut();
  const me = useQuery(rpc.auth.me.queryOptions());
  const avatarUploadViaServer = useMutation(
    rpc.user.uploadAvatar.mutationOptions()
  );
  const getShareLink = useMutation(rpc.user.getShareLink.mutationOptions());
  const contacts = useQuery(rpc.contact.list.queryOptions());
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showBirthdatePicker, setShowBirthdatePicker] = useState(false);
  const [isImportingContacts, setIsImportingContacts] = useState(false);

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
          const res = {
            ...old,
            ...data,
            privacySettings: {
              ...(old?.privacySettings ?? {}),
              ...(data.privacySettings ?? {}),
            },
          };
          return res;
        });
        return { old };
      },
      onSuccess: () => {
        queryClient.refetchQueries({ queryKey: rpc.auth.me.key() });
      },
      onError: (e, _, ctx) => {
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

  const birthDate = useMemo(() => {
    if (!me.data?.birthDate) return undefined;
    const d = new Date(me.data.birthDate);
    return isNaN(d.getTime()) ? undefined : d;
  }, [me.data?.birthDate]);

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

      const FileSystemLegacy = await import("expo-file-system/legacy");
      const base64 = await FileSystemLegacy.readAsStringAsync(asset.uri, {
        encoding: FileSystemLegacy.EncodingType.Base64,
      });
      const dataUrl = `data:${contentType};base64,${base64}`;

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
          "Der Server ist noch nicht für S3 konfiguriert."
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

  const resolvedName = (name ?? me.data?.name ?? "").trim();
  const initialName = (me.data?.name ?? "").trim();
  const insets = useSafeAreaInsets();

  return (
    <Page
      withTopInset={false}
      contentContainerStyle={{
        flexDirection: "column",
        gap: 16,
        paddingBottom: 128 + insets.bottom,
      }}
    >
      {/* Profile Header */}
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

      {/* Personal Information - Using GroupedInput */}
      <GroupedInput title="Persönliche Daten">
        <GroupedInputItem
          label="Name"
          placeholder="Dein Name"
          icon={User}
          value={name ?? me.data?.name ?? ""}
          onChangeText={(text) => setName(text)}
          onBlur={() => {
            const next = resolvedName;
            if (next === initialName) return;
            update.mutate({ name: next ? next : undefined });
          }}
        />
        <GroupedInputItem
          label="Email"
          placeholder="deine@email.de"
          icon={Mail}
          keyboardType="email-address"
          autoCapitalize="none"
          value={me.data?.email ?? ""}
          onChangeText={(text) => update.mutate({ email: text })}
        />
        <Pressable
          onPress={() => router.push("/auth/change-phone")}
          className="flex-row items-center gap-2"
        >
          <View className="w-[120px] flex-row items-center gap-2">
            <Icon name={Phone} size={16} className="text-muted-foreground" />
            <Text variant="caption" className="text-muted-foreground">
              Telefon
            </Text>
          </View>
          <View className="flex-1 flex-row items-center justify-between">
            <Text>{me.data?.phoneNumber || "—"}</Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-primary text-sm">Ändern</Text>
              <Icon
                name={ChevronRightIcon}
                size={16}
                className="text-primary"
              />
            </View>
          </View>
        </Pressable>
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
        {/* Birthdate */}
        <Pressable
          onPress={() => setShowBirthdatePicker(true)}
          className="flex-row items-center gap-2"
        >
          <View className="w-[120px] flex-row items-center gap-2">
            <Icon
              name={CalendarIcon}
              size={16}
              className="text-muted-foreground"
            />
            <Text variant="caption" className="text-muted-foreground">
              Geburtstag
            </Text>
          </View>
          <View className="flex-1">
            <Text>
              {birthDate ? birthDate.toLocaleDateString("de-DE") : "Auswählen"}
            </Text>
          </View>
        </Pressable>
      </GroupedInput>

      {/* Birthdate Picker Modal */}
      {showBirthdatePicker && (
        <Card>
          <DateTimePicker
            value={birthDate ?? new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "calendar"}
            maximumDate={new Date()}
            onChange={(event: DateTimePickerEvent, selectedDate) => {
              if (Platform.OS !== "ios") setShowBirthdatePicker(false);
              if (event.type === "dismissed") return;
              if (!selectedDate) return;
              const iso = selectedDate.toISOString().slice(0, 10);
              update.mutate({ birthDate: iso });
            }}
          />
          <View className="flex-row justify-between mt-3">
            <Button
              variant="outline"
              onPress={() => {
                update.mutate({ birthDate: undefined });
                setShowBirthdatePicker(false);
              }}
            >
              Entfernen
            </Button>
            <Button onPress={() => setShowBirthdatePicker(false)}>
              Fertig
            </Button>
          </View>
        </Card>
      )}

      {/* Contacts Settings */}
      <Card>
        <CardHeader>
          <View className="flex-row items-center gap-2">
            <Icon name={UsersIcon} size={20} />
            <CardTitle>Kontakte</CardTitle>
          </View>
          <CardDescription>
            Verwalte deine Kontakte in Realite. Importiere deine
            Telefon-Kontakte, um zu sehen, wer bereits auf Realite ist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const contactList = Array.isArray(contacts.data?.contacts)
              ? contacts.data.contacts
              : [];
            return contactList.length > 0 ? (
              <View className="gap-2 mb-4">
                <Text className="text-sm text-muted-foreground mb-2">
                  {contactList.length} Kontakt
                  {contactList.length > 1 ? "e" : ""} auf Realite
                </Text>
                {contactList.slice(0, 5).map((contact: any) => (
                  <View
                    key={contact.id || contact.userId || Math.random()}
                    className="flex-row items-center gap-3 py-2 px-3 rounded-lg bg-muted/50"
                  >
                    <View className="h-10 w-10 rounded-full bg-primary/20 items-center justify-center">
                      <Text className="text-primary font-semibold">
                        {contact.name?.[0]?.toUpperCase() || "?"}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-medium">
                        {contact.name || "Unbekannt"}
                      </Text>
                      {contact.phoneNumber && (
                        <Text
                          variant="caption"
                          className="text-muted-foreground"
                        >
                          {contact.phoneNumber}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
                {contactList.length > 5 && (
                  <Text
                    variant="caption"
                    className="text-muted-foreground text-center"
                  >
                    + {contactList.length - 5} weitere
                  </Text>
                )}
              </View>
            ) : (
              <Text className="text-sm text-muted-foreground mb-4">
                Noch keine Kontakte importiert. Importiere deine
                Telefon-Kontakte, um zu sehen, wer bereits auf Realite ist.
              </Text>
            );
          })()}
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            onPress={async () => {
              try {
                setIsImportingContacts(true);
                const result = await syncContacts();
                await queryClient.invalidateQueries({
                  queryKey: rpc.contact.list.key(),
                });
                Alert.alert(
                  "Erfolg",
                  `${result.contactCount} Kontakte importiert. ${result.hashCount} Telefonnummern gefunden.`
                );
              } catch (error: any) {
                Alert.alert(
                  "Fehler",
                  error?.message || "Kontakte konnten nicht importiert werden."
                );
              } finally {
                setIsImportingContacts(false);
              }
            }}
            disabled={isImportingContacts}
          >
            {isImportingContacts
              ? "Importiere..."
              : "Telefon-Kontakte importieren"}
          </Button>
        </CardFooter>
      </Card>

      {/* Availability Settings */}
      <Card>
        <CardHeader>
          <View className="flex-row items-center gap-2">
            <Icon name={ClockIcon} size={20} />
            <CardTitle>Verfügbarkeit</CardTitle>
          </View>
          <CardDescription>
            Definiere deine typische Verfügbarkeit für Aktivitäten. Andere
            können sehen, wann du Zeit hast.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Weekly availability overview */}
          <View className="flex-row gap-1 mb-4">
            {DAY_LABELS.map((day, index) => (
              <View
                key={day}
                className={cn(
                  "flex-1 items-center py-2 rounded-lg",
                  "bg-primary/20"
                )}
              >
                <Text className="text-xs font-medium text-primary">{day}</Text>
              </View>
            ))}
          </View>

          <Text className="text-sm text-muted-foreground">
            Standard: Mo–Fr, 18:00–22:00
          </Text>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            onPress={() => router.push("/settings/availability" as any)}
          >
            Verfügbarkeit bearbeiten
          </Button>
        </CardFooter>
      </Card>

      {/* Intent Settings */}
      <Card>
        <CardHeader>
          <View className="flex-row items-center gap-2">
            <Icon name={HeartIcon} size={20} />
            <CardTitle>Intentionen</CardTitle>
          </View>
          <CardDescription>
            Sag, worauf du Lust hast – du bekommst passende Vorschläge auf der
            Startseite.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="outline"
            onPress={() => router.push("/settings/intents" as any)}
          >
            Intentionen bearbeiten
          </Button>
        </CardFooter>
      </Card>

      {/* Privacy Settings */}
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

      {/* Notifications */}
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

      {/* Share */}
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

      {/* Onboarding */}
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

      {/* Sign Out */}
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

      {/* Danger Zone */}
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
