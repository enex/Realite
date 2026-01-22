import { MaterialIcons } from "@expo/vector-icons";
import * as Calendar from "expo-calendar";
import { useRouter } from "expo-router";
import { useUniwind } from "uniwind";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CalendarSyncScreen() {
  const router = useRouter();
  const { theme } = useUniwind();
  const isDark = theme === "dark";
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectCalendar = async () => {
    try {
      setIsConnecting(true);

      // Kalender-Berechtigungen anfragen
      const { status } = await Calendar.requestCalendarPermissionsAsync();

      if (status !== Calendar.PermissionStatus.GRANTED) {
        Alert.alert(
          "Berechtigung erforderlich",
          "Um deine Termine zu synchronisieren, benötigen wir Zugriff auf deinen Kalender. Du kannst dies später in den Einstellungen ändern.",
          [
            { text: "Später", style: "cancel" },
            {
              text: "Einstellungen",
              onPress: () => router.push("/onboarding/permissions" as never),
            },
          ],
        );
        return;
      }

      // Kalender abrufen um zu testen ob es funktioniert
      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT,
      );

      if (calendars.length === 0) {
        Alert.alert(
          "Keine Kalender gefunden",
          "Es wurden keine Kalender auf deinem Gerät gefunden. Du kannst später Termine manuell hinzufügen.",
        );
      }

      // Weiter zur nächsten Seite
      router.push("/onboarding/permissions" as never);
    } catch (error) {
      console.error("Error connecting calendar:", error);
      Alert.alert(
        "Fehler",
        "Es gab ein Problem beim Verbinden mit deinem Kalender. Du kannst dies später in den Einstellungen versuchen.",
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSkip = () => {
    router.push("/onboarding/permissions" as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6">
        <View className="py-6">
          {/* Header */}
          <View className="mb-8 items-center">
            <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-primary">
              <MaterialIcons name="event" size={48} color="white" />
            </View>
            <Text className="mb-2 text-center text-2xl font-bold text-foreground">
              Kalender verbinden
            </Text>
            <Text className="text-center text-muted-foreground">
              Synchronisiere deine Termine mit Realite
            </Text>
          </View>

          {/* Benefits */}
          <View className="mb-8 flex flex-col gap-4">
            <View className="flex-row items-start">
              <View className="mr-4 mt-1 h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <MaterialIcons
                  name="sync"
                  size={16}
                  color={isDark ? "#4ADE80" : "#16A34A"}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 font-semibold text-foreground">
                  Automatische Synchronisation
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Deine Termine werden automatisch als Pläne in Realite
                  importiert und synchron gehalten.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="mr-4 mt-1 h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <MaterialIcons
                  name="people"
                  size={16}
                  color={isDark ? "#60A5FA" : "#3B82F6"}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 font-semibold text-foreground">
                  Freunde einladen
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Lade deine Freunde zu deinen Terminen ein oder finde
                  gemeinsame Zeitfenster.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="mr-4 mt-1 h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                <MaterialIcons
                  name="notifications"
                  size={16}
                  color={isDark ? "#A78BFA" : "#8B5CF6"}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 font-semibold text-foreground">
                  Intelligente Erinnerungen
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Erhalte Erinnerungen für deine Pläne und verpasse keine
                  wichtigen Termine.
                </Text>
              </View>
            </View>
          </View>

          {/* Privacy Info */}
          <View className="mb-8 rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
            <View className="flex-row items-start">
              <MaterialIcons
                name="security"
                size={20}
                color={isDark ? "#60A5FA" : "#3B82F6"}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <View className="flex-1">
                <Text className="mb-1 font-semibold text-blue-700 dark:text-blue-300">
                  Deine Privatsphäre ist geschützt
                </Text>
                <Text className="text-sm text-blue-600 dark:text-blue-400">
                  Wir speichern nur die notwendigen Informationen (Titel, Zeit,
                  Ort) und teilen deine Termine nur mit Personen, die du
                  explizit einlädst.
                </Text>
              </View>
            </View>
          </View>

          {/* How it works */}
          <View className="mb-8">
            <Text className="mb-4 text-lg font-semibold text-foreground">
              So funktioniert&apos;s:
            </Text>
            <View className="flex flex-col gap-3">
              <View className="flex-row items-center">
                <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Text className="text-xs font-bold text-primary-foreground">
                    1
                  </Text>
                </View>
                <Text className="flex-1 text-sm text-muted-foreground">
                  Termine aus deinem Kalender werden als Pläne importiert
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Text className="text-xs font-bold text-primary-foreground">
                    2
                  </Text>
                </View>
                <Text className="flex-1 text-sm text-muted-foreground">
                  Du kannst Freunde zu deinen Plänen einladen
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Text className="text-xs font-bold text-primary-foreground">
                    3
                  </Text>
                </View>
                <Text className="flex-1 text-sm text-muted-foreground">
                  Änderungen werden automatisch synchronisiert
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="flex flex-col gap-3 px-6 pb-6">
        <Pressable
          onPress={handleConnectCalendar}
          disabled={isConnecting}
          className="items-center rounded-lg bg-primary px-6 py-4"
        >
          <Text className="text-lg font-semibold text-primary-foreground">
            {isConnecting ? "Verbinde..." : "Kalender verbinden"}
          </Text>
        </Pressable>

        <Pressable onPress={handleSkip} className="items-center px-6 py-3">
          <Text className="text-muted-foreground">Später verbinden</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
