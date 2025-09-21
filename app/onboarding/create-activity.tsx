import orpc from "@/client/orpc";
import OnboardingDateTimePicker from "@/components/OnboardingDateTimePicker";
import RadiusSelector from "@/components/RadiusSelector";
import { useLocation } from "@/hooks/useLocation";
import { useLocationRadius } from "@/hooks/useLocationRadius";
import { ActivityId, getSearchTermForActivity } from "@/shared/activities";
import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEventCallback } from "usehooks-ts";
import { v4 as uuidv4 } from "uuid";

const ACTIVITY_SUGGESTIONS = [
  {
    emoji: "☕",
    title: "Kaffee trinken",
    description: "Entspanntes Gespräch bei einem Kaffee",
    category: "social/coffee_chat" as ActivityId,
  },
  {
    emoji: "🚶",
    title: "Spaziergang",
    description: "Gemeinsam durch die Stadt oder den Park",
    category: "social/walking" as ActivityId,
  },
  {
    emoji: "🍽️",
    title: "Essen gehen",
    description: "Neues Restaurant oder Lieblingscafé entdecken",
    category: "food_drink/restaurant" as ActivityId,
  },
  {
    emoji: "🎳",
    title: "Bowling",
    description: "Zusammen bowlen und Spaß haben",
    category: "social/bowling" as ActivityId,
  },
  {
    emoji: "🎨",
    title: "Museum besuchen",
    description: "Kunst und Kultur gemeinsam entdecken",
    category: "arts_culture/museum" as ActivityId,
  },
  {
    emoji: "🏃",
    title: "Laufen/Joggen",
    description: "Gemeinsam laufen und fit bleiben",
    category: "sport/running" as ActivityId,
  },
];

type Step = "activity" | "description" | "time" | "location" | "complete";

interface LocationResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  source: "google" | "user" | "cached";
  metadata?: {
    placeType?: string[];
    lastUsed?: Date;
    usageCount?: number;
  };
}

interface MeetData {
  title: string;
  description: string;
  category: ActivityId;
  dates: Date[];
  timeRanges: { start: Date; end: Date; day: string }[];
  locations: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    photoUrl?: string;
  }[];
  participants: {
    participantSelection:
      | "public"
      | "all"
      | "selected"
      | "everyone-except"
      | "profile-based";
    selectedContacts: string[];
    excludedContacts: string[];
    excludeBusinessContacts: boolean;
    profileFilters: {
      gender?: string[];
      relationshipStatus?: string[];
    };
  };
}

export default function CreateActivityScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [currentStep, setCurrentStep] = useState<Step>("activity");
  const [meetData, setMeetData] = useState<MeetData>({
    title: "",
    description: "",
    category: "social/coffee_chat" as ActivityId,
    dates: [],
    timeRanges: [],
    locations: [],
    participants: {
      participantSelection: "all",
      selectedContacts: [],
      excludedContacts: [],
      excludeBusinessContacts: false,
      profileFilters: {},
    },
  });

  // No longer needed - using OnboardingDateTimePicker

  // Location search states
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "75%"], []);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);

  // User location hook
  const { latitude, longitude, hasPermission } = useLocation();

  // Radius hook
  const { radiusKm, radiusMeters, updateRadius } = useLocationRadius();

  const { data: searchData, isLoading: isLocationLoading } = useQuery(
    orpc.location.search.queryOptions({
      input: {
        query: searchQuery,
        limit: 25, // Erhöht auf 25 für mehr Ergebnisse
        userLocation: hasPermission
          ? { lat: latitude, lng: longitude }
          : undefined,
        radius: hasPermission ? radiusMeters : undefined,
      },
      enabled: searchQuery.length >= 2,
    })
  );

  // Automatische Suche basierend auf Kategorie
  const autoSearchTerm = getSearchTermForActivity(meetData.category);

  const { data: categorySearchData, isLoading: _isCategoryLoading } = useQuery(
    orpc.location.search.queryOptions({
      input: {
        query: autoSearchTerm,
        limit: 25,
        userLocation: hasPermission
          ? { lat: latitude, lng: longitude }
          : undefined,
        radius: hasPermission ? radiusMeters : undefined,
      },
      enabled: !!autoSearchTerm && searchQuery.length === 0,
    })
  );

  // Update search results when data changes
  React.useEffect(() => {
    if (searchData?.locations) {
      setSearchResults(
        searchData.locations.map((loc) => ({
          ...loc,
          metadata: {
            ...loc.metadata,
            lastUsed: loc.metadata.lastUsed
              ? new Date(loc.metadata.lastUsed)
              : undefined,
          },
        }))
      );
    } else if (categorySearchData?.locations && searchQuery.length === 0) {
      // Zeige kategoriebasierte Ergebnisse wenn keine manuelle Suche aktiv ist
      setSearchResults(
        categorySearchData.locations.map((loc) => ({
          ...loc,
          metadata: {
            ...loc.metadata,
            lastUsed: loc.metadata.lastUsed
              ? new Date(loc.metadata.lastUsed)
              : undefined,
          },
        }))
      );
    }
  }, [searchData, categorySearchData, searchQuery]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, []);

  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleSelectLocation = (location: LocationResult) => {
    setMeetData((prev) => ({
      ...prev,
      locations: [
        ...prev.locations,
        {
          id: uuidv4(),
          name: location.name,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
        },
      ],
    }));
    setSearchQuery("");
    setSearchResults([]);
    bottomSheetRef.current?.close();
  };

  // Date handlers now handled by OnboardingDateTimePicker
  const handleDateSelect = useEventCallback((date: Date) => {
    setMeetData((prev) => ({
      ...prev,
      dates: [...prev.dates, date],
    }));
  });

  const handleDateRemove = useEventCallback((index: number) => {
    setMeetData((prev) => ({
      ...prev,
      dates: prev.dates.filter((_, i) => i !== index),
    }));
  });

  const handleTimeRangesChange = useCallback(
    (ranges: { start: Date; end: Date; day: string }[]) => {
      setMeetData((prev) => ({
        ...prev,
        timeRanges: ranges,
      }));
    },
    []
  );

  const createMeet = useMutation(
    orpc.plan.create.mutationOptions({
      onSuccess: (_result) => {
        // Mark onboarding as completed and navigate after cache invalidation
        void completeOnboarding
          .mutateAsync({})
          .catch(() => {})
          .finally(() => {
            router.replace("/" as never);
          });
      },
      onError: (error) => {
        Alert.alert("Fehler", error.message);
      },
    })
  );
  const queryClient = useQueryClient();
  const completeOnboarding = useMutation(
    orpc.user.completeOnboarding.mutationOptions({
      onSuccess: async () => {
        // Invalidate user cache to ensure fresh data
        await queryClient.invalidateQueries(orpc.user.me.queryOptions({}));
      },
      onError: (error) => {
        console.error("Error completing onboarding:", error);
      },
    })
  );

  const handleNext = () => {
    switch (currentStep) {
      case "activity":
        if (!meetData.title.trim()) {
          Alert.alert(
            "Aktivität erforderlich",
            "Bitte wähle eine Aktivität aus oder gib eine eigene ein."
          );
          return;
        }
        setCurrentStep("description");
        break;
      case "description":
        setCurrentStep("time");
        break;
      case "time":
        setCurrentStep("location");
        break;
      case "location":
        setCurrentStep("complete");
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case "description":
        setCurrentStep("activity");
        break;
      case "time":
        setCurrentStep("description");
        break;
      case "location":
        setCurrentStep("time");
        break;
      case "complete":
        setCurrentStep("location");
        break;
    }
  };

  const handleSkip = async () => {
    switch (currentStep) {
      case "activity":
        // Mark onboarding as completed when skipping
        await completeOnboarding.mutateAsync({}).catch(() => {});
        router.replace("/" as never);
        break;
      case "description":
        setCurrentStep("time");
        break;
      case "time":
        setCurrentStep("location");
        break;
      case "location":
        setCurrentStep("complete");
        break;
      case "complete":
        handleCreateMeet();
        break;
    }
  };

  const handleCreateMeet = () => {
    createMeet.mutate({
      what: {
        category: meetData.category || "OTHER",
        title: meetData.title,
        description: meetData.description,
      },
      when: meetData.timeRanges.map((range) => ({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      })),
      where: meetData.locations,
      who: { explicit: {}, anyone: null }, // Empty for onboarding - user can customize later
    });
  };

  const stepTitles = {
    activity: "Wähle eine Aktivität",
    description: "Beschreibe deine Aktivität",
    time: "Wann möchtest du dich treffen?",
    location: "Wo soll es stattfinden?",
    complete: "Alles bereit!",
  };

  const stepProgress = {
    activity: 1,
    description: 2,
    time: 3,
    location: 4,
    complete: 5,
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Progress Indicator */}
      <View className="flex-row items-center px-6 py-4">
        <Pressable
          onPress={() => {
            // Mark onboarding as completed when closing
            completeOnboarding.mutate();
          }}
          disabled={completeOnboarding.isPending}
        >
          <MaterialIcons
            name="close"
            size={24}
            color={
              completeOnboarding.isPending
                ? isDark
                  ? "#666"
                  : "#999"
                : isDark
                  ? "#fff"
                  : "#000"
            }
          />
        </Pressable>
        <View className="ml-4 flex-1">
          <View className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            <View
              className="h-2 rounded-full bg-primary"
              style={{ width: `${(stepProgress[currentStep] / 5) * 100}%` }}
            />
          </View>
          <Text className="mt-1 text-xs text-muted-foreground">
            Schritt {stepProgress[currentStep]} von 5
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6">
        <View className="py-6">
          <Text className="mb-2 text-center text-2xl font-bold text-foreground">
            {stepTitles[currentStep]}
          </Text>

          {currentStep === "activity" && (
            <>
              <Text className="mb-8 text-center text-muted-foreground">
                Wähle eine Aktivität aus, die du gerne mit anderen machen
                möchtest
              </Text>

              {/* Activity Suggestions */}
              <View className="mb-6">
                <Text className="mb-3 text-sm font-medium text-foreground">
                  Beliebte Aktivitäten
                </Text>
                <View className="flex flex-col gap-3">
                  {ACTIVITY_SUGGESTIONS.map((activity, index) => (
                    <Pressable
                      key={index}
                      onPress={() => {
                        setMeetData({
                          ...meetData,
                          title: activity.title,
                          description: activity.description,
                          category: activity.category,
                        });
                      }}
                      className={`rounded-lg border p-4 ${
                        meetData.title === activity.title
                          ? "border-primary bg-primary/10"
                          : "border-input bg-background"
                      }`}
                    >
                      <View className="flex-row items-center">
                        <Text className="mr-3 text-2xl">{activity.emoji}</Text>
                        <View className="flex-1">
                          <Text className="font-semibold text-foreground">
                            {activity.title}
                          </Text>
                          <Text className="text-sm text-muted-foreground">
                            {activity.description}
                          </Text>
                        </View>
                        {meetData.title === activity.title && (
                          <MaterialIcons
                            name="check-circle"
                            size={24}
                            color={isDark ? "#818CF8" : "#4F46E5"}
                          />
                        )}
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Custom Activity */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-medium text-foreground">
                  Oder erstelle deine eigene Aktivität
                </Text>
                <TextInput
                  className="rounded-lg border border-input bg-background px-4 py-3 text-foreground"
                  value={
                    meetData.title !== "" &&
                    !ACTIVITY_SUGGESTIONS.some(
                      (a) => a.title === meetData.title
                    )
                      ? meetData.title
                      : ""
                  }
                  onChangeText={(text) => {
                    setMeetData({
                      ...meetData,
                      title: text,
                      category: "OTHER",
                      description: "",
                    });
                  }}
                  placeholder="z.B. Brettspiele spielen, Museum besuchen..."
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                />
              </View>
            </>
          )}

          {currentStep === "description" && (
            <>
              <Text className="mb-8 text-center text-muted-foreground">
                Erzähle mehr über deine Aktivität (optional)
              </Text>

              <View className="mb-6">
                <Text className="mb-2 text-sm font-medium text-foreground">
                  Beschreibung
                </Text>
                <TextInput
                  className="rounded-lg border border-input bg-background px-4 py-3 text-foreground"
                  value={meetData.description}
                  onChangeText={(text) => {
                    setMeetData({ ...meetData, description: text });
                  }}
                  placeholder="Erzähle mehr über deine Aktivität..."
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </>
          )}

          {currentStep === "time" && (
            <>
              <Text className="mb-8 text-center text-muted-foreground">
                Wann hättest du gerne Zeit? (optional)
              </Text>

              <OnboardingDateTimePicker
                selectedDates={meetData.dates}
                timeRanges={meetData.timeRanges}
                onDateSelect={handleDateSelect}
                onDateRemove={handleDateRemove}
                onTimeRangesChange={handleTimeRangesChange}
                accentColor={isDark ? "#818CF8" : "#4F46E5"}
              />
            </>
          )}

          {currentStep === "location" && (
            <>
              <Text className="mb-8 text-center text-muted-foreground">
                Wo soll es stattfinden? (optional)
              </Text>

              <View className="mb-6">
                <Text className="mb-2 text-sm font-medium text-foreground">
                  Ortsvorschläge
                </Text>

                {meetData.locations.length === 0 ? (
                  <Pressable
                    onPress={() => bottomSheetRef.current?.snapToIndex(0)}
                    className="flex-row items-center justify-center rounded-lg border-2 border-dashed border-input bg-background p-6"
                  >
                    <MaterialIcons
                      name="add"
                      size={24}
                      color={isDark ? "#818CF8" : "#4F46E5"}
                    />
                    <Text className="ml-2 text-base font-medium text-foreground">
                      Ort hinzufügen
                    </Text>
                  </Pressable>
                ) : (
                  <View className="flex-col gap-2">
                    {meetData.locations.map((location, index) => (
                      <View
                        key={index}
                        className="min-w-0 flex-row items-center justify-between rounded-lg border border-input bg-background p-3"
                      >
                        <View className="min-w-0 flex-1">
                          <Text className="font-medium text-foreground">
                            {location.name}
                          </Text>
                          <Text className="text-sm text-muted-foreground">
                            {location.address}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            setMeetData((prev) => ({
                              ...prev,
                              locations: prev.locations.filter(
                                (_, i) => i !== index
                              ),
                            }));
                          }}
                        >
                          <MaterialIcons name="close" size={20} color="#666" />
                        </Pressable>
                      </View>
                    ))}
                    <Pressable
                      onPress={() => bottomSheetRef.current?.snapToIndex(0)}
                      className="flex-row items-center justify-center rounded-lg border border-input bg-background p-3"
                    >
                      <MaterialIcons
                        name="add"
                        size={20}
                        color={isDark ? "#818CF8" : "#4F46E5"}
                      />
                      <Text className="ml-2 text-foreground">
                        Anderen Ort hinzufügen
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </>
          )}

          {currentStep === "complete" && (
            <>
              <Text className="mb-8 text-center text-muted-foreground">
                Bereit zum Erstellen deiner ersten Aktivität!
              </Text>

              {/* Summary */}
              <View className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <Text className="mb-3 font-semibold text-foreground">
                  Zusammenfassung:
                </Text>

                <View className="mb-2 flex-row items-center">
                  <MaterialIcons
                    name="event"
                    size={16}
                    color={isDark ? "#818CF8" : "#4F46E5"}
                  />
                  <Text className="ml-2 text-foreground">{meetData.title}</Text>
                </View>

                {meetData.description && (
                  <View className="mb-2 flex-row items-start">
                    <MaterialIcons
                      name="description"
                      size={16}
                      color={isDark ? "#818CF8" : "#4F46E5"}
                    />
                    <Text className="ml-2 flex-1 text-sm text-muted-foreground">
                      {meetData.description}
                    </Text>
                  </View>
                )}

                {meetData.timeRanges.length > 0 && (
                  <View className="mb-2">
                    {meetData.timeRanges.map((range, index) => (
                      <View key={index} className="mb-1 flex-row items-center">
                        <MaterialIcons
                          name="schedule"
                          size={16}
                          color={isDark ? "#818CF8" : "#4F46E5"}
                        />
                        <Text className="ml-2 text-foreground">
                          {range.day}
                        </Text>
                        <Text className="ml-2 text-sm text-muted-foreground">
                          {range.start.toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {range.end.toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {meetData.locations.length > 0 && (
                  <View className="mb-2">
                    {meetData.locations.map((location, index) => (
                      <View key={index} className="mb-1 flex-row items-start">
                        <MaterialIcons
                          name="place"
                          size={16}
                          color={isDark ? "#818CF8" : "#4F46E5"}
                        />
                        <View className="ml-2 flex-1">
                          <Text className="text-foreground">
                            {location.name}
                          </Text>
                          <Text className="text-sm text-muted-foreground">
                            {location.address}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Info Box */}
              <View className="mb-8 rounded-lg bg-green-50 p-4 dark:bg-green-950/20">
                <View className="flex-row items-start">
                  <MaterialIcons
                    name="lightbulb"
                    size={20}
                    color={isDark ? "#4ADE80" : "#22C55E"}
                    style={{ marginRight: 8, marginTop: 2 }}
                  />
                  <Text className="flex-1 text-sm text-green-700 dark:text-green-300">
                    Nach dem Erstellen kannst du weitere Details hinzufügen,
                    Freunde einladen und sehen, wer Interesse an deiner
                    Aktivität hat.
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="flex flex-col gap-3 px-6 pb-6">
        {currentStep !== "complete" ? (
          <>
            <Pressable
              onPress={handleNext}
              className="items-center rounded-lg bg-primary px-6 py-4"
            >
              <Text className="text-lg font-semibold text-primary-foreground">
                Weiter
              </Text>
            </Pressable>

            <View className="flex-row gap-3">
              {currentStep !== "activity" && (
                <Pressable
                  onPress={handleBack}
                  className="flex-1 items-center px-6 py-3"
                >
                  <Text className="text-muted-foreground">Zurück</Text>
                </Pressable>
              )}

              <Pressable
                onPress={handleSkip}
                disabled={completeOnboarding.isPending}
                className="flex-1 items-center px-6 py-3"
              >
                <Text className="text-muted-foreground">
                  {completeOnboarding.isPending && currentStep === "activity"
                    ? "Wird abgeschlossen..."
                    : currentStep === "activity"
                      ? "Überspringen"
                      : "Weiter ohne"}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Pressable
              onPress={handleCreateMeet}
              disabled={createMeet.isPending}
              className="items-center rounded-lg bg-primary px-6 py-4"
            >
              {createMeet.isPending ? (
                <Text className="text-lg font-semibold text-primary-foreground">
                  Erstelle Aktivität...
                </Text>
              ) : (
                <Text className="text-lg font-semibold text-primary-foreground">
                  Aktivität erstellen
                </Text>
              )}
            </Pressable>

            <View className="flex-row gap-3">
              <Pressable
                onPress={handleBack}
                className="flex-1 items-center px-6 py-3"
              >
                <Text className="text-muted-foreground">Zurück</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  // Mark onboarding as completed when choosing to create later
                  void completeOnboarding
                    .mutateAsync({})
                    .catch(() => {})
                    .finally(() => router.replace("/" as never));
                }}
                disabled={completeOnboarding.isPending}
                className="flex-1 items-center px-6 py-3"
              >
                <Text className="text-muted-foreground">
                  {completeOnboarding.isPending
                    ? "Wird abgeschlossen..."
                    : "Später erstellen"}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Location Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose
        style={{ flex: 1 }}
        backgroundStyle={{
          backgroundColor: isDark ? "#09090B" : "#FFFFFF",
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? "#27272A" : "#E4E4E7",
        }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={0.5}
          />
        )}
      >
        <BottomSheetView className="flex-1 p-4">
          <View className="gap-4">
            <TextInput
              className="rounded-lg border border-input bg-background p-3 text-foreground"
              placeholder={
                autoSearchTerm && searchQuery.length === 0
                  ? `Vorschläge für ${autoSearchTerm} oder eigene Suche...`
                  : "Nach Ort oder Adresse suchen..."
              }
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              value={searchQuery}
              onChangeText={handleSearchInputChange}
              autoFocus
            />

            {hasPermission && (
              <RadiusSelector
                radiusKm={radiusKm}
                onRadiusChange={updateRadius}
                style={{ color: isDark ? "#818CF8" : "#4F46E5" }}
              />
            )}

            {isLocationLoading || _isCategoryLoading ? (
              <View className="items-center justify-center py-4">
                <ActivityIndicator
                  size="large"
                  color={isDark ? "#818CF8" : "#4F46E5"}
                />
              </View>
            ) : searchResults.length > 0 ? (
              <BottomSheetScrollView className="max-h-96">
                {searchResults.map((result) => (
                  <Pressable
                    key={result.id}
                    className="border-b border-input py-3"
                    onPress={() => handleSelectLocation(result)}
                  >
                    <Text className="text-base font-medium text-foreground">
                      {result.name}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {result.address}
                    </Text>
                  </Pressable>
                ))}
              </BottomSheetScrollView>
            ) : (
              searchQuery.length > 0 && (
                <Text className="text-center text-muted-foreground">
                  Keine Ergebnisse gefunden
                </Text>
              )
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}
