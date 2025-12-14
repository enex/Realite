import { Platform, Switch, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";

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
    <View className="flex-row items-center justify-between py-3">
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
    </View>
  );
}
