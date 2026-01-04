import { Platform, Pressable, Switch, View } from "react-native";

import { ThemedText } from "@/components/themed-text";

export function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      className="flex-row items-center justify-between py-1"
    >
      <ThemedText className="text-gray-700 dark:text-gray-300">
        {label}
      </ThemedText>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#D1D5DB", true: "#6366F1" }}
        thumbColor={
          Platform.OS === "android"
            ? value
              ? "#ffffff"
              : "#f4f4f5"
            : undefined
        }
        ios_backgroundColor="#D1D5DB"
      />
    </Pressable>
  );
}
