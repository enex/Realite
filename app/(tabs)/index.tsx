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

import { useSession } from "@/client/auth";
import orpc from "@/client/orpc";
import AIPlanBottomSheet, {
  AIPlanBottomSheetRef,
} from "@/components/AIPlanBottomSheet";
import { PlanCard, shadows } from "@/components/PlanCard";
import PlanFilterBottomSheet, {
  PlanFilterBottomSheetRef,
  type PlanFilter,
} from "@/components/PlanFilterBottomSheet";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useLocation } from "@/hooks/useLocation";
import { useColorScheme } from "@/hooks/useColorScheme";
import type { ActivityId } from "@/shared/activities";
import { isWithinRadius } from "@/shared/utils/distance";
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
  participants?: { name: string; image?: string }[];
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
  const { latitude, longitude, hasPermission } = useLocation();
  const { session } = useSession();
  const {
    data: plans,
    error,
    refetch,
    isFetching,
    isRefetching,
  } = useQuery(
    orpc.plan.myPlans.queryOptions({
      input: filter ?? {},
    }),
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
      participants: (() => {
        const participantIds =
          participantsByPlanId.get(plan.id) ?? new Set<string>();
        const otherParticipants = Array.from(participantIds)
          .map((creatorId) => {
            const name = nameById[creatorId];
            return name ? { name, image: undefined } : null;
          })
          .filter(Boolean) as { name: string; image?: string }[];
        if (otherParticipants.length === 0) return undefined;

        if (session?.id) {
          const hasName =
            typeof session?.name === "string" && session.name.trim().length > 0;
          const label = hasName ? String(session.name) : "Du";
          return [{ name: label }, ...otherParticipants];
        }

        return otherParticipants;
      })(),
    }));
  }, [plans, participantsByPlanId, nameById, session?.id, session?.name]);

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
          today.getMonth() + 1,
        ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const tmr = new Date(today);
        tmr.setDate(tmr.getDate() + 1);
        const tomorrowKey = `${tmr.getFullYear()}-${String(
          tmr.getMonth() + 1,
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
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          ),
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredData]);

  // Also fetch others' plans (public feed / nearby)
  const { data: foundPlans } = useQuery(
    orpc.plan.find.queryOptions({
      input: {
        startDate: filter?.startDate,
        endDate: filter?.endDate,
        activity: filter?.activity,
        location:
          hasPermission && (filter?.radiusKm ?? 50) !== null
            ? {
                latitude,
                longitude,
                radius: Math.max(
                  1,
                  ((filter?.radiusKm ?? 50) as number) * 1000,
                ),
              }
            : undefined,
      },
    }),
  );

  const participantsByPlanId = useMemo(() => {
    const result = new Map<string, Set<string>>();
    if (!plans || !foundPlans) return result;

    const others = Array.isArray(foundPlans) ? (foundPlans as any[]) : [];
    const norm = (value?: unknown) =>
      (value ?? "").toString().trim().toLowerCase();

    const planList = Array.isArray(plans) ? (plans as any[]) : [];

    planList.forEach((plan) => {
      const baseId = plan?.id as string | undefined;
      if (!baseId) return;

      const baseStart = new Date(plan.startDate as any);
      const baseEnd = plan.endDate
        ? new Date(plan.endDate as any)
        : new Date(baseStart.getTime() + 2 * 60 * 60 * 1000);

      const planLocations = Array.isArray(plan.locations)
        ? plan.locations.filter(Boolean)
        : [];

      const matchesLocation = (candidate: any) => {
        if (planLocations.length === 0) return false;
        return planLocations.some((loc: any) => {
          const planLat = Number(loc?.latitude);
          const planLon = Number(loc?.longitude);
          const candLat = Number(candidate?.latitude);
          const candLon = Number(candidate?.longitude);
          if (
            isFinite(planLat) &&
            isFinite(planLon) &&
            isFinite(candLat) &&
            isFinite(candLon)
          ) {
            if (isWithinRadius(planLat, planLon, candLat, candLon, 500)) {
              return true;
            }
          }
          const planLabel = norm(loc?.title ?? loc?.address);
          const candLabel = norm(
            candidate?.locationTitle ?? candidate?.address,
          );
          if (planLabel && candLabel && planLabel === candLabel) return true;
          return false;
        });
      };

      const participantIds = new Set<string>();

      others.forEach((candidate) => {
        const creatorId = candidate?.creatorId as string | undefined;
        if (!creatorId || creatorId === session?.id) return;
        if (candidate?.id === baseId) return;
        if (candidate?.activity !== plan.activity) return;

        const candStart = new Date(candidate.startDate as any);
        const candEnd = candidate.endDate
          ? new Date(candidate.endDate as any)
          : new Date(candStart.getTime() + 60 * 60 * 1000);

        const overlapsInTime = candStart <= baseEnd && candEnd >= baseStart;
        if (!overlapsInTime) return;
        if (!matchesLocation(candidate)) return;

        participantIds.add(creatorId);
      });

      result.set(baseId, participantIds);
    });

    return result;
  }, [plans, foundPlans, session?.id]);

  const overlapCreatorIds = useMemo(() => {
    const ids = new Set<string>();
    participantsByPlanId.forEach((set) => {
      set.forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  }, [participantsByPlanId]);

  const { data: overlapProfiles } = useQuery({
    ...orpc.user.getMany.queryOptions({ input: { ids: overlapCreatorIds } }),
    enabled: overlapCreatorIds.length > 0,
  } as any);

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    const arr = Array.isArray(overlapProfiles)
      ? (overlapProfiles as any[])
      : [];
    arr.forEach((profile: any) => {
      if (profile?.id) {
        const name = (profile.name as string) || "";
        if (name) {
          map[profile.id as string] = name;
        }
      }
    });
    return map;
  }, [overlapProfiles]);

  const othersData = useMemo<PlanListItem[]>(() => {
    if (!foundPlans) return [];

    const mapped = (foundPlans as any[]).map((p) => ({
      id: p.id as string,
      title: p.title as string,
      date: (p.startDate?.toISOString?.() ?? p.startDate) as string,
      status: "committed" as const,
      activity: p.activity as ActivityId,
      locations:
        p.locationTitle || p.latitude || p.longitude
          ? [
              {
                title: (p.locationTitle ?? "") as string,
                address: (p.address ?? undefined) as string | undefined,
                latitude: Number(p.latitude ?? 0),
                longitude: Number(p.longitude ?? 0),
                // optional fields present in findPlans are ignored here
              },
            ]
          : undefined,
      participants: [],
    }));

    // Deduplicate own plans by id
    const ownIds = new Set((filteredData ?? []).map((d) => d.id));
    return mapped.filter((m) => !ownIds.has(m.id));
  }, [foundPlans, filteredData]);

  const groupedOtherPlans = useMemo(() => {
    const groups: Record<string, PlanListItem[]> = {};

    othersData.forEach((plan) => {
      const date = new Date(plan.date);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const dateKey = `${y}-${m}-${d}`;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(plan);
    });

    return Object.entries(groups)
      .map(([dateKey, plans]) => {
        const [y, m, d] = dateKey.split("-").map((v) => Number(v));
        const date = new Date(y, (m as number) - 1, d as number);
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(
          today.getMonth() + 1,
        ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const tmr = new Date(today);
        tmr.setDate(tmr.getDate() + 1);
        const tomorrowKey = `${tmr.getFullYear()}-${String(
          tmr.getMonth() + 1,
        ).padStart(2, "0")}-${String(tmr.getDate()).padStart(2, "0")}`;

        let dayLabel = date.toLocaleDateString("de-DE", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
        if (dateKey === todayKey) dayLabel = "Heute";
        else if (dateKey === tomorrowKey) dayLabel = "Morgen";

        return {
          date: dateKey,
          dayLabel,
          plans: plans.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          ),
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [othersData]);

  const colorScheme = useColorScheme();

  const surfaceClass = "bg-zinc-100 dark:bg-zinc-950";
  const elevatedSurfaceClass = "bg-white dark:bg-zinc-900";
  const mutedTextClass = "text-zinc-500 dark:text-zinc-400";
  const strongTextClass = "text-zinc-900 dark:text-zinc-50";
  const iconPrimary = colorScheme === "dark" ? "#f4f4f5" : "#1C1C1E";

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
          className={`uppercase font-semibold ${mutedTextClass}`}
          style={{
            ...typography.caption1,
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
    <SafeAreaView edges={["top"]} className={`flex-1 ${surfaceClass}`}>
      {/* Large Title Header (animated on iOS, moved into ScrollView on Android) */}
      {/* iOS Large Header with inline actions */}
      {!isAndroid && (
        <Animated.View
          className={`${surfaceClass} overflow-hidden`}
          style={{
            height: headerHeight,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.md,
            opacity: headerOpacity,
          }}
        >
          <View
            className="flex-row items-center justify-between"
            style={{ gap: 10 }}
          >
            <View>
              <Text
                className={strongTextClass}
                style={{
                  ...typography.largeTitle,
                  marginBottom: spacing.xs,
                }}
              >
                Meine Pläne
              </Text>
              <Text className={mutedTextClass} style={typography.subheadline}>
                Alle deine Pläne
              </Text>
            </View>
            <View className="flex-row" style={{ gap: 10 }}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  aiPlanBottomSheetRef.current?.present();
                }}
                className="h-9 w-9 items-center justify-center rounded-full bg-blue-600"
                style={{ ...shadows.small }}
              >
                <IconSymbol name="plus" size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={() => {
                  filterRef.current?.present();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className={`h-9 w-9 items-center justify-center rounded-full border ${elevatedSurfaceClass} border-zinc-200 dark:border-zinc-700`}
                style={{ ...shadows.small }}
              >
                <IconSymbol
                  name="line.3.horizontal.decrease.circle"
                  size={18}
                  color={iconPrimary}
                />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}

      {error && (
        <View style={{ padding: spacing.lg }}>
          <Text className="text-red-500" style={typography.subheadline}>
            {error.message}
          </Text>
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
                { useNativeDriver: false },
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
              className="flex-row items-center justify-between"
              style={{ gap: 10 }}
            >
              <View>
                <Text
                  className={strongTextClass}
                  style={{
                    ...typography.largeTitle,
                    marginBottom: spacing.xs,
                  }}
                >
                  Meine Pläne
                </Text>
                <Text className={mutedTextClass} style={typography.subheadline}>
                  Alle deine Pläne
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  filterRef.current?.present();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className={`h-9 w-9 items-center justify-center rounded-full border border-indigo-500/60 ${elevatedSurfaceClass}`}
                style={{ ...shadows.small }}
              >
                <IconSymbol
                  name="line.3.horizontal.decrease.circle"
                  size={18}
                  color={iconPrimary}
                />
              </Pressable>
            </View>
          </View>
        )}
        {groupedPlans.map((group, index) => (
          <View key={group.date}>{renderDayGroup({ item: group, index })}</View>
        ))}
        {groupedOtherPlans.length > 0 && (
          <View style={{ marginTop: spacing.lg }}>
            <View
              style={{
                marginBottom: spacing.md,
                paddingHorizontal: spacing.xs,
              }}
            >
              <Text
                className={`uppercase font-semibold ${mutedTextClass}`}
                style={{
                  ...typography.caption1,
                  letterSpacing: 0.5,
                }}
              >
                In deiner Nähe
              </Text>
            </View>
            {groupedOtherPlans.map((group, index) => (
              <View key={`other-${group.date}`}>
                {renderDayGroup({ item: group, index })}
              </View>
            ))}
          </View>
        )}
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
              className="h-24 w-24 items-center justify-center rounded-full border border-indigo-200 bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10"
              style={{ ...shadows.small }}
            >
              <IconSymbol name="calendar" size={44} color="#007AFF" />
            </View>
            <Text className={strongTextClass} style={typography.headline}>
              Noch keine Pläne
            </Text>
            <Text
              className={`${mutedTextClass} text-center`}
              style={typography.subheadline}
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
          pointerEvents="box-none"
        >
          <SafeAreaView style={{ backgroundColor: "transparent" }}>
            <BlurView
              intensity={80}
              style={{
                height: 44,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(24, 24, 27, 0.85)"
                    : "rgba(242, 242, 247, 0.8)",
              }}
            >
              <Text
                className={strongTextClass}
                style={{
                  ...typography.headline,
                  fontWeight: "600",
                }}
              >
                Meine Pläne
              </Text>
              {/* Right action (+) in overlay */}
              <View
                style={{
                  position: "absolute",
                  right: spacing.lg,
                  top: 6,
                  height: 32,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
                pointerEvents="box-none"
              >
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    aiPlanBottomSheetRef.current?.present();
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#007AFF",
                    alignItems: "center",
                    justifyContent: "center",
                    ...shadows.small,
                  }}
                >
                  <IconSymbol name="plus" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </BlurView>
          </SafeAreaView>
        </Animated.View>
      )}

      {/* Platform FAB: only show on Android */}
      {isAndroid && groupedPlans.length > 0 && (
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
          // Also refresh the discovery feed
          queryClient.invalidateQueries({
            queryKey: orpc.plan.find.queryOptions({
              input: {
                startDate: filter?.startDate,
                endDate: filter?.endDate,
                activity: filter?.activity,
                location:
                  hasPermission && (filter?.radiusKm ?? 50) !== null
                    ? {
                        latitude,
                        longitude,
                        radius: Math.max(
                          1,
                          ((filter?.radiusKm ?? 50) as number) * 1000,
                        ),
                      }
                    : undefined,
              },
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
  const colorScheme = useColorScheme();
  const detailIconColor = colorScheme === "dark" ? "#a1a1aa" : "#3C3C43";
  const badgeBgClass =
    "rounded-xl border border-zinc-200 bg-zinc-100 p-1.5 dark:border-zinc-800 dark:bg-zinc-900/70";
  const detailTextClass = "text-sm text-zinc-600 dark:text-zinc-300";

  return (
    <View
      className="w-full rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      style={{ gap: 10, marginTop: 4, ...shadows.small }}
    >
      <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Was ist ein Plan?
      </Text>
      <View style={{ gap: 8 }}>
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View className={badgeBgClass}>
            <IconSymbol name="tag" size={14} color={detailIconColor} />
          </View>
          <Text className={detailTextClass}>
            Aktivität mit Titel und Beschreibung
          </Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View className={badgeBgClass}>
            <IconSymbol name="clock" size={14} color={detailIconColor} />
          </View>
          <Text className={detailTextClass}>Zeitpunkt oder Zeitraum</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View className={badgeBgClass}>
            <IconSymbol name="location" size={14} color={detailIconColor} />
          </View>
          <Text className={detailTextClass}>Ort (optional)</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View className={badgeBgClass}>
            <IconSymbol name="person.2" size={14} color={detailIconColor} />
          </View>
          <Text className={detailTextClass}>Andere können dazukommen</Text>
        </View>
      </View>
    </View>
  );
}
