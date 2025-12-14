import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { orpc } from "@/client/orpc";
import SmartDateTimePicker from "@/components/SmartDateTimePicker";
import { Icon } from "@/components/ui/Icon";
import {
  activities,
  getActivityGradient,
  getActivityLabel,
  type ActivityId,
} from "@/shared/activities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import tinycolor from "tinycolor2";

export default function PlanEdit() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id as string;
  const insets = useSafeAreaInsets();
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
  const [isAllDay, setIsAllDay] = useState(false);
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
        <View
          className="flex-row items-center justify-between border-b border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900"
          style={{
            paddingTop: insets.top,
            paddingHorizontal: 16,
            paddingBottom: 8,
          }}
        >
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
            {/* All-day Toggle */}
            <EditRow
              icon="paperplane"
              label="Ganztägig"
              value={null}
              rightComponent={
                <Switch
                  value={isAllDay}
                  onValueChange={setIsAllDay}
                  trackColor={{
                    false: isDark ? "#3F3F3F" : "#E5E5EA",
                    true: accentColor,
                  }}
                  thumbColor="#FFFFFF"
                />
              }
              accentColor={accentColor}
            />

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

          {/* Actions Section */}
          <View className="bg-white dark:bg-zinc-900 mt-2 py-2">
            <EditRow
              icon="person.2"
              label="Personen hinzufügen"
              value={null}
              onPress={() => {}}
              accentColor={accentColor}
            />
            <EditRow
              icon="video"
              label="Videokonferenz hinzufügen"
              value={null}
              onPress={() => {}}
              accentColor={accentColor}
            />
            <EditRow
              icon="building.2"
              label="Raum hinzufügen"
              value={null}
              onPress={() => {}}
              accentColor={accentColor}
            />
            <EditRow
              icon="mappin.and.ellipse"
              label="Ort hinzufügen"
              value={null}
              onPress={() => {}}
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

          {/* Reminders Section */}
          <View className="bg-white dark:bg-zinc-900 mt-2 py-2">
            <EditRow
              icon="bell"
              label="Zum Zeitpunkt des Termins"
              value={null}
              rightComponent={
                <Pressable>
                  <Icon
                    name="xmark"
                    size={16}
                    color={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                  />
                </Pressable>
              }
              accentColor={accentColor}
            />
            <EditRow
              icon="bell"
              label="5 Minuten vorher"
              value={null}
              rightComponent={
                <Pressable>
                  <Icon
                    name="xmark"
                    size={16}
                    color={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                  />
                </Pressable>
              }
              accentColor={accentColor}
            />
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

function EditRow({
  icon,
  label,
  value,
  onPress,
  rightComponent,
  accentColor = "#0F172A",
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  value: string | null;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  accentColor?: string;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const interactive = typeof onPress === "function";

  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      className="flex-row items-center px-4 py-4"
      style={{ opacity: interactive ? 1 : 0.9 }}
    >
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-4 bg-white/10 dark:bg-white/10"
        style={{
          backgroundColor: isDark
            ? "rgba(255,255,255,0.1)"
            : tinycolor(accentColor).setAlpha(0.1).toRgbString(),
        }}
      >
        <Icon name={icon} size={18} color={accentColor} />
      </View>
      <View className="flex-1">
        <Text className="text-[17px] leading-[22px] text-black dark:text-white">
          {label}
        </Text>
        {value && (
          <Text className="text-[15px] leading-5 text-gray-600 dark:text-white/60 mt-1">
            {value}
          </Text>
        )}
      </View>
      {rightComponent ||
        (interactive && (
          <Icon
            name="chevron.right"
            size={16}
            color={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
          />
        ))}
    </Pressable>
  );
}

function ActivityBottomSheet({
  selected,
  onClose,
  onSelect,
}: {
  selected: ActivityId | undefined;
  onClose: () => void;
  onSelect: (id: ActivityId) => void;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View className="absolute inset-0 bg-black/20 justify-end">
      <Pressable className="flex-1" onPress={onClose} />
      <View className="bg-white dark:bg-zinc-900 rounded-t-[20px] pb-6 pt-2 max-h-[80%]">
        <View className="h-1 w-11 bg-gray-300 dark:bg-zinc-700 rounded-sm self-center mb-2" />
        <ScrollView className="max-h-[500px]">
          {Object.entries(activities).map(([groupId, group]) => (
            <View key={groupId} className="px-4 pt-3">
              <Text className="text-[12px] leading-4 text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                {group.nameDe || group.name}
              </Text>
              <View className="gap-2">
                <Pressable
                  onPress={() => onSelect(groupId as ActivityId)}
                  className={`px-3 py-3 rounded-xl ${
                    (selected as string) === groupId
                      ? isDark
                        ? "bg-blue-500/30"
                        : "bg-blue-50"
                      : isDark
                        ? "bg-zinc-800"
                        : "bg-gray-100"
                  }`}
                >
                  <Text className="text-white dark:text-zinc-50">
                    {group.nameDe || group.name}
                  </Text>
                </Pressable>
                {Object.entries(group.subActivities).map(([subId, sub]) => {
                  const value = `${groupId}/${subId}` as ActivityId;
                  const isSelected = (selected as string) === (value as string);
                  return (
                    <Pressable
                      key={value}
                      onPress={() => onSelect(value)}
                      className={`px-3 py-3 rounded-xl ${
                        isSelected
                          ? isDark
                            ? "bg-blue-500/30"
                            : "bg-blue-50"
                          : isDark
                            ? "bg-zinc-800"
                            : "bg-gray-100"
                      }`}
                    >
                      <Text className="text-white dark:text-zinc-50">
                        {(sub as any).nameDe || (sub as any).name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <View className="h-4" />
        </ScrollView>
        <View className="px-4 pt-2">
          <Pressable
            onPress={onClose}
            className="bg-gray-200 dark:bg-zinc-800 rounded-xl py-3 items-center"
          >
            <Text className="text-[15px] leading-5 text-black dark:text-zinc-50">
              Abbrechen
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function DateTimeBottomSheet({
  title,
  initialDate,
  onClose,
  onSelect,
  accentColor,
}: {
  title: string;
  initialDate: Date;
  onClose: () => void;
  onSelect: (d: Date) => void;
  accentColor: string;
}) {
  const [selected, setSelected] = useState<Date[]>([initialDate]);
  return (
    <View className="absolute inset-0 bg-black/20 justify-end">
      <Pressable className="flex-1" onPress={onClose} />
      <View className="bg-white dark:bg-zinc-900 rounded-t-[20px] pb-3 pt-2">
        <View className="items-center py-1.5">
          <Text className="text-[15px] leading-5 text-black dark:text-zinc-50">
            {title}
          </Text>
        </View>
        <View className="h-[420px]">
          <SmartDateTimePicker
            selectedDates={selected}
            onDateSelect={(d) => {
              setSelected([d]);
              onSelect(d);
            }}
            onDateRemove={() => {}}
            accentColor={accentColor}
          />
        </View>
        <View className="px-4 pt-2">
          <Pressable
            onPress={onClose}
            className="bg-gray-200 dark:bg-zinc-800 rounded-xl py-3 items-center"
          >
            <Text className="text-[15px] leading-5 text-black dark:text-zinc-50">
              Abbrechen
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
