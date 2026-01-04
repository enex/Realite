import { Image } from "expo-image";
import React from "react";
import { Text, View, useColorScheme } from "react-native";

interface AvatarProps {
  name: string;
  image?: string | null;
  size?: number;
  className?: string;
}

const getInitials = (name: string): string => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export function Avatar({
  name,
  image,
  size = 40,
  className = "",
}: AvatarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const initials = getInitials(name);

  return (
    <View
      className={`rounded-full items-center justify-center bg-gray-100 dark:bg-zinc-800 ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          contentFit="cover"
        />
      ) : (
        <Text
          className="font-semibold text-black dark:text-white"
          style={{
            fontSize: size * 0.35,
            lineHeight: size * 0.4,
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
