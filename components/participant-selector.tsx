import { orpc } from "@/client/orpc";
import useAllContacts from "@/hooks/use-all-contacts";
import {
  Gender,
  genders,
  RelationshipStatus,
  relationshipStatuses,
} from "@/shared/validation";
import { WhoInput } from "@/shared/validation/realite";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { useColorScheme } from "nativewind";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ContactDebugInfo from "./contact-debug-info";

// Type for user profile that includes demographic data from events
interface ExtendedUser {
  id?: string;
  name: string | null;
  email?: string | null;
  image?: string | null;
  gender?: Gender;
  relationshipStatus?: RelationshipStatus;
  birthDate?: string;
  privacySettings?: {
    showGender: boolean;
    showAge: boolean;
    showRelationshipStatus: boolean;
  };
}

interface ParticipantSelectorProps {
  data: WhoInput;
  onDataChange: (data: WhoInput) => void;
  style: { color: string };
}

const STORAGE_KEY = "participant_selector_data";

const genderMap = {
  MALE: "Männlich",
  FEMALE: "Weiblich",
  NON_BINARY: "Nicht-Binär",
  OTHER: "Andere",
  PREFER_NOT_TO_SAY: "Keine Angabe",
};

const relationshipStatusMap = {
  SINGLE: "Single",
  IN_RELATIONSHIP: "In Beziehung",
  MARRIED: "Verheiratet",
  PREFER_NOT_TO_SAY: "Keine Angabe",
  COMPLICATED: "Kompliziert",
};

export default function ParticipantSelector({
  data,
  onDataChange,
  style,
}: ParticipantSelectorProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const { data: contacts, isLoading, error: contactsError } = useAllContacts();

  // Get current user profile to determine available filter options
  const { data: currentUser } = useQuery(orpc.auth.me.queryOptions()) as {
    data: ExtendedUser | undefined;
  };

  // Debug logging für Kontakte
  React.useEffect(() => {
    if (contacts) {
      console.log(
        `🎯 ParticipantSelector: Received ${contacts.length} contacts`
      );
      if (contacts.length === 0) {
        console.warn("⚠️ No contacts available in ParticipantSelector");
      }
    }
    if (contactsError) {
      console.error(
        "❌ Contact loading error in ParticipantSelector:",
        contactsError
      );
    }
  }, [contacts, contactsError]);

  // Load last selection on mount only
  useEffect(() => {
    const loadLastSelection = async () => {
      try {
        const lastSelection = await SecureStore.getItemAsync(STORAGE_KEY);
        if (lastSelection) {
          const parsed = JSON.parse(lastSelection) as WhoInput;
          onDataChange(parsed);
        }
      } catch (error) {
        console.log("Could not load last participant selection:", error);
      }
    };
    void loadLastSelection();
  }, []); // Empty dependency array to run only on mount

  // Save selection whenever data changes
  useEffect(() => {
    const saveSelection = async () => {
      try {
        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.log("Could not save participant selection:", error);
      }
    };
    void saveSelection();
  }, [data]);

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];

    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phoneNumbers?.some((phone) =>
          phone.number?.includes(searchQuery)
        )
    );
  }, [contacts, searchQuery]);

  const handleCloseModal = useCallback(() => {
    setSearchQuery("");
    setIsModalOpen(false);
  }, []);

  const openSelector = () => {
    setIsModalOpen(true);
  };

  const toggleContactSelection = (contactHash: string) => {
    const currentValue = data.explicit?.[contactHash];

    if (currentValue === undefined) {
      // Not set, set to true
      onDataChange({
        ...data,
        explicit: {
          ...data.explicit,
          [contactHash]: true,
        },
      });
    } else if (currentValue === true) {
      // Currently true, set to false
      onDataChange({
        ...data,
        explicit: {
          ...data.explicit,
          [contactHash]: false,
        },
      });
    } else {
      // Currently false, remove from explicit (back to undefined/neutral)
      const newExplicit = { ...data.explicit };
      delete newExplicit[contactHash];
      onDataChange({
        ...data,
        explicit: newExplicit,
      });
    }
  };

  const toggleAnyoneFilter = (
    property: "gender" | "relationshipStatus",
    value: string
  ) => {
    const currentFilters = data.anyone || {};
    const currentValues = currentFilters[property] as string[];
    const isSelected = currentValues.includes(value);

    if (isSelected) {
      // Remove this value
      const newValues = currentValues.filter((v) => v !== value);
      const newAnyoneData: NonNullable<WhoInput["anyone"]> = {
        ...currentFilters,
      };

      if (newValues.length > 0) {
        if (property === "gender") {
          newAnyoneData.gender = newValues as Gender[];
        } else {
          newAnyoneData.relationshipStatus = newValues as RelationshipStatus[];
        }
      } else {
        // Remove the property completely
        if (property === "gender" && "gender" in newAnyoneData) {
          delete newAnyoneData.gender;
        } else if (
          property === "relationshipStatus" &&
          "relationshipStatus" in newAnyoneData
        ) {
          delete newAnyoneData.relationshipStatus;
        }
      }

      // If no filters left, set anyone to null
      const hasAnyFilters =
        ("gender" in newAnyoneData &&
          newAnyoneData.gender &&
          newAnyoneData.gender.length > 0) ||
        ("relationshipStatus" in newAnyoneData &&
          newAnyoneData.relationshipStatus &&
          newAnyoneData.relationshipStatus.length > 0);
      onDataChange({
        ...data,
        anyone: hasAnyFilters ? newAnyoneData : null,
      });
    } else {
      // Add this value
      const newValues = [...currentValues, value];
      const newAnyoneData: NonNullable<WhoInput["anyone"]> = {
        ...currentFilters,
      };

      if (property === "gender") {
        newAnyoneData.gender = newValues as Gender[];
      } else {
        newAnyoneData.relationshipStatus = newValues as RelationshipStatus[];
      }

      onDataChange({
        ...data,
        anyone: newAnyoneData,
      });
    }
  };

  const getContactSelectionState = (contactHash: string) => {
    const explicitValue = data.explicit?.[contactHash];

    return {
      state:
        explicitValue === true
          ? "yes"
          : explicitValue === false
            ? "no"
            : "neutral",
      value: explicitValue,
    };
  };

  const getParticipantsSummary = () => {
    const explicitValues = Object.values(data.explicit ?? {});
    const explicitYes = explicitValues.filter((v) => v === true).length;
    const explicitNo = explicitValues.filter((v) => v === false).length;
    const hasAnyoneFilters =
      data.anyone &&
      ((data.anyone.gender && data.anyone.gender.length > 0) ||
        (data.anyone.relationshipStatus &&
          data.anyone.relationshipStatus.length > 0));

    const parts: string[] = [];

    if (explicitYes > 0) {
      parts.push(
        `${explicitYes} ausgewählte Kontakt${explicitYes !== 1 ? "e" : ""}`
      );
    }

    if (explicitNo > 0) {
      parts.push(`${explicitNo} ausgeschlossen`);
    }

    if (hasAnyoneFilters) {
      const genderCount = data.anyone?.gender?.length || 0;
      const relationshipCount = data.anyone?.relationshipStatus?.length || 0;
      const filterCount = genderCount + relationshipCount;
      parts.push(`${filterCount} Profil-Filter`);
    }

    if (parts.length === 0) {
      return "Keine spezifischen Einstellungen";
    }

    return parts.join(" • ");
  };

  // Determine which profile properties the current user has filled
  const availableProfileFilters = useMemo(() => {
    const filters: {
      property: "gender" | "relationshipStatus";
      displayName: string;
      values: readonly (Gender | RelationshipStatus)[];
    }[] = [];

    // Check if user has filled gender (comes from user-profile-updated events)
    if (currentUser?.gender) {
      filters.push({
        property: "gender",
        displayName: "Geschlecht",
        values: genders,
      });
    }

    // Check if user has filled relationshipStatus (comes from user-profile-updated events)
    if (currentUser?.relationshipStatus) {
      filters.push({
        property: "relationshipStatus",
        displayName: "Beziehungsstatus",
        values: relationshipStatuses,
      });
    }

    return filters;
  }, [currentUser]);

  return (
    <>
      <View className="px-4">
        <View className="mb-2 flex-row items-center">
          <MaterialIcons name="people" size={20} color={style.color} />
          <Text className="ml-2 text-sm font-medium text-foreground">
            Wer kann teilnehmen?
          </Text>
        </View>

        <Pressable
          onPress={openSelector}
          className="flex-row items-center justify-between rounded-lg border border-input bg-background p-3"
        >
          <View className="flex-1">
            <Text className="font-medium text-foreground">
              {getParticipantsSummary()}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#666" />
        </Pressable>
      </View>

      <Modal
        visible={isModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView
          className="flex-1 bg-background"
          style={{ backgroundColor: isDark ? "#09090B" : "#FFFFFF" }}
        >
          <View className="flex-row items-center justify-between border-b border-border p-4">
            <Text className="text-lg font-semibold text-foreground">
              Wer kann teilnehmen?
            </Text>
            <View className="flex-row items-center space-x-2">
              <Pressable onPress={() => setShowDebugInfo(true)}>
                <MaterialIcons name="bug-report" size={20} color="#666" />
              </Pressable>
              <Pressable onPress={handleCloseModal}>
                <MaterialIcons name="close" size={24} color="#666" />
              </Pressable>
            </View>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="p-4">
              {/* Anyone Filters Section */}
              {availableProfileFilters.length > 0 && (
                <View className="mb-6">
                  <Text className="mb-3 text-base font-semibold text-foreground">
                    Zusätzlich alle mit bestimmten Eigenschaften
                  </Text>
                  <Text className="mb-4 text-sm text-muted-foreground">
                    Diese Filter ermöglichen es auch anderen Personen (nicht nur
                    deinen Kontakten) teilzunehmen, wenn sie die Kriterien
                    erfüllen.
                  </Text>

                  {availableProfileFilters.map((filter) => (
                    <View key={filter.property} className="mb-4">
                      <Text className="mb-2 text-sm font-medium text-foreground">
                        {filter.displayName}
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {filter.values.map((value) => {
                          const propertyValue: any =
                            data.anyone?.[filter.property];
                          const isSelected =
                            Array.isArray(propertyValue) &&
                            propertyValue.includes(value);
                          const displayName =
                            filter.property === "gender"
                              ? genderMap[value as keyof typeof genderMap]
                              : relationshipStatusMap[
                                  value as keyof typeof relationshipStatusMap
                                ];

                          return (
                            <Pressable
                              key={value}
                              onPress={() =>
                                toggleAnyoneFilter(filter.property, value)
                              }
                              className={`rounded-full px-3 py-2 ${
                                isSelected ? "bg-primary" : "bg-muted"
                              }`}
                            >
                              <Text
                                className={`text-sm ${
                                  isSelected
                                    ? "text-primary-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {displayName}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {availableProfileFilters.length === 0 && (
                <View className="mb-6 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950/20">
                  <View className="flex-row items-start">
                    <MaterialIcons
                      name="info"
                      size={20}
                      color={isDark ? "#FCD34D" : "#F59E0B"}
                      style={{ marginRight: 8, marginTop: 2 }}
                    />
                    <Text className="flex-1 text-sm text-yellow-700 dark:text-yellow-300">
                      Du kannst Profileigenschaften (Geschlecht,
                      Beziehungsstatus) als Filter hinzufügen, nachdem du sie in
                      deinem Profil ausgefüllt hast.
                    </Text>
                  </View>
                </View>
              )}

              {/* Contacts Section */}
              <View className="mb-4">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-foreground">
                    Deine Kontakte
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {filteredContacts.length} Kontakt
                    {filteredContacts.length !== 1 ? "e" : ""}
                  </Text>
                </View>

                <Text className="mb-4 text-sm text-muted-foreground">
                  Wähle für jeden Kontakt: Ja (kann teilnehmen), Nein (kann
                  nicht teilnehmen), oder neutral (wird nicht spezifiziert).
                </Text>

                <TextInput
                  className="mb-3 rounded-lg border border-input bg-background p-3 text-foreground"
                  placeholder="Kontakte durchsuchen..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                />

                {isLoading ? (
                  <View className="items-center justify-center py-8">
                    <ActivityIndicator size="large" color={style.color} />
                    <Text className="mt-2 text-sm text-muted-foreground">
                      Kontakte werden geladen...
                    </Text>
                  </View>
                ) : contactsError ? (
                  <View className="items-center justify-center py-8">
                    <MaterialIcons
                      name="error-outline"
                      size={48}
                      color="#EF4444"
                    />
                    <Text className="mt-2 text-center text-foreground">
                      Fehler beim Laden der Kontakte
                    </Text>
                    <Text className="mt-1 text-center text-sm text-muted-foreground">
                      {contactsError.message}
                    </Text>
                  </View>
                ) : filteredContacts.length === 0 && !searchQuery ? (
                  <View className="items-center justify-center py-8">
                    <MaterialIcons name="contacts" size={48} color="#6B7280" />
                    <Text className="mt-2 text-center text-foreground">
                      Keine Kontakte gefunden
                    </Text>
                    <Text className="mt-1 text-center text-sm text-muted-foreground">
                      Überprüfe die Berechtigung für Kontaktzugriff in den
                      Einstellungen
                    </Text>
                  </View>
                ) : (
                  <View className="max-h-96">
                    <ScrollView showsVerticalScrollIndicator={true}>
                      {filteredContacts.map((contact) => {
                        const contactHash = contact.phoneNumberHashes?.[0];
                        if (!contactHash) {
                          console.warn(
                            "⚠️ Contact without hash:",
                            contact.name
                          );
                          return null;
                        }

                        const selectionState =
                          getContactSelectionState(contactHash);

                        return (
                          <Pressable
                            key={contact.id}
                            onPress={() => toggleContactSelection(contactHash)}
                            className="flex-row items-center border-b border-input/20 py-3"
                          >
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
                              <Text className="text-base font-semibold text-primary-foreground">
                                {contact.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View className="ml-3 flex-1">
                              <Text className="font-medium text-foreground">
                                {contact.name}
                              </Text>
                              {contact.phoneNumbers?.[0]?.number && (
                                <Text className="text-sm text-muted-foreground">
                                  {contact.phoneNumbers[0].number}
                                </Text>
                              )}
                            </View>
                            <View className="flex-row items-center">
                              {selectionState.state === "yes" && (
                                <View className="mr-2 rounded-full bg-green-100 px-2 py-1 dark:bg-green-900">
                                  <Text className="text-xs font-medium text-green-700 dark:text-green-300">
                                    Ja
                                  </Text>
                                </View>
                              )}
                              {selectionState.state === "no" && (
                                <View className="mr-2 rounded-full bg-red-100 px-2 py-1 dark:bg-red-900">
                                  <Text className="text-xs font-medium text-red-700 dark:text-red-300">
                                    Nein
                                  </Text>
                                </View>
                              )}
                              <MaterialIcons
                                name={
                                  selectionState.state === "yes"
                                    ? "check-circle"
                                    : selectionState.state === "no"
                                      ? "cancel"
                                      : "radio-button-unchecked"
                                }
                                size={24}
                                color={
                                  selectionState.state === "yes"
                                    ? "#10B981"
                                    : selectionState.state === "no"
                                      ? "#EF4444"
                                      : "#6B7280"
                                }
                              />
                            </View>
                          </Pressable>
                        );
                      })}

                      {filteredContacts.length === 0 &&
                        searchQuery.length > 0 && (
                          <View className="items-center justify-center py-8">
                            <Text className="text-center text-muted-foreground">
                              Keine Kontakte gefunden
                            </Text>
                          </View>
                        )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Summary Section */}
              <View className="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
                <View className="flex-row items-start">
                  <MaterialIcons
                    name="info"
                    size={20}
                    color={isDark ? "#60A5FA" : "#3B82F6"}
                    style={{ marginRight: 8, marginTop: 2 }}
                  />
                  <View className="flex-1">
                    <Text className="font-medium text-blue-700 dark:text-blue-300">
                      Wie funktioniert das?
                    </Text>
                    <Text className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                      • Kontakte mit &quot;Ja&quot; können definitiv teilnehmen
                      {"\n"}• Kontakte mit &quot;Nein&quot; können definitiv
                      nicht teilnehmen{"\n"}• Neutrale Kontakte werden nicht
                      spezifisch ein-/ausgeschlossen{"\n"}• Profil-Filter
                      ermöglichen auch anderen Personen die Teilnahme
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Debug Modal */}
      <Modal
        visible={showDebugInfo}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDebugInfo(false)}
      >
        <SafeAreaView className="flex-1">
          <ContactDebugInfo onClose={() => setShowDebugInfo(false)} />
        </SafeAreaView>
      </Modal>
    </>
  );
}
