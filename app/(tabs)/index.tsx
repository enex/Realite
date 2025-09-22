import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, buttonTextVariants } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

import orpc from "@/client/orpc";
import AIPlanBottomSheet, {
  AIPlanBottomSheetRef,
} from "@/components/AIPlanBottomSheet";
import { PlanCard, shadows } from "@/components/PlanCard";
import PlanFilterBottomSheet, {
  PlanFilterBottomSheetRef,
  type PlanFilter,
} from "@/components/PlanFilterBottomSheet";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import type { ActivityId } from "@/shared/activities";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  locations?: {
    title: string;
    address?: string;
    latitude: number;
    longitude: number;
  }[];
  participants?: string[];
};

type GroupedPlans = {
  date: string;
  dayLabel: string;
  plans: PlanListItem[];
};

export default function PlansScreen() {
  const router = useRouter();
  const aiPlanBottomSheetRef = useRef<AIPlanBottomSheetRef>(null);
  const filterRef = useRef<PlanFilterBottomSheetRef>(null);
  const [filter, setFilter] = useState<PlanFilter | undefined>(undefined);
  const queryClient = useQueryClient();
  const {
    data: plans,
    error,
    refetch,
    isFetching,
    isRefetching,
  } = useQuery(
    orpc.plan.myPlans.queryOptions({
      input: filter ?? {},
    })
  );

  // TODO: Replace with data from ORPC once endpoint is available
  const data = useMemo<PlanListItem[]>(() => {
    if (!plans) return [];

    return plans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      date: (plan.startDate?.toISOString?.() ?? (plan.startDate as any)) || "",
      status: "committed",
      activity: plan.activity as ActivityId,
      locations: Array.isArray(plan.locations)
        ? plan.locations
            .filter((l: any) => !!l)
            .map((l: any) => {
              const title = ((l.title ?? l.address ?? "") as string) || "";
              return {
                title,
                address: (l.address ?? undefined) as string | undefined,
                latitude: Number(l.latitude ?? 0),
                longitude: Number(l.longitude ?? 0),
              };
            })
            .filter((l: any) => l.title !== "" || (l.latitude && l.longitude))
        : undefined,
      participants: [],
    }));
  }, [plans]);

  const filteredData = useMemo(() => {
    if (!data) return [] as PlanListItem[];

    // Default: only today and future
    const defaultStart = new Date();
    defaultStart.setHours(0, 0, 0, 0);

    const startDate =
      typeof filter === "undefined"
        ? defaultStart
        : (filter?.startDate ?? undefined);
    const endDate = filter?.endDate ?? undefined;

    return data.filter((p) => {
      const t = new Date(p.date).getTime();
      if (startDate && t < startDate.getTime()) return false;
      if (endDate && t > endDate.getTime()) return false;
      if (filter?.activity && p.activity !== filter.activity) return false;
      return true;
    });
  }, [data, filter]);

  const groupedPlans = useMemo(() => {
    const groups: Record<string, PlanListItem[]> = {};

    filteredData.forEach((plan) => {
      const date = new Date(plan.date);
      // Build a stable local-date key (YYYY-MM-DD) to avoid Safari parsing issues
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const dateKey = `${y}-${m}-${d}`;

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(plan);
    });

    return Object.entries(groups)
      .map(([dateKey, plans]) => {
        // Recreate a local Date from the stable key at local midnight
        const [y, m, d] = dateKey.split("-").map((v) => Number(v));
        const date = new Date(y, (m as number) - 1, d as number);
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(
          today.getMonth() + 1
        ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const tmr = new Date(today);
        tmr.setDate(tmr.getDate() + 1);
        const tomorrowKey = `${tmr.getFullYear()}-${String(
          tmr.getMonth() + 1
        ).padStart(2, "0")}-${String(tmr.getDate()).padStart(2, "0")}`;

        let dayLabel = date.toLocaleDateString("de-DE", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });

        if (dateKey === todayKey) {
          dayLabel = "Heute";
        } else if (dateKey === tomorrowKey) {
          dayLabel = "Morgen";
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
  }, [filteredData]);

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
  const isAndroid = Platform.OS === "android";

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

  const bottomPadding = isAndroid ? 80 : 140;

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#F2F2F7" }}
    >
      {/* Large Title Header (animated on iOS, moved into ScrollView on Android) */}
      {!isAndroid && (
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
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
            </View>
            <Pressable
              onPress={() => {
                filterRef.current?.present();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "white",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#E5E5EA",
                ...shadows.small,
              }}
            >
              <IconSymbol
                name="line.3.horizontal.decrease.circle"
                size={18}
                color="#1C1C1E"
              />
            </Pressable>
          </View>
        </Animated.View>
      )}

      {error && (
        <View style={{ padding: spacing.lg }}>
          <ThemedText style={{ ...typography.subheadline, color: "#8E8E93" }}>
            {error.message}
          </ThemedText>
        </View>
      )}

      {/* Scrollable Content */}
      <Animated.ScrollView
        style={{ flex: 1 }}
        onScroll={
          isAndroid
            ? undefined
            : Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={isAndroid}
        nestedScrollEnabled={isAndroid}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(isRefetching || isFetching)}
            onRefresh={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              try {
                await refetch();
              } catch (e) {
                // Swallow errors; UI already surfaces query errors
                console.error("Refresh error", e);
              }
            }}
            tintColor="#007AFF"
          />
        }
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: bottomPadding,
        }}
      >
        {isAndroid && (
          <View style={{ paddingTop: spacing.sm, paddingBottom: spacing.md }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
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
              </View>
              <Pressable
                onPress={() => {
                  filterRef.current?.present();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "white",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "#6366F1",
                  ...shadows.small,
                }}
              >
                <IconSymbol
                  name="line.3.horizontal.decrease.circle"
                  size={18}
                  color="#1C1C1E"
                />
              </Pressable>
            </View>
          </View>
        )}
        {groupedPlans.map((group, index) => (
          <View key={group.date}>{renderDayGroup({ item: group, index })}</View>
        ))}
        {groupedPlans.length === 0 && (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingTop: spacing.xl,
              paddingBottom: spacing.xl,
              gap: 16,
            }}
          >
            {/* Illustration */}
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: "#E5F0FF",
                borderWidth: 1,
                borderColor: "#B7D4FF",
                alignItems: "center",
                justifyContent: "center",
                ...shadows.small,
              }}
            >
              <IconSymbol name="calendar" size={44} color="#007AFF" />
            </View>
            <Text
              style={{
                ...typography.headline,
                color: "#1C1C1E",
              }}
            >
              Noch keine Pläne
            </Text>
            <Text
              style={{
                ...typography.subheadline,
                color: "#8E8E93",
                textAlign: "center",
              }}
            >
              Lege fest, was du vor hast – andere sehen es und können
              dazukommen.
            </Text>

            {/* What is a plan */}
            <WhatIsAPlan />
            <Button
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                aiPlanBottomSheetRef.current?.present();
              }}
              variant="default"
              size="lg"
            >
              <Text
                className={buttonTextVariants({
                  variant: "default",
                  size: "lg",
                })}
              >
                Plan erstellen
              </Text>
            </Button>
          </View>
        )}
      </Animated.ScrollView>

      {/* Navigation Bar Overlay */}
      {!isAndroid && (
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
                Meine Pläne
              </Text>
            </BlurView>
          </SafeAreaView>
        </Animated.View>
      )}

      {/* Native iOS FAB */}
      {groupedPlans.length > 0 && (
        <NativeFAB onPress={() => aiPlanBottomSheetRef.current?.present()} />
      )}

      {/* AI Plan Bottom Sheet */}
      <AIPlanBottomSheet
        ref={aiPlanBottomSheetRef}
        onPlanCreated={(plan: any) => {
          console.log("Plan created:", plan);
          // Refresh the plans list so the new plan appears
          queryClient.invalidateQueries({
            queryKey: orpc.plan.myPlans.queryOptions({
              input: filter ?? {},
            }).queryKey,
          });
          // Navigate to the plan details for quick editing
          if (plan?.id) {
            // Slight defer to ensure bottom sheet dismiss animation doesn't conflict
            setTimeout(() => {
              router.push(`/plan/${plan.id}` as any);
            }, 0);
          }
        }}
      />

      {/* Filter Bottom Sheet */}
      <PlanFilterBottomSheet
        ref={filterRef}
        initial={filter}
        onApply={(f) => setFilter(f)}
        hideLocation
      />
    </SafeAreaView>
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
        bottom: 24,
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

function WhatIsAPlan() {
  return (
    <View
      style={{
        width: "100%",
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E5E5EA",
        padding: 16,
        gap: 10,
        marginTop: 4,
        ...shadows.small,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1C1C1E" }}>
        Was ist ein Plan?
      </Text>
      <View style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              borderRadius: 10,
              backgroundColor: "#F2F2F7",
              borderWidth: 1,
              borderColor: "#E5E5EA",
              padding: 6,
            }}
          >
            <IconSymbol name="tag" size={14} color="#8E8E93" />
          </View>
          <Text style={{ color: "#3C3C43" }}>
            Aktivität mit Titel und Beschreibung
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              borderRadius: 10,
              backgroundColor: "#F2F2F7",
              borderWidth: 1,
              borderColor: "#E5E5EA",
              padding: 6,
            }}
          >
            <IconSymbol name="clock" size={14} color="#8E8E93" />
          </View>
          <Text style={{ color: "#3C3C43" }}>Zeitpunkt oder Zeitraum</Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              borderRadius: 10,
              backgroundColor: "#F2F2F7",
              borderWidth: 1,
              borderColor: "#E5E5EA",
              padding: 6,
            }}
          >
            <IconSymbol name="location" size={14} color="#8E8E93" />
          </View>
          <Text style={{ color: "#3C3C43" }}>Ort (optional)</Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              borderRadius: 10,
              backgroundColor: "#F2F2F7",
              borderWidth: 1,
              borderColor: "#E5E5EA",
              padding: 6,
            }}
          >
            <IconSymbol name="person.2" size={14} color="#8E8E93" />
          </View>
          <Text style={{ color: "#3C3C43" }}>Andere können dazukommen</Text>
        </View>
      </View>
    </View>
  );
}
