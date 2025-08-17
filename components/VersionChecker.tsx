import orpc from "@/client/orpc";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

export default function VersionChecker() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{
    needsUpdate: boolean;
    minVersion: string;
    currentVersion: string;
  } | null>(null);

  // Aktuelle App-Version aus den Expo-Konstanten holen
  const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
  const platform = Platform.OS === "ios" ? "ios" : "android";

  // Versionsprüfung durchführen - asynchron im Hintergrund
  const { data: versionCheck } = useQuery(
    orpc.appConfig.checkVersionCompatibility.queryOptions({
      input: {
        platform,
        currentVersion,
      },
      // Prüfung alle 5 Minuten wiederholen
      refetchInterval: 60 * 1000,
      // Beim App-Start sofort prüfen
      refetchOnMount: true,
      // Bei Fokus erneut prüfen
      refetchOnWindowFocus: false,
      // Retry bei Fehlern, aber nicht blockierend
      retry: 3,
      retryDelay: 1000,
    })
  );

  useEffect(() => {
    if (versionCheck?.needsUpdate) {
      setVersionInfo({
        needsUpdate: versionCheck.needsUpdate,
        minVersion: versionCheck.minVersion,
        currentVersion: versionCheck.currentVersion,
      });
      setShowUpdateModal(true);
    }
  }, [versionCheck]);

  const handleUpdatePress = () => {
    const storeUrl = Platform.select({
      ios: "https://apps.apple.com/app/realites/id6738234567", // Hier die echte App Store URL eintragen
      android: "https://play.google.com/store/apps/details?id=app.realite", // Hier die echte Play Store URL eintragen
    });

    if (storeUrl) {
      Linking.openURL(storeUrl).catch(() => {
        Alert.alert(
          "Fehler",
          "Der App Store konnte nicht geöffnet werden. Bitte aktualisiere die App manuell über den App Store."
        );
      });
    }
  };

  // App wird immer angezeigt - Versionsprüfung läuft asynchron im Hintergrund
  if (!versionInfo?.needsUpdate) return null;
  return (
    <Modal
      visible={showUpdateModal}
      animationType="fade"
      transparent={false}
      onRequestClose={() => {
        // Modal kann nicht geschlossen werden - Update ist erforderlich
      }}
    >
      <View className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-8">
          <View className="items-center">
            <View className="mb-8 h-24 w-24 items-center justify-center rounded-full bg-primary/10">
              <MaterialIcons name="system-update" size={48} color="#4F46E5" />
            </View>

            <Text className="mb-4 text-center text-2xl font-bold text-foreground">
              App-Update erforderlich
            </Text>

            <Text className="mb-8 text-center text-base text-muted-foreground">
              Deine App-Version ({versionInfo.currentVersion}) wird nicht mehr
              unterstützt. Bitte aktualisiere auf Version{" "}
              {versionInfo.minVersion} oder höher, um die App weiterhin nutzen
              zu können.
            </Text>

            <View className="w-full space-y-4">
              <Pressable
                onPress={handleUpdatePress}
                className="w-full items-center rounded-lg bg-primary px-6 py-4"
              >
                <View className="flex-row items-center">
                  <MaterialIcons
                    name="download"
                    size={20}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-lg font-semibold text-primary-foreground">
                    Jetzt aktualisieren
                  </Text>
                </View>
              </Pressable>

              <View className="rounded-lg bg-muted/50 p-4">
                <Text className="text-center text-sm text-muted-foreground">
                  Nach dem Update kannst du alle neuen Features nutzen und
                  sicherstellst, dass die App ordnungsgemäß funktioniert.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
