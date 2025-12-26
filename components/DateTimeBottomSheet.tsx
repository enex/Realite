import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

export function DateTimeBottomSheet({
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
  const [selected, setSelected] = useState<Date>(initialDate);

  // On Android, the picker is modal and handles its own close
  // On iOS, we show it inline in the bottom sheet
  if (Platform.OS === "android") {
    return (
      <DateTimePicker
        value={selected}
        mode="datetime"
        display="default"
        onChange={(event, date) => {
          if (event.type === "set" && date) {
            setSelected(date);
            onSelect(date);
            onClose();
          } else if (event.type === "dismissed") {
            onClose();
          }
        }}
      />
    );
  }

  // iOS: Show inline picker in bottom sheet
  return (
    <View className="absolute inset-0 bg-black/20 justify-end">
      <Pressable className="flex-1" onPress={onClose} />
      <View className="bg-white dark:bg-zinc-900 rounded-t-[20px] pb-3 pt-2">
        <View className="items-center py-1.5">
          <Text className="text-[15px] leading-5 text-black dark:text-zinc-50">
            {title}
          </Text>
        </View>
        <View className="h-[420px] items-center justify-center">
          <DateTimePicker
            value={selected}
            mode="datetime"
            display="spinner"
            onChange={(_, date) => {
              if (date) {
                setSelected(date);
              }
            }}
            style={{ height: 200 }}
          />
        </View>
        <View className="px-4 pt-2">
          <Pressable
            onPress={() => {
              onSelect(selected);
              onClose();
            }}
            className="bg-gray-200 dark:bg-zinc-800 rounded-xl py-3 items-center mb-2"
            style={{ backgroundColor: accentColor }}
          >
            <Text className="text-[15px] leading-5 text-white font-semibold">
              Fertig
            </Text>
          </Pressable>
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
