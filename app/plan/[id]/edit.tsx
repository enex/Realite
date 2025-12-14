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
import { SafeAreaView } from "react-native-safe-area-context";

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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        activity: selectedActivity,
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
          <Pressable className="w-10 h-10 rounded-full items-center justify-center">
            <Icon
              name="xmark"
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
