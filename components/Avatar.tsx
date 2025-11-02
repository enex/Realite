import React from "react";
import { Image, Text, View } from "react-native";

function Avatar({
  size = 28,
  image,
  name,
}: {
  size?: number;
  image?: string;
  name?: string;
}) {
  const initials = (name || "?")
    .toString()
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: "#E5E5EA",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {image ? (
        <Image source={{ uri: image }} style={{ width: size, height: size }} />
      ) : (
        <Text
          style={{
            fontSize: 12,
            fontWeight: "400" as const,
            lineHeight: 16,
            color: "#1C1C1E",
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

export default React.memo(Avatar);
