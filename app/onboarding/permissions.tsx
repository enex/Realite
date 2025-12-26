import orpc from "@/client/orpc";
import { useMutation } from "@tanstack/react-query";
import * as Contacts from "expo-contacts";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/hooks/useColorScheme";

interface PermissionState {
  contacts: boolean;
  location: boolean;
  notifications: boolean;
}

export default function PermissionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [permissions, setPermissions] = useState<PermissionState>({
    contacts: false,
    location: false,
    notifications: false,
  });
  const [isRequesting, setIsRequesting] = useState(false);

  const completeOnboarding = useMutation(
    orpc.user.completeOnboarding.mutationOptions({
      onSuccess: () => {
        // Weiter zur Haupt-App
        router.replace("/(tabs)");
      },
      onError: (error) => {
        console.error("Error completing onboarding:", error);
        Alert.alert(
          "Fehler",
          "Es gab ein Problem beim Abschließen des Onboardings."
        );
      },
    })
  );

  const requestContactsPermission = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      setPermissions((prev) => ({
        ...prev,
        contacts: status === Contacts.PermissionStatus.GRANTED,
      }));
      return status === Contacts.PermissionStatus.GRANTED;
    } catch (error) {
      console.error("Error requesting contacts permission:", error);
      return false;
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissions((prev) => ({
        ...prev,
        location: status === Location.PermissionStatus.GRANTED,
      }));
      return status === Location.PermissionStatus.GRANTED;
    } catch (error) {
      console.error("Error requesting location permission:", error);
      return false;
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const { granted } = await Notifications.requestPermissionsAsync();
      setPermissions((prev) => ({ ...prev, notifications: granted }));
      return granted;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  };

  const requestAllPermissions = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRequesting(true);

    try {
      await Promise.allSettled([
        requestContactsPermission(),
        requestLocationPermission(),
        requestNotificationPermission(),
      ]);

      // Onboarding als abgeschlossen markieren
      completeOnboarding.mutate({});
    } catch (error) {
      console.error("Error requesting permissions:", error);
      Alert.alert(
        "Fehler",
        "Es gab ein Problem beim Anfordern der Berechtigungen."
      );
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Onboarding trotzdem als abgeschlossen markieren
    completeOnboarding.mutate({});
  };

  const iconColor = isDark ? "#d4d4d8" : "#3C3C43";

  const permissionItems = [
    {
      key: "contacts" as keyof PermissionState,
      icon: "person.2" as const,
      title: "Kontakte",
      description: "Finde Freunde, die bereits Realite nutzen",
    },
    {
      key: "location" as keyof PermissionState,
      icon: "location" as const,
      title: "Standort",
      description: "Finde Aktivitäten in deiner Nähe",
    },
    {
      key: "notifications" as keyof PermissionState,
      icon: "bell" as const,
      title: "Benachrichtigungen",
      description: "Erhalte Erinnerungen und Updates",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-zinc-100 dark:bg-zinc-950">
      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="pb-8">
          {/* Header */}
          <View className="mb-8 items-center">
            <View className="mb-6 h-28 w-28 items-center justify-center rounded-full bg-primary shadow-md">
              <Icon name="checkmark.circle" size={56} color="white" />
            </View>
            <Text className="mb-2 text-center text-3xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
              Berechtigungen
            </Text>
            <Text className="px-4 text-center text-base leading-relaxed text-zinc-500 dark:text-zinc-300">
              Erlaube Realite den Zugriff auf wichtige Funktionen
            </Text>
          </View>

          {/* Permission Items */}
          <View className="mb-8 gap-4">
            {permissionItems.map((item) => (
              <View
                key={item.key}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <View className="flex-row items-center gap-4">
                  <View className="rounded-xl border border-zinc-200 bg-zinc-100 p-3 dark:border-zinc-700 dark:bg-zinc-800/80">
                    <Icon name={item.icon} size={20} color={iconColor} />
                  </View>
                  <View className="flex-1">
                    <Text className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {item.title}
                    </Text>
                    <Text className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-300">
                      {item.description}
                    </Text>
                  </View>
                  {permissions[item.key] && (
                    <Icon
                      name="checkmark.circle"
                      size={20}
                      color={isDark ? "#4ade80" : "#16a34a"}
                    />
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Privacy Notice */}
          <View className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/40 dark:bg-indigo-500/10 shadow-sm">
            <View className="flex-row items-start gap-3">
              <View className="mt-0.5">
                <Icon
                  name="checkmark.circle"
                  size={18}
                  color={isDark ? "#818cf8" : "#4f46e5"}
                />
              </View>
              <Text className="flex-1 text-sm leading-relaxed text-indigo-700 dark:text-indigo-300">
                Deine Daten sind sicher. Du kannst Berechtigungen jederzeit in
                den Einstellungen deines Geräts ändern.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="border-t border-t-zinc-200 px-6 pb-6 pt-4 dark:border-t-zinc-800">
        <Button
          onPress={requestAllPermissions}
          disabled={isRequesting}
          variant="default"
          size="lg"
          className="py-4 h-14"
        >
          {isRequesting ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="white" size="small" />
              <Text className="text-lg font-semibold text-white">
                Berechtigungen anfordern...
              </Text>
            </View>
          ) : (
            <Text className="text-lg font-semibold text-white">
              Alle Berechtigungen erlauben
            </Text>
          )}
        </Button>

        <Button onPress={handleSkip} variant="ghost" className="mt-3">
          <Text className="text-base font-medium text-zinc-500 dark:text-zinc-400">
            Später konfigurieren
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
