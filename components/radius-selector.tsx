import { useColorScheme } from "nativewind";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

interface RadiusSelectorProps {
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
  style?: {
    color: string;
  };
}

const RADIUS_OPTIONS = [
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: 200, label: "200 km" },
  { value: 500, label: "500 km" },
  { value: 1000, label: "1000 km" },
  { value: 2000, label: "2000 km" },
  { value: 5000, label: "5000 km" },
  { value: 10000, label: "10000 km" },
  { value: 20000, label: "20000 km" },
  { value: 50000, label: "50000 km" },
];

export default function RadiusSelector({
  radiusKm,
  onRadiusChange,
  style = { color: "#4F46E5" },
}: RadiusSelectorProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="h-8 flex-shrink-0 flex-grow-0"
    >
      <View className="flex-row items-center gap-2 px-4">
        {RADIUS_OPTIONS.map((option) => {
          const isSelected = radiusKm === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onRadiusChange(option.value)}
              className="rounded-full border px-3 py-1"
              style={{
                borderColor: isSelected
                  ? style.color
                  : isDark
                    ? "#374151"
                    : "#D1D5DB",
                backgroundColor: isSelected
                  ? `${style.color}20`
                  : isDark
                    ? "#1F2937"
                    : "#F9FAFB",
              }}
            >
              <Text
                className="text-sm"
                style={{
                  color: isSelected
                    ? style.color
                    : isDark
                      ? "#D1D5DB"
                      : "#6B7280",
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
