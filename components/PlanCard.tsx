import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import {
  getActivityGradient,
  getActivityIcon,
  getActivityIconColor,
  type ActivityId,
} from "@/shared/activities";
import { formatLocalTime } from "@/shared/utils/datetime";
import { useRouter } from "expo-router";

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
  activity: ActivityId;
  locations?: {
    title: string;
    address?: string;
    latitude: number;
    longitude: number;
  }[];
  participants?: { name: string; image?: string }[];
};

interface PlanCardProps {
  item: PlanListItem;
  index: number;
}

const getInitials = (name: string): string => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const getFirstName = (name: string): string => {
  const trimmed = String(name).trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0];
};

export function PlanCard({ item, index }: PlanCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

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
        onPress={() =>
          router.push({ pathname: "/plan/[id]", params: { id: item.id } })
        }
        style={{ borderRadius: 20 }}
      >
        {/* Shadow wrapper to avoid clipping shadows by overflow hidden */}
        <View
          style={{ borderRadius: 20, overflow: "visible", ...shadows.medium }}
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
            }}
          >
            {/* Large background icon */}
            <View className="absolute -top-4 -right-4 opacity-35 z-0">
              <Icon
                name={getActivityIcon(item.activity)}
                size={120}
                color={getActivityIconColor(item.activity)}
              />
            </View>

            {/* Time chip - absolute top-right for consistent placement */}
            <View className="absolute top-3 right-3" pointerEvents="none">
              <Glass
                intensity={80}
                className="rounded-xl px-3 py-1.5 overflow-hidden border border-white/60 dark:border-white/20"
                style={shadows.small}
              >
                <Text
                  className="dark:text-zinc-50"
                  style={{
                    ...typography.caption1,
                    fontWeight: "600",
                  }}
                >
                  {formatLocalTime(item.date)}
                </Text>
              </Glass>
            </View>

            {/* Content */}
            <View className="relative z-10">
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
                {/* Owner line removed in favor of participant avatars row below */}
                {item.locations &&
                  item.locations.map((location, index) => (
                    <View
                      key={index}
                      className="flex-row items-center gap-2"
                      style={{
                        marginBottom: spacing.sm,
                      }}
                    >
                      <Icon
                        name="mappin.and.ellipse"
                        size={14}
                        color="#1C1C1E"
                      />
                      <Text
                        style={{
                          ...typography.subheadline,
                          color: "#1C1C1E",
                        }}
                      >
                        {location.title}
                      </Text>
                    </View>
                  ))}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-start",
                }}
              >
                {item.participants && item.participants.length > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ flexDirection: "row", marginRight: 8 }}>
                      {item.participants.slice(0, 5).map((p, idx) => (
                        <View
                          key={`${p.name}-${idx}`}
                          style={{
                            marginLeft: idx > 0 ? -10 : 0,
                            zIndex: item.participants!.length - idx,
                            ...shadows.small,
                            borderWidth: 2,
                            borderColor: "rgba(255, 255, 255, 0.5)",
                            borderRadius: 14,
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                          }}
                        >
                          <Avatar name={p.name} image={p.image} size={28} />
                        </View>
                      ))}
                    </View>
                    <Text
                      style={{
                        ...typography.caption1,
                        color: "#1C1C1E",
                      }}
                      numberOfLines={1}
                    >
                      {(() => {
                        const firstTwo = item.participants
                          .slice(0, 2)
                          .map((p) => getFirstName(p.name));
                        const remaining =
                          item.participants.length - firstTwo.length;
                        const label =
                          remaining > 0
                            ? `${firstTwo.join(", ")} +${remaining}`
                            : firstTwo.join(", ");
                        return item.participants.length > 1
                          ? `Gruppe: ${label}`
                          : firstTwo.join(", ");
                      })()}
                    </Text>
                  </View>
                )}

                {/* Time chip moved to absolute top-right */}
              </View>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
}
