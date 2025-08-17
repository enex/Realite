import useAllContacts from "@/hooks/useAllContacts";
import { MaterialIcons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import React from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

interface ContactDebugInfoProps {
  onClose: () => void;
}

export default function ContactDebugInfo({ onClose }: ContactDebugInfoProps) {
  const { data: contacts, isLoading, error } = useAllContacts();
  const [permissionStatus, setPermissionStatus] =
    React.useState<string>("unknown");
  const [rawContactCount, setRawContactCount] = React.useState<number>(0);

  React.useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { status } = await Contacts.getPermissionsAsync();
        setPermissionStatus(status);

        if (status === Contacts.PermissionStatus.GRANTED) {
          const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
          });
          setRawContactCount(data.length);
        }
      } catch (err) {
        console.error("Error checking permissions:", err);
      }
    };

    void checkPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      setPermissionStatus(status);
    } catch (err) {
      console.error("Error requesting permissions:", err);
    }
  };

  return (
    <View className="flex-1 bg-background p-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-foreground">
          Kontakte Debug Info
        </Text>
        <Pressable onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#666" />
        </Pressable>
      </View>

      <ScrollView className="flex-1">
        <View className="space-y-4">
          {/* Permission Status */}
          <View className="rounded-lg bg-muted/30 p-4">
            <Text className="mb-2 font-medium text-foreground">
              Berechtigung Status
            </Text>
            <Text className="text-sm text-muted-foreground">
              Status: {permissionStatus}
            </Text>
            {permissionStatus !== "granted" && (
              <Pressable
                onPress={requestPermissions}
                className="mt-2 rounded bg-primary px-3 py-2"
              >
                <Text className="text-center text-primary-foreground">
                  Berechtigung anfordern
                </Text>
              </Pressable>
            )}
          </View>

          {/* Raw Contact Count */}
          <View className="rounded-lg bg-muted/30 p-4">
            <Text className="mb-2 font-medium text-foreground">
              Rohe Kontakte (direkt von System)
            </Text>
            <Text className="text-sm text-muted-foreground">
              Anzahl: {rawContactCount}
            </Text>
          </View>

          {/* Hook Status */}
          <View className="rounded-lg bg-muted/30 p-4">
            <Text className="mb-2 font-medium text-foreground">
              useAllContacts Hook Status
            </Text>
            <Text className="text-sm text-muted-foreground">
              Loading: {isLoading ? "Ja" : "Nein"}
            </Text>
            <Text className="text-sm text-muted-foreground">
              Error: {error ? error.message : "Kein Fehler"}
            </Text>
            <Text className="text-sm text-muted-foreground">
              Verarbeitete Kontakte: {contacts?.length || 0}
            </Text>
          </View>

          {/* Processed Contacts Details */}
          {contacts && contacts.length > 0 && (
            <View className="rounded-lg bg-muted/30 p-4">
              <Text className="mb-2 font-medium text-foreground">
                Verarbeitete Kontakte (erste 5)
              </Text>
              {contacts.slice(0, 5).map((contact, index) => (
                <View
                  key={contact.id || index}
                  className="mb-2 border-b border-input/20 pb-2"
                >
                  <Text className="text-sm font-medium text-foreground">
                    {contact.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    ID: {contact.id || "Keine ID"}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Telefonnummern: {contact.phoneNumbers?.length || 0}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Hashes: {contact.phoneNumberHashes?.length || 0}
                  </Text>
                  {contact.phoneNumbers?.map((phone, phoneIndex) => (
                    <Text
                      key={phoneIndex}
                      className="text-xs text-muted-foreground"
                    >
                      • {phone.number || phone.digits || "Keine Nummer"}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Error Details */}
          {error && (
            <View className="rounded-lg bg-red-50 p-4 dark:bg-red-950/20">
              <Text className="mb-2 font-medium text-red-700 dark:text-red-300">
                Fehler Details
              </Text>
              <Text className="text-sm text-red-600 dark:text-red-400">
                {error.message}
              </Text>
              <Text className="text-xs text-red-500 dark:text-red-500">
                {error.stack}
              </Text>
            </View>
          )}

          {/* System Info */}
          <View className="rounded-lg bg-muted/30 p-4">
            <Text className="mb-2 font-medium text-foreground">
              System Info
            </Text>
            <Text className="text-sm text-muted-foreground">
              Platform: {Platform.OS}
            </Text>
            <Text className="text-sm text-muted-foreground">
              Version: {Platform.Version}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
