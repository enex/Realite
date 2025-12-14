import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { orpc } from "@/client/orpc";
import { ActivityBottomSheet } from "@/components/ActivityBottomSheet";
import { DateTimeBottomSheet } from "@/components/DateTimeBottomSheet";
import { EditRow } from "@/components/EditRow";
import { Icon } from "@/components/ui/Icon";
import {
  getActivityGradient,
  getActivityLabel,
  type ActivityId,
} from "@/shared/activities";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  const [isAllDay, setIsAllDay] = useState(false);
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
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      activity: selectedActivity,
      locations: initialPlanData?.locations,
      inputText: initialPlanData?.inputText,
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

  const accentColor = c3 || "#007AFF";

  return (
    <View className="flex-1 bg-gray-100 dark:bg-black">
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
          <Pressable
            className="w-10 h-10 rounded-full items-center justify-center"
            onPress={() => router.back()}
          >
            <Icon
              name="xmark"
              size={20}
              color={isDark ? "#FFFFFF" : "#000000"}
            />
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={createPlan.isPending}
            className="px-4 py-2 rounded-full min-w-[100px] items-center"
            style={{ backgroundColor: accentColor }}
          >
            <Text className="text-[15px] leading-5 text-white font-semibold">
              {createPlan.isPending ? "Erstelle..." : "Erstellen"}
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
              icon="clock"
              label={formatDate(startDate)}
              value={formatTime(startDate)}
              onPress={() => setShowStartPicker(true)}
              accentColor={accentColor}
            />

            {/* End Date/Time */}
            <EditRow
              icon="clock"
              label={formatDate(endDate)}
              value={formatTime(endDate)}
              onPress={() => setShowEndPicker(true)}
              accentColor={accentColor}
            />

            {/* Time Zone */}
            <EditRow
              icon="globe"
              label="Mitteleuropäische Normalzeit"
              value={null}
              accentColor={accentColor}
            />

            {/* Recurrence */}
            <EditRow
              icon="arrow.clockwise"
              label="Wiederholung"
              value="Täglich"
              onPress={() => {}}
              accentColor={accentColor}
            />

            {/* Activity */}
            <EditRow
              icon="calendar"
              label="Aktivität"
              value={getActivityLabel(selectedActivity)}
              onPress={() => setShowActivityPicker(true)}
              accentColor={accentColor}
            />
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
    </View>
  );
}
