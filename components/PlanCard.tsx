import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useRef } from "react";
import { Animated, ColorValue, Pressable, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/IconSymbol";

// iOS Design System
const typography = {
  title3: { fontSize: 20, fontWeight: "600" as const, lineHeight: 25 },
  subheadline: { fontSize: 15, fontWeight: "400" as const, lineHeight: 20 },
  footnote: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  caption1: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
};

const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
};

export const shadows = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

type PlanListItem = {
  id: string;
  title: string;
  date: string;
  status: "committed" | "pending";
  activity: "food" | "outdoor" | "social" | "sports" | "culture";
  location?: string;
  participants?: string[];
};

interface PlanCardProps {
  item: PlanListItem;
  index: number;
}

const getActivityGradient = (
  activity: string
): [ColorValue, ColorValue, ColorValue] => {
  switch (activity) {
    case "food":
      return ["#fed7aa", "#fdba74", "#fb923c"]; // stronger orange gradient
    case "outdoor":
      return ["#bbf7d0", "#86efac", "#4ade80"]; // stronger green gradient
    case "social":
      return ["#bfdbfe", "#93c5fd", "#3b82f6"]; // stronger blue gradient
    case "sports":
      return ["#e9d5ff", "#c4b5fd", "#8b5cf6"]; // stronger purple gradient
    case "culture":
      return ["#fce7f3", "#fbcfe8", "#f472b6"]; // stronger pink gradient
    default:
      return ["#f1f5f9", "#e2e8f0", "#94a3b8"]; // stronger gray gradient
  }
};

const getActivityIconColor = (activity: string) => {
  switch (activity) {
    case "food":
      return "#ea580c"; // orange-600
    case "outdoor":
      return "#059669"; // emerald-600
    case "social":
      return "#2563eb"; // blue-600
    case "sports":
      return "#9333ea"; // purple-600
    case "culture":
      return "#ec4899"; // pink-600
    default:
      return "#4b5563"; // gray-600
  }
};

const getActivityIcon = (activity: string) => {
  switch (activity) {
    case "food":
      return "fork.knife";
    case "outdoor":
      return "mountain.2";
    case "social":
      return "person.2";
    case "sports":
      return "figure.run";
    case "culture":
      return "theatermasks";
    default:
      return "calendar";
  }
};

export const PlanCard = ({ item, index }: PlanCardProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Staggered entrance animation
  useMemo(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [index]);

  const handlePressIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
        marginBottom: spacing.md,
      }}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ borderRadius: 20 }}
      >
        <LinearGradient
          colors={getActivityGradient(item.activity)}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 20,
            padding: spacing.lg,
            position: "relative",
            overflow: "hidden",
            ...shadows.medium,
          }}
        >
          {/* Large background icon */}
          <View
            style={{
              position: "absolute",
              top: -16,
              right: -16,
              opacity: 0.35,
              zIndex: 0,
            }}
          >
            <IconSymbol
              name={getActivityIcon(item.activity)}
              size={120}
              color={getActivityIconColor(item.activity)}
            />
          </View>

          {/* Content */}
          <View style={{ position: "relative", zIndex: 10 }}>
            <View style={{ marginBottom: spacing.md }}>
              <Text
                style={{
                  ...typography.title3,
                  color: "#1C1C1E",
                  marginBottom: spacing.sm,
                }}
              >
                {item.title}
              </Text>
              {item.location && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                  }}
                >
                  <BlurView
                    intensity={60}
                    style={{
                      borderRadius: 12,
                      padding: 6,
                      overflow: "hidden",
                    }}
                  >
                    <IconSymbol name="location" size={12} color="#8E8E93" />
                  </BlurView>
                  <Text
                    style={{
                      ...typography.subheadline,
                      color: "#3C3C43",
                    }}
                  >
                    {item.location}
                  </Text>
                </View>
              )}
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {item.participants && item.participants.length > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flexDirection: "row" }}>
                    {item.participants.map((participant, idx) => (
                      <View
                        key={participant}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 2,
                          borderColor: "rgba(255, 255, 255, 0.5)",
                          marginLeft: idx > 0 ? -12 : 0,
                          zIndex: item.participants!.length - idx,
                          ...shadows.small,
                        }}
                      >
                        <Text
                          style={{
                            ...typography.footnote,
                            fontWeight: "600",
                            color: "#1C1C1E",
                          }}
                        >
                          {participant}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {item.participants.length > 1 && (
                    <Text
                      style={{
                        ...typography.caption1,
                        color: "#3C3C43",
                        marginLeft: spacing.sm,
                      }}
                    >
                      +{item.participants.length - 1} more
                    </Text>
                  )}
                </View>
              )}

              <BlurView
                intensity={80}
                style={{
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  overflow: "hidden",
                  ...shadows.small,
                }}
              >
                <Text
                  style={{
                    ...typography.caption1,
                    fontWeight: "600",
                    color: "#1C1C1E",
                  }}
                >
                  {new Date(item.date).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </BlurView>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};
