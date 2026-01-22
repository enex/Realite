import { formatLocalTime } from "@/shared/utils/datetime";
import { MaterialIcons } from "@expo/vector-icons";
import { useUniwind } from "uniwind";
import React, { useCallback, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SmartDateTimePicker from "./smart-date-time-picker";

interface OnboardingDateTimePickerProps {
  selectedDates: Date[];
  timeRanges?: { start: Date; end: Date; day: string }[];
  onDateSelect: (date: Date) => void;
  onDateRemove: (index: number) => void;
  onTimeRangesChange?: (
    ranges: { start: Date; end: Date; day: string }[],
  ) => void;
  accentColor: string;
}

export default function OnboardingDateTimePicker({
  selectedDates,
  timeRanges = [],
  onDateSelect,
  onDateRemove,
  onTimeRangesChange,
  accentColor,
}: OnboardingDateTimePickerProps) {
  const { theme } = useUniwind();
  const isDark = theme === "dark";
  const [showPicker, setShowPicker] = useState(false);

  const handleDateSelect = useCallback(
    (date: Date) => {
      onDateSelect(date);
      // Don't auto-close to allow multiple selections
    },
    [onDateSelect],
  );

  return (
    <>
      <View className="mb-6">
        <Text className="mb-2 text-sm font-medium text-foreground">
          Zeitvorschläge
        </Text>

        {timeRanges.length === 0 ? (
          <Pressable
            onPress={() => setShowPicker(true)}
            className="flex-row items-center justify-center rounded-lg border-2 border-dashed border-input bg-background p-6"
          >
            <MaterialIcons
              name="add"
              size={24}
              color={isDark ? "#818CF8" : "#4F46E5"}
            />
            <Text className="ml-2 text-base font-medium text-foreground">
              Termin hinzufügen
            </Text>
          </Pressable>
        ) : (
          <View className="flex-col gap-2">
            {timeRanges.map((range, index) => (
              <View
                key={index}
                className="flex-row items-center justify-between rounded-lg border border-input bg-background p-3"
              >
                <View>
                  <Text className="font-medium text-foreground">
                    {range.day}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {formatLocalTime(range.start)} -{" "}
                    {formatLocalTime(range.end)}
                  </Text>
                </View>
                <Pressable onPress={() => onDateRemove(index)}>
                  <MaterialIcons name="close" size={20} color="#666" />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={() => setShowPicker(true)}
              className="flex-row items-center justify-center rounded-lg border border-input bg-background p-3"
            >
              <MaterialIcons
                name="add"
                size={20}
                color={isDark ? "#818CF8" : "#4F46E5"}
              />
              <Text className="ml-2 text-foreground">
                Weiteren Termin hinzufügen
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPicker(false)}
      >
        <SafeAreaView
          className="h-full flex-1 bg-background"
          style={{ backgroundColor: isDark ? "#09090B" : "#FFFFFF" }}
        >
          <View className="flex-row items-center justify-between border-b border-border p-4">
            <Text className="text-lg font-semibold text-foreground">
              Termin wählen
            </Text>
            <Pressable onPress={() => setShowPicker(false)}>
              <MaterialIcons name="close" size={24} color="#666" />
            </Pressable>
          </View>

          <View className="flex-1">
            <SmartDateTimePicker
              selectedDates={selectedDates}
              onDateSelect={handleDateSelect}
              onDateRemove={onDateRemove}
              onTimeRangesChange={onTimeRangesChange}
              accentColor={accentColor}
            />
          </View>

          <View className="border-t border-border p-4">
            <Pressable
              onPress={() => setShowPicker(false)}
              className="items-center rounded-lg bg-primary px-6 py-4"
            >
              <Text className="text-lg font-semibold text-primary-foreground">
                Fertig
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
