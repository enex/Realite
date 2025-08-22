import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useCallback, useMemo, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import orpc from "@/client/orpc";
import AIPlanBottomSheet, {
  AIPlanBottomSheetRef,
} from "@/components/AIPlanBottomSheet";
import { PlanCard, shadows } from "@/components/PlanCard";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import type { ActivityId } from "@/shared/activities";
import { useQuery } from "@tanstack/react-query";

// iOS Design System (reduced to what's needed for this screen)
const typography = {
  largeTitle: { fontSize: 34, fontWeight: "700" as const, lineHeight: 41 },
  headline: { fontSize: 17, fontWeight: "600" as const, lineHeight: 22 },
  subheadline: { fontSize: 15, fontWeight: "400" as const, lineHeight: 20 },
  caption1: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

type PlanListItem = {
  id: string;
  title: string;
  date: string;
  status: "committed" | "pending";
  activity: ActivityId;
  location?: string;
  participants?: string[];
};

type GroupedPlans = {
  date: string;
  dayLabel: string;
  plans: PlanListItem[];
};

export default function PlansScreen() {
  const aiPlanBottomSheetRef = useRef<AIPlanBottomSheetRef>(null);
  const { data: plans, error } = useQuery(orpc.plan.myPlans.queryOptions({}));

  // TODO: Replace with data from ORPC once endpoint is available
  const data = useMemo<PlanListItem[]>(() => {
    if (!plans) return [];

    return plans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      date: plan.startDate.toISOString(),
      status: "committed",
      activity: plan.activity as ActivityId,
      location: "",
      participants: [],
    }));
  }, [plans]);

  const groupedPlans = useMemo(() => {
    const groups: Record<string, PlanListItem[]> = {};

    data.forEach((plan) => {
      const date = new Date(plan.date);
      const dateKey = date.toDateString();

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(plan);
    });

    return Object.entries(groups)
      .map(([dateKey, plans]) => {
        const date = new Date(dateKey);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let dayLabel = date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });

        if (date.toDateString() === today.toDateString()) {
          dayLabel = "Today";
        } else if (date.toDateString() === tomorrow.toDateString()) {
          dayLabel = "Tomorrow";
        }

        return {
          date: dateKey,
          dayLabel,
          plans: plans.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          ),
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  const renderDayGroup = ({
    item,
    index,
  }: {
    item: GroupedPlans;
    index: number;
  }) => (
    <View style={{ marginBottom: spacing.xl }}>
      <View
        style={{
          marginBottom: spacing.md,
          paddingHorizontal: spacing.xs,
        }}
      >
        <Text
          style={{
            ...typography.caption1,
            color: "#8E8E93",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {item.dayLabel}
        </Text>
      </View>
      {item.plans.map((plan, planIndex) => (
        <PlanCard key={plan.id} item={plan} index={index * 3 + planIndex} />
      ))}
    </View>
  );

  const scrollY = useRef(new Animated.Value(0)).current;

  // Large title animations
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [120, 0],
    extrapolate: "clamp",
  });

  const navTitleOpacity = scrollY.interpolate({
    inputRange: [60, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Large Title Header */}
        <Animated.View
          style={{
            height: headerHeight,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.md,
            backgroundColor: "#F2F2F7",
            opacity: headerOpacity,
            overflow: "hidden",
          }}
        >
          <Text
            style={{
              ...typography.largeTitle,
              color: "#1C1C1E",
              marginBottom: spacing.xs,
            }}
          >
            Meine Pläne
          </Text>
          <Text
            style={{
              ...typography.subheadline,
              color: "#8E8E93",
            }}
          >
            Alle deine Pläne
          </Text>
        </Animated.View>

        {error && (
          <View style={{ padding: spacing.lg }}>
            <ThemedText style={{ ...typography.subheadline, color: "#8E8E93" }}>
              {error.message}
            </ThemedText>
          </View>
        )}

        {/* Scrollable Content */}
        <Animated.ScrollView
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 140,
          }}
        >
          {groupedPlans.map((group, index) => (
            <View key={group.date}>
              {renderDayGroup({ item: group, index })}
            </View>
          ))}
        </Animated.ScrollView>

        {/* Navigation Bar Overlay */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            opacity: navTitleOpacity,
            zIndex: 1000,
          }}
          pointerEvents="none"
        >
          <SafeAreaView style={{ backgroundColor: "transparent" }}>
            <BlurView
              intensity={80}
              style={{
                height: 44, // Standard iOS nav bar height
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(242, 242, 247, 0.8)",
              }}
            >
              <Text
                style={{
                  ...typography.headline,
                  color: "#1C1C1E",
                  fontWeight: "600",
                }}
              >
                My Plans
              </Text>
            </BlurView>
          </SafeAreaView>
        </Animated.View>

        {/* Native iOS FAB */}
        <NativeFAB onPress={() => aiPlanBottomSheetRef.current?.present()} />

        {/* AI Plan Bottom Sheet */}
        <AIPlanBottomSheet
          ref={aiPlanBottomSheetRef}
          onPlanCreated={(plan) => {
            console.log("Plan created:", plan);
            // TODO: Refresh the plans list or add the new plan to the state
          }}
        />
      </SafeAreaView>
    </View>
  );
}

// Native iOS FAB Component
function NativeFAB({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{
        position: "absolute",
        bottom: 110,
        right: spacing.lg,
        zIndex: 1000,
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: "#007AFF",
            alignItems: "center",
            justifyContent: "center",
            ...shadows.medium,
          }}
        >
          <IconSymbol name="plus" size={22} color="white" />
        </View>
      </Animated.View>
    </Pressable>
  );
}
