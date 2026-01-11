import React from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";
import { ChevronRightIcon } from "lucide-react-native";

import { Icon } from "@/components/ui/icon";
import tinycolor from "tinycolor2";

export function EditRow({
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
            name={ChevronRightIcon}
            size={16}
            color={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
          />
        ))}
    </Pressable>
  );
}
