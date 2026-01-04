import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { orpc } from "@/client/orpc";
import { ActivityBottomSheet } from "@/components/ActivityBottomSheet";
import { DateTimeBottomSheet } from "@/components/DateTimeBottomSheet";
import { EditRow } from "@/components/EditRow";
import { Icon } from "@/components/ui/icon";
import { useLocation } from "@/hooks/useLocation";
import {
  getActivityGradient,
  getActivityLabel,
  type ActivityId,
} from "@/shared/activities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarIcon,
  ClockIcon,
  PlusCircleIcon,
  TrashIcon,
  XIcon,
} from "lucide-react-native";

export default function PlanEdit() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id as string;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const queryClient = useQueryClient();
  const { data: plan } = useQuery(
    orpc.plan.get.queryOptions({ input: { id } })
  );

  const changePlan = useMutation(
    orpc.plan.change.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        router.back();
      },
      onError: (error: any) => {
        Alert.alert(
          "Fehler",
          "Konnte Plan nicht speichern. Bitte versuche es erneut."
        );
      },
    })
  );

  const activity = (plan?.activity ?? undefined) as ActivityId | undefined;
  const [, , c3] = getActivityGradient(activity);

  // Form state
  const [title, setTitle] = useState(plan?.title || "");
  const [description, setDescription] = useState(plan?.description || "");
  const [url, setUrl] = useState(plan?.url || "");
  const [startDate, setStartDate] = useState<Date>(
    plan?.startDate ? new Date(plan.startDate as unknown as string) : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    plan?.endDate
      ? new Date(plan.endDate as unknown as string)
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
  const [locations, setLocations] = useState<Location[]>([]);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const { latitude, longitude, hasPermission } = useLocation();

  const locationSearchSheetRef = React.useRef<BottomSheet>(null);

  // Initialize locations from plan data
  useEffect(() => {
    if (plan?.locations && Array.isArray(plan.locations)) {
      setLocations(
        plan.locations.map((loc: any) => ({
          title: loc.title || "",
          address: loc.address || undefined,
          latitude: loc.latitude,
          longitude: loc.longitude,
          url: loc.url || undefined,
          description: loc.description || undefined,
          category: loc.category || undefined,
        }))
      );
    }
  }, [plan]);

  useEffect(() => {
    setUrl(plan?.url || "");
  }, [plan?.url]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Fehler", "Bitte gib einen Titel ein.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    changePlan.mutate({
      id,
      plan: {
        title: title.trim(),
        description: description.trim() || undefined,
        url: url.trim() || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        activity: selectedActivity,
        locations: locations.length > 0 ? locations : undefined,
      },
    });
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

  if (!plan) {
    return (
      <SafeAreaView className="flex-1 bg-black dark:bg-black">
        <View className="p-6">
          <Text className="text-[15px] leading-5 text-gray-500 dark:text-gray-400">
            Plan nicht gefunden
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const accentColor = c3;

  return (
    <View className="flex-1 bg-gray-100 dark:bg-black">
      <View className="flex-1">
        {/* Fixed Header */}
        <View className="pt-safe px-4 pb-2 flex-row items-center justify-between border-b border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900">
          <Pressable
            className="w-10 h-10 rounded-full items-center justify-center"
            onPress={() => router.back()}
          >
            <Icon
              name={XIcon}
              size={20}
              color={isDark ? "#FFFFFF" : "#000000"}
            />
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={changePlan.isPending}
            className="px-4 py-2 rounded-full min-w-[100px] items-center"
            style={{ backgroundColor: accentColor }}
          >
            <Text className="text-[15px] leading-5 text-white font-semibold">
              {changePlan.isPending ? "Speichern..." : "Speichern"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
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
                <Pressable
                  onPress={() => {
                    setShowLocationSearch(true);
                    locationSearchSheetRef.current?.expand();
                  }}
                  className="flex-row items-center"
                >
                  <Icon name={PlusCircleIcon} size={20} color={accentColor} />
                  <Text
                    className="text-[15px] ml-1"
                    style={{ color: accentColor }}
                  >
                    Hinzufügen
                  </Text>
                </Pressable>
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
                      <Pressable
                        onPress={() => handleRemoveLocation(index)}
                        className="w-8 h-8 items-center justify-center"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon
                          name={TrashIcon}
                          size={20}
                          color={isDark ? "#EF4444" : "#DC2626"}
                        />
                      </Pressable>
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
                value={description}
                onChangeText={setDescription}
                placeholder="Beschreibung hinzufügen"
                placeholderTextColor={
                  isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"
                }
                multiline
                className="text-[17px] leading-[22px] text-black dark:text-white min-h-[100px]"
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
            <Pressable
              onPress={() => {
                locationSearchSheetRef.current?.close();
              }}
            >
              <Icon
                name={XIcon}
                size={20}
                color={isDark ? "#FFFFFF" : "#000000"}
              />
            </Pressable>
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
