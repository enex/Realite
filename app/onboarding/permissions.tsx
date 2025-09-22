import orpc from "@/client/orpc";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Contacts from "expo-contacts";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PermissionState {
  contacts: boolean;
  location: boolean;
  notifications: boolean;
}

export default function PermissionsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
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
        router.replace("/(tabs)" as never);
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
    setIsRequesting(true);

    try {
      const results = await Promise.allSettled([
        requestContactsPermission(),
        requestLocationPermission(),
        requestNotificationPermission(),
      ]);

      const grantedCount = results.filter(
        (result) => result.status === "fulfilled" && result.value
      ).length;

      if (grantedCount === 0) {
        Alert.alert(
          "Berechtigungen verweigert",
          "Du kannst diese Berechtigungen später in den Einstellungen deines Geräts aktivieren.",
          [
            {
              text: "Einstellungen öffnen",
              onPress: () => Linking.openSettings(),
            },
            { text: "Später", style: "cancel" },
          ]
        );
      } else if (grantedCount < 3) {
        Alert.alert(
          "Einige Berechtigungen verweigert",
          "Du kannst die fehlenden Berechtigungen später in den Einstellungen aktivieren, um alle Funktionen nutzen zu können."
        );
      }

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
    // Onboarding trotzdem als abgeschlossen markieren
    completeOnboarding.mutate({});
  };

  const permissionItems = [
    {
      key: "contacts" as keyof PermissionState,
      icon: "contacts",
      title: "Kontakte",
      description: "Finde Freunde, die bereits Realite nutzen",
      reason:
        "Wir benötigen Zugriff auf deine Kontakte, um zu sehen, welche deiner Freunde bereits Realite nutzen. Deine Kontaktdaten werden verschlüsselt und sicher gespeichert.",
      color: isDark ? "#60A5FA" : "#3B82F6",
      bgColor: isDark ? "bg-blue-900/30" : "bg-blue-100",
    },
    {
      key: "location" as keyof PermissionState,
      icon: "location-on",
      title: "Standort",
      description: "Finde Aktivitäten in deiner Nähe",
      reason:
        "Dein Standort hilft uns, relevante Aktivitäten und Pläne in deiner Umgebung zu finden. Wir teilen deinen genauen Standort niemals mit anderen Nutzern.",
      color: isDark ? "#4ADE80" : "#16A34A",
      bgColor: isDark ? "bg-green-900/30" : "bg-green-100",
    },
    {
      key: "notifications" as keyof PermissionState,
      icon: "notifications",
      title: "Benachrichtigungen",
      description: "Erhalte Erinnerungen und Updates",
      reason:
        "Wir senden dir Benachrichtigungen über neue Pläne, Einladungen und Erinnerungen. Du kannst diese jederzeit in den Einstellungen anpassen.",
      color: isDark ? "#F59E0B" : "#D97706",
      bgColor: isDark ? "bg-amber-900/30" : "bg-amber-100",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6">
        <View className="py-6">
          {/* Header */}
          <View className="mb-8 items-center">
            <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-primary">
              <MaterialIcons name="security" size={48} color="white" />
            </View>
            <Text className="mb-2 text-center text-2xl font-bold text-foreground">
              Berechtigungen
            </Text>
            <Text className="text-center text-muted-foreground">
              Erlaube Realite den Zugriff auf wichtige Funktionen
            </Text>
          </View>

          {/* Permission Items */}
          <View className="mb-8 flex flex-col gap-6">
            {permissionItems.map((item) => (
              <View
                key={item.key}
                className="rounded-lg border border-border bg-card p-4"
              >
                <View className="mb-3 flex-row items-center">
                  <View
                    className={`mr-3 h-12 w-12 items-center justify-center rounded-full ${item.bgColor}`}
                  >
                    <MaterialIcons
                      name={item.icon as keyof typeof MaterialIcons.glyphMap}
                      size={24}
                      color={item.color}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-foreground">
                      {item.title}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {item.description}
                    </Text>
                  </View>
                  {permissions[item.key] && (
                    <MaterialIcons
                      name="check-circle"
                      size={24}
                      color={isDark ? "#4ADE80" : "#16A34A"}
                    />
                  )}
                </View>
                <Text className="text-sm text-muted-foreground">
                  {item.reason}
                </Text>
              </View>
            ))}
          </View>

          {/* Privacy Notice */}
          <View className="mb-8 rounded-lg bg-green-50 p-4 dark:bg-green-950/20">
            <View className="flex-row items-start">
              <MaterialIcons
                name="verified"
                size={20}
                color={isDark ? "#4ADE80" : "#16A34A"}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <View className="flex-1">
                <Text className="mb-1 font-semibold text-green-700 dark:text-green-300">
                  Deine Daten sind sicher
                </Text>
                <Text className="text-sm text-green-600 dark:text-green-400">
                  Wir verwenden deine Daten nur, um dir die bestmögliche
                  Erfahrung zu bieten. Du kannst Berechtigungen jederzeit in den
                  Einstellungen deines Geräts widerrufen.
                </Text>
              </View>
            </View>
          </View>

          {/* Optional Features */}
          <View className="mb-8">
            <Text className="mb-4 text-lg font-semibold text-foreground">
              Was passiert ohne diese Berechtigungen?
            </Text>
            <View className="flex flex-col gap-2">
              <Text className="text-sm text-muted-foreground">
                • Ohne Kontakte: Du musst Freunde manuell über Telefonnummern
                einladen
              </Text>
              <Text className="text-sm text-muted-foreground">
                • Ohne Standort: Du siehst nur allgemeine Aktivitäten, keine
                lokalen
              </Text>
              <Text className="text-sm text-muted-foreground">
                • Ohne Benachrichtigungen: Du verpasst möglicherweise wichtige
                Updates
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="flex flex-col gap-3 px-6 pb-6">
        <Pressable
          onPress={requestAllPermissions}
          disabled={isRequesting}
          className="items-center rounded-lg bg-primary px-6 py-4"
        >
          <Text className="text-lg font-semibold text-primary-foreground">
            {isRequesting
              ? "Berechtigungen anfordern..."
              : "Alle Berechtigungen erlauben"}
          </Text>
        </Pressable>

        <Pressable onPress={handleSkip} className="items-center px-6 py-3">
          <Text className="text-muted-foreground">Später konfigurieren</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
