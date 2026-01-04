import React from "react";
import {
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { activities, type ActivityId } from "@/shared/activities";

export function ActivityBottomSheet({
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
