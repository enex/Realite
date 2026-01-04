import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { orpc } from "@/client/orpc";
import { ActivityBottomSheet } from "@/components/activity-bottom-sheet";
import { DateTimeBottomSheet } from "@/components/date-time-bottom-sheet";
import { EditRow } from "@/components/edit-row";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/hooks/use-location";
import {
  getActivityGradient,
  getActivityLabel,
  type ActivityId,
} from "@/shared/activities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  PlusCircleIcon,
  TrashIcon,
  XIcon,
} from "lucide-react-native";

export default function NewPlanEdit() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planData?: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const queryClient = useQueryClient();

  // Parse plan data from params
  const initialPlanData = params.planData
    ? (JSON.parse(params.planData) as any)
    : null;

  const activity = (initialPlanData?.activity ?? undefined) as
    | ActivityId
    | undefined;
  const [, , c3] = getActivityGradient(activity);

  const createPlan = useMutation(
    orpc.plan.create.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries();
        // Navigate to the created plan's detail page
        if (result?.id) {
          router.replace(`/plan/${result.id}` as any);
        } else {
          router.back();
        }
      },
      onError: (error: any) => {
        Alert.alert(
          "Fehler",
          "Konnte Plan nicht erstellen. Bitte versuche es erneut."
        );
      },
    })
  );

  // Form state - initialize from AI-generated plan data
  const [title, setTitle] = useState(initialPlanData?.title || "");
  const [description, setDescription] = useState(
    initialPlanData?.description || ""
  );
  const [url, setUrl] = useState(initialPlanData?.url || "");
  const [startDate, setStartDate] = useState<Date>(
    initialPlanData?.startDate
      ? new Date(initialPlanData.startDate)
      : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    initialPlanData?.endDate
      ? new Date(initialPlanData.endDate)
      : new Date(Date.now() + 2 * 60 * 60 * 1000)
  );
  const [selectedActivity, setSelectedActivity] = useState<
    ActivityId | undefined
  >(activity);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);

  // Location state
  type Location = {
    title: string;
    address?: string;
    latitude: number;
    longitude: number;
    url?: string;
    description?: string;
    category?: string;
  };
  const [locations, setLocations] = useState<Location[]>(
    initialPlanData?.locations || []
  );
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const { latitude, longitude, hasPermission } = useLocation();

  const locationSearchSheetRef = React.useRef<BottomSheet>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  // Location search query
  const { data: locationSearchResults, isLoading: isSearchingLocations } =
    useQuery({
      ...orpc.location.search.queryOptions({
        input: {
          query: locationSearchQuery,
          limit: 10,
          userLocation:
            hasPermission && latitude && longitude
              ? { lat: latitude, lng: longitude }
              : undefined,
          radius: 50000,
        },
      }),
      enabled: locationSearchQuery.length > 2 && showLocationSearch,
    });

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Fehler", "Bitte gib einen Titel ein.");
      return;
    }

    if (!selectedActivity) {
      Alert.alert("Fehler", "Bitte wähle eine Aktivität aus.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createPlan.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      url: url.trim() || undefined,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      activity: selectedActivity,
      locations: locations.length > 0 ? locations : undefined,
      inputText: initialPlanData?.inputText,
    });
  };

  const handleRemoveLocation = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddLocation = (location: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newLocation: Location = {
      title: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    };
    setLocations((prev) => [...prev, newLocation]);
    setLocationSearchQuery("");
    setShowLocationSearch(false);
    locationSearchSheetRef.current?.close();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const accentColor = c3 || "#007AFF";

  return (
    <View className="flex-1 bg-gray-100 dark:bg-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={insets.top}
      >
        <View className="flex-1">
          {/* Fixed Header */}
          <View
            className="flex-row items-center justify-between border-b border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900"
            style={{
              paddingTop: insets.top,
              paddingHorizontal: 16,
              paddingBottom: 8,
            }}
          >
            <Button size="icon" onPress={() => router.back()} icon={XIcon} />
            <Button
              onPress={handleSave}
              disabled={createPlan.isPending}
              loading={createPlan.isPending}
              icon={CheckIcon}
            >
              Erstellen
            </Button>
          </View>

          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 200 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={true}
          >
            {/* Title Input */}
            <View className="bg-white dark:bg-zinc-900 px-4 pt-6 pb-4">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Titel"
                placeholderTextColor={
                  isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"
                }
                className="text-[34px] leading-[41px] font-bold text-black dark:text-white"
              />
            </View>

            {/* Event Details Section */}
            <View className="bg-white dark:bg-zinc-900 mt-2 py-2">
              {/* Start Date/Time */}
              <EditRow
                icon={ClockIcon}
                label={formatDate(startDate)}
                value={formatTime(startDate)}
                onPress={() => setShowStartPicker(true)}
                accentColor={accentColor}
              />

              {/* End Date/Time */}
              <EditRow
                icon={ClockIcon}
                label={formatDate(endDate)}
                value={formatTime(endDate)}
                onPress={() => setShowEndPicker(true)}
                accentColor={accentColor}
              />

              {/* Activity */}
              <EditRow
                icon={CalendarIcon}
                label="Aktivität"
                value={getActivityLabel(selectedActivity)}
                onPress={() => setShowActivityPicker(true)}
                accentColor={accentColor}
              />
            </View>

            {/* Locations Section */}
            <View className="bg-white dark:bg-zinc-900 mt-2 py-2">
              <View className="px-4 py-2">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[17px] font-semibold text-black dark:text-white">
                    Orte
                  </Text>
                  <Button
                    onPress={() => {
                      setShowLocationSearch(true);
                      locationSearchSheetRef.current?.expand();
                    }}
                    icon={PlusCircleIcon}
                  >
                    Hinzufügen
                  </Button>
                </View>

                {locations.length === 0 ? (
                  <Text className="text-[15px] text-gray-500 dark:text-gray-400">
                    Keine Orte hinzugefügt
                  </Text>
                ) : (
                  <View className="gap-2">
                    {locations.map((location, index) => (
                      <View
                        key={index}
                        className="flex-row items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg"
                      >
                        <View className="flex-1 mr-3">
                          <Text className="text-[15px] font-medium text-black dark:text-white">
                            {location.title}
                          </Text>
                          {location.address && (
                            <Text className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                              {location.address}
                            </Text>
                          )}
                        </View>
                        <Button
                          onPress={() => handleRemoveLocation(index)}
                          icon={TrashIcon}
                          variant="destructive"
                          size="icon"
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Description */}
            <View className="bg-white dark:bg-zinc-900 mt-2 py-2">
              <View className="px-4 py-4">
                <TextInput
                  ref={descriptionInputRef}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Beschreibung hinzufügen"
                  placeholderTextColor={
                    isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"
                  }
                  multiline
                  className="text-[17px] leading-[22px] text-black dark:text-white min-h-[100px]"
                  onFocus={() => {
                    // Scroll to end when description input is focused
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                  }}
                />
              </View>
            </View>

            {/* Source Link */}
            <View className="bg-white dark:bg-zinc-900 mt-2 py-2">
              <View className="px-4 py-4 gap-2">
                <Text className="text-[17px] font-semibold text-black dark:text-white">
                  Link (optional)
                </Text>
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  placeholder="Originalquelle (z.B. Instagram-Link)"
                  placeholderTextColor={
                    isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  className="text-[15px] leading-5 text-black dark:text-white px-0 py-2"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Bottom Sheets */}
      {showActivityPicker && (
        <ActivityBottomSheet
          selected={selectedActivity}
          onClose={() => setShowActivityPicker(false)}
          onSelect={(value) => {
            setSelectedActivity(value);
            setShowActivityPicker(false);
          }}
        />
      )}
      {showStartPicker && (
        <DateTimeBottomSheet
          title="Startzeit wählen"
          accentColor={accentColor}
          initialDate={startDate}
          onClose={() => setShowStartPicker(false)}
          onSelect={(d) => {
            setStartDate(d);
            setShowStartPicker(false);
          }}
        />
      )}
      {showEndPicker && (
        <DateTimeBottomSheet
          title="Endzeit wählen"
          accentColor={accentColor}
          initialDate={endDate}
          onClose={() => setShowEndPicker(false)}
          onSelect={(d) => {
            setEndDate(d);
            setShowEndPicker(false);
          }}
        />
      )}

      {/* Location Search Bottom Sheet */}
      <BottomSheet
        ref={locationSearchSheetRef}
        index={-1}
        snapPoints={["80%"]}
        enablePanDownToClose
        onClose={() => {
          setShowLocationSearch(false);
          setLocationSearchQuery("");
        }}
        backgroundStyle={{
          backgroundColor: isDark ? "#18181B" : "#FFFFFF",
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? "#FFFFFF" : "#000000",
        }}
      >
        <BottomSheetView className="flex-1 px-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[20px] font-bold text-black dark:text-white">
              Ort suchen
            </Text>
            <Button
              onPress={() => {
                locationSearchSheetRef.current?.close();
              }}
              icon={XIcon}
              size="icon"
            />
          </View>

          <TextInput
            value={locationSearchQuery}
            onChangeText={setLocationSearchQuery}
            placeholder="Ort suchen..."
            placeholderTextColor={
              isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"
            }
            className="text-[17px] text-black dark:text-white bg-gray-100 dark:bg-zinc-800 rounded-lg px-4 py-3 mb-4"
            autoFocus
          />

          {isSearchingLocations && (
            <View className="py-8 items-center">
              <Text className="text-[15px] text-gray-500 dark:text-gray-400">
                Suche...
              </Text>
            </View>
          )}

          {!isSearchingLocations &&
            locationSearchQuery.length > 2 &&
            locationSearchResults &&
            "locations" in locationSearchResults &&
            locationSearchResults.locations && (
              <ScrollView className="flex-1">
                {locationSearchResults.locations.length === 0 ? (
                  <View className="py-8 items-center">
                    <Text className="text-[15px] text-gray-500 dark:text-gray-400">
                      Keine Ergebnisse gefunden
                    </Text>
                  </View>
                ) : (
                  <View className="gap-2">
                    {locationSearchResults.locations.map((location) => (
                      <Pressable
                        key={location.id}
                        onPress={() =>
                          handleAddLocation({
                            name: location.name,
                            address: location.address,
                            latitude: location.latitude,
                            longitude: location.longitude,
                          })
                        }
                        className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg"
                      >
                        <Text className="text-[15px] font-medium text-black dark:text-white">
                          {location.name}
                        </Text>
                        {location.address && (
                          <Text className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                            {location.address}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

          {locationSearchQuery.length <= 2 && (
            <View className="py-8 items-center">
              <Text className="text-[15px] text-gray-500 dark:text-gray-400">
                Gib mindestens 3 Zeichen ein, um zu suchen
              </Text>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
