import { LegendList } from "@legendapp/list";
import * as Haptics from "expo-haptics";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, View } from "react-native";

import { Button, buttonTextVariants } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

import orpc from "@/client/orpc";
import AIPlanBottomSheet, {
  type AIPlanBottomSheetRef,
} from "@/components/AIPlanBottomSheet";
import { PlanCard, shadows } from "@/components/PlanCard";
import PlanFilterBottomSheet, {
  type PlanFilter,
  type PlanFilterBottomSheetRef,
} from "@/components/PlanFilterBottomSheet";
import { Icon } from "@/components/ui/Icon";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useFeatureFlagBoolean } from "@/hooks/useFeatureFlag";
import type { ActivityId } from "@/shared/activities";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { startOfDay, subDays } from "date-fns";

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

type TimelineItem = {
  id: string;
  type: "plan" | "today-marker" | "day-header";
  plan?: PlanListItem;
  date: Date;
  dayLabel?: string;
};

export default function PlansScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const simpleAppBar = useFeatureFlagBoolean(
    "simple-appbar-for-starpage",
    false
  );
  const filterRef = useRef<PlanFilterBottomSheetRef>(null);
  const aiPlanBottomSheetRef = useRef<AIPlanBottomSheetRef>(null);
  const listRef = useRef<any>(null);
  const [filter, setFilter] = useState<PlanFilter | undefined>(undefined);
  const didOpenWhatsAppStatusShareRef = useRef(false);

  const todayMidnight = startOfDay(new Date());

  // Set header buttons when simple app bar is enabled
  useEffect(() => {
    if (simpleAppBar) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: "row", gap: 18, marginRight: 8 }}>
            <Pressable
              onPress={() => {
                filterRef.current?.present();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name="line.3.horizontal.decrease.circle"
                size={22}
                color="#007AFF"
              />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(modals)/import-share?source=unknown");
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="link" size={22} color="#6366F1" />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                aiPlanBottomSheetRef.current?.present();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="plus" size={22} color="#007AFF" />
            </Pressable>
          </View>
        ),
      } as any);
    }
  }, [simpleAppBar, navigation, router]);

  // Query for future plans (bidirectional pagination - ascending order)
  // Supports both forward (loading more future) and backward (loading items closer to today)
  const {
    data: futurePlansData,
    error: futureError,
    fetchNextPage: fetchNextFuturePage,
    fetchPreviousPage: fetchPreviousFuturePage,
    hasNextPage: hasNextFuturePage,
    hasPreviousPage: hasPreviousFuturePage,
    isFetchingNextPage: isFetchingNextFuturePage,
    isFetchingPreviousPage: isFetchingPreviousFuturePage,
    refetch: refetchFuture,
    isFetching: isFetchingFuture,
    isRefetching: isRefetchingFuture,
  } = useInfiniteQuery(
    orpc.plan.myPlans.infiniteOptions({
      input: (
        pageParam:
          | { cursor: Date; direction: "forward" | "backward" }
          | undefined
      ) => {
        const baseInput = {
          startDate: todayMidnight,
          endDate: filter?.endDate,
          limit: 20,
          orderDirection: "asc" as const,
        };

        if (pageParam) {
          return {
            ...baseInput,
            cursor: pageParam.cursor,
            cursorDirection: pageParam.direction,
          };
        }

        return baseInput;
      },
      initialPageParam: undefined as
        | { cursor: Date; direction: "forward" | "backward" }
        | undefined,
      getNextPageParam: (lastPage: any[]) => {
        if (!lastPage || lastPage.length === 0) return undefined;
        if (lastPage.length < 20) return undefined;
        // Forward pagination: use the last item's startDate as cursor
        const lastItem = lastPage[lastPage.length - 1];
        return lastItem?.startDate
          ? {
              cursor: new Date(lastItem.startDate as unknown as string),
              direction: "forward" as const,
            }
          : undefined;
      },
      getPreviousPageParam: (firstPage: any[]) => {
        if (!firstPage || firstPage.length === 0) return undefined;
        if (firstPage.length < 20) return undefined;
        // Backward pagination: use the first item's startDate as cursor
        const firstItem = firstPage[0];
        return firstItem?.startDate
          ? {
              cursor: new Date(firstItem.startDate as unknown as string),
              direction: "backward" as const,
            }
          : undefined;
      },
    })
  );

  // Query for past plans (backward pagination - ascending order)
  // Ascending order means oldest past plans first (chronological timeline)
  const {
    data: pastPlansData,
    error: pastError,
    fetchNextPage: fetchNextPastPage,
    hasNextPage: hasNextPastPage,
    isFetchingNextPage: isFetchingNextPastPage,
    refetch: refetchPast,
    isFetching: isFetchingPast,
    isRefetching: isRefetchingPast,
  } = useInfiniteQuery({
    ...orpc.plan.myPlans.queryOptions({
      input: {
        startDate: filter?.startDate || subDays(todayMidnight, 365),
        endDate: todayMidnight,
        limit: 50,
        orderDirection: "asc", // Past plans: oldest first (ascending, chronological)
      },
    }),
    getNextPageParam: (lastPage: any[], allPages: any[][]) => {
      if (!lastPage || lastPage.length === 0) return undefined;
      if (lastPage.length < 50) return undefined;
      // For ascending order, use the last item's startDate as cursor
      // This will be used as startDate in the next query to get newer plans
      const lastItem = lastPage[lastPage.length - 1];
      return lastItem?.startDate
        ? new Date(lastItem.startDate as unknown as string)
        : undefined;
    },
    initialPageParam: undefined,
  });

  const error = futureError || pastError;
  const isFetching = isFetchingFuture || isFetchingPast;
  const isRefetching = isRefetchingFuture || isRefetchingPast;

  // Flatten future plans
  const futurePlans = useMemo(() => {
    if (!futurePlansData?.pages) return [];
    const allPlans = futurePlansData.pages.flat();
    const seen = new Set<string>();
    return allPlans.filter((plan: any) => {
      const id = plan?.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [futurePlansData]);

  // Flatten past plans (already in ascending order from API - oldest first)
  const pastPlans = useMemo(() => {
    if (!pastPlansData?.pages) return [];
    const allPlans = pastPlansData.pages.flat();
    const seen = new Set<string>();
    return allPlans.filter((plan: any) => {
      const id = plan?.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    // No need to reverse - API already returns ascending order (oldest first, chronological)
  }, [pastPlansData]);

  // Combine all plans for participant lookup
  const plans = useMemo(
    () => [...pastPlans, ...futurePlans],
    [pastPlans, futurePlans]
  );

  const whatsAppStatusShareReminderState = useQuery({
    ...orpc.user.getWhatsAppStatusShareReminderState.queryOptions(),
    enabled: plans.length >= 2,
  } as any);

  useEffect(() => {
    if (didOpenWhatsAppStatusShareRef.current) return;
    if (plans.length < 2) return;
    const state = whatsAppStatusShareReminderState.data as
      | { lastShownAt: string | null }
      | undefined;
    if (!state) return;

    const lastShownAt = state.lastShownAt ? new Date(state.lastShownAt) : null;
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    const shouldShow =
      !lastShownAt || Date.now() - lastShownAt.getTime() >= fiveDaysMs;

    if (!shouldShow) return;

    didOpenWhatsAppStatusShareRef.current = true;
    router.push("/(modals)/whatsapp-status-share?surface=plans");
  }, [plans.length, router, whatsAppStatusShareReminderState.data]);

  // Extract unique participant creator IDs from similarOverlappingPlans
  const participantCreatorIds = useMemo(() => {
    if (!plans) return [];
    const ids = new Set<string>();
    plans.forEach((plan: any) => {
      if (Array.isArray(plan.similarOverlappingPlans)) {
        plan.similarOverlappingPlans.forEach((overlap: any) => {
          if (overlap?.creatorId) {
            ids.add(overlap.creatorId);
          }
        });
      }
    });
    return Array.from(ids);
  }, [plans]);

  // Fetch profiles for all participants
  const { data: participantProfiles } = useQuery({
    ...orpc.user.getMany.queryOptions({
      input: { ids: participantCreatorIds },
    }),
    enabled: participantCreatorIds.length > 0,
  } as any);

  // Map creator IDs to names
  const participantNameById = useMemo(() => {
    const map: Record<string, string> = {};
    const arr = Array.isArray(participantProfiles)
      ? (participantProfiles as any[])
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
  }, [participantProfiles]);

  const data = useMemo<PlanListItem[]>(() => {
    if (!plans) return [];

    return plans.map((plan: any) => {
      // Get participants from similarOverlappingPlans
      const participants: { name: string; image?: string }[] = [];
      if (Array.isArray(plan.similarOverlappingPlans)) {
        plan.similarOverlappingPlans.forEach((overlap: any) => {
          const creatorId = overlap?.creatorId;
          if (creatorId && participantNameById[creatorId]) {
            // Find the profile to get the image
            const profile = Array.isArray(participantProfiles)
              ? (participantProfiles as any[]).find(
                  (p: any) => p.id === creatorId
                )
              : null;
            participants.push({
              name: participantNameById[creatorId],
              image: profile?.image || undefined,
            });
          }
        });
      }

      return {
        id: plan.id,
        title: plan.title,
        date:
          (plan.startDate?.toISOString?.() ?? (plan.startDate as any)) || "",
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
        participants: participants.length > 0 ? participants : undefined,
      };
    });
  }, [plans, participantNameById, participantProfiles]);

  // Filter data by activity if filter is set
  const filteredPastData = useMemo(() => {
    if (!data) return [] as PlanListItem[];
    return data.filter((p) => {
      const planDate = new Date(p.date);
      if (planDate >= todayMidnight) return false; // Only past plans
      if (filter?.activity && p.activity !== filter.activity) return false;
      return true;
    });
  }, [data, filter, todayMidnight]);

  const filteredFutureData = useMemo(() => {
    if (!data) return [] as PlanListItem[];
    return data.filter((p) => {
      const planDate = new Date(p.date);
      if (planDate < todayMidnight) return false; // Only future plans
      if (filter?.activity && p.activity !== filter.activity) return false;
      return true;
    });
  }, [data, filter, todayMidnight]);

  // Build timeline items with day headers: past plans + today marker + future plans
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    const seenDates = new Set<string>();
    const seenPlanIds = new Set<string>();

    // Helper to get date key
    const getDateKey = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    // Helper to get day label
    const getDayLabel = (date: Date, dateKey: string) => {
      const today = new Date();
      const todayKey = getDateKey(today);
      const tmr = new Date(today);
      tmr.setDate(tmr.getDate() + 1);
      const tomorrowKey = getDateKey(tmr);

      if (dateKey === todayKey) {
        return "Heute";
      } else if (dateKey === tomorrowKey) {
        return "Morgen";
      } else {
        return date.toLocaleDateString("de-DE", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
      }
    };

    // Group past plans by date
    const pastByDate = new Map<string, PlanListItem[]>();
    filteredPastData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Oldest first (ascending)
      .forEach((plan) => {
        if (seenPlanIds.has(plan.id)) return; // Deduplicate
        seenPlanIds.add(plan.id);
        const date = new Date(plan.date);
        const dateKey = getDateKey(date);
        if (!pastByDate.has(dateKey)) {
          pastByDate.set(dateKey, []);
        }
        pastByDate.get(dateKey)!.push(plan);
      });

    // Add past plans with day headers
    Array.from(pastByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b)) // Oldest first (ascending, chronological)
      .forEach(([dateKey, plans]) => {
        const date = new Date(dateKey + "T00:00:00");
        items.push({
          id: `day-header-${dateKey}`,
          type: "day-header",
          date,
          dayLabel: getDayLabel(date, dateKey),
        });
        // Sort plans within the day by time (earliest first for chronological order)
        plans
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          )
          .forEach((plan) => {
            items.push({
              id: `plan-${plan.id}`,
              type: "plan",
              plan,
              date: new Date(plan.date),
            });
          });
      });

    // Add today marker
    const todayKey = getDateKey(todayMidnight);
    if (!seenDates.has(todayKey)) {
      seenDates.add(todayKey);
      items.push({
        id: "today-marker",
        type: "today-marker",
        date: todayMidnight,
        dayLabel: "Heute",
      });
    }

    // Group future plans by date
    const futureByDate = new Map<string, PlanListItem[]>();
    filteredFutureData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((plan) => {
        if (seenPlanIds.has(plan.id)) return; // Deduplicate
        seenPlanIds.add(plan.id);
        const date = new Date(plan.date);
        const dateKey = getDateKey(date);
        if (!futureByDate.has(dateKey)) {
          futureByDate.set(dateKey, []);
        }
        futureByDate.get(dateKey)!.push(plan);
      });

    // Add future plans with day headers
    Array.from(futureByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b)) // Oldest first
      .forEach(([dateKey, plans]) => {
        const date = new Date(dateKey + "T00:00:00");
        // Don't add duplicate "Heute" header if today marker already exists
        if (dateKey !== todayKey) {
          items.push({
            id: `day-header-${dateKey}`,
            type: "day-header",
            date,
            dayLabel: getDayLabel(date, dateKey),
          });
        }
        // Sort plans within the day by time (earliest first for future)
        plans
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          )
          .forEach((plan) => {
            items.push({
              id: `plan-${plan.id}`,
              type: "plan",
              plan,
              date: new Date(plan.date),
            });
          });
      });

    return items;
  }, [filteredPastData, filteredFutureData, todayMidnight]);

  // Find the index of the "today-marker" for initialScrollIndex
  const todayMarkerIndex = useMemo(() => {
    return timelineItems.findIndex((item) => item.type === "today-marker");
  }, [timelineItems]);

  // Participants are now fetched as part of myPlans via similarOverlappingPlans

  const surfaceClass = "bg-zinc-100 dark:bg-zinc-950";
  // Better text contrast in dark mode
  const mutedTextClass = "text-zinc-500 dark:text-zinc-300";
  const strongTextClass = "text-zinc-900 dark:text-zinc-50";

  const renderTimelineItem = (item: TimelineItem, index: number) => {
    if (item.type === "day-header") {
      return (
        <View
          key={item.id}
          style={{
            marginTop: spacing.xl,
            marginBottom: spacing.md,
            paddingHorizontal: spacing.lg,
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
      );
    }

    if (item.type === "today-marker") {
      return (
        <View
          key={item.id}
          style={{
            marginVertical: spacing.lg,
            paddingHorizontal: spacing.lg,
          }}
        >
          <Text
            className={`font-bold ${strongTextClass}`}
            style={typography.headline}
          >
            Heute
          </Text>
          <Text className={mutedTextClass} style={typography.caption1}>
            {todayMidnight.toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>
      );
    }

    if (item.type === "plan" && item.plan) {
      return (
        <View
          key={item.id}
          style={{
            marginBottom: spacing.md,
            paddingHorizontal: spacing.lg,
          }}
        >
          <PlanCard item={item.plan} index={index} />
        </View>
      );
    }

    return null;
  };

  const isAndroid = Platform.OS === "android";
  const isWeb = Platform.OS === "web";
  const showFAB = isAndroid || isWeb;

  const bottomPadding = isAndroid ? 80 : 140;

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Promise.all([refetchFuture(), refetchPast()]);
    } catch (e) {
      console.error("Refresh error", e);
    }
  }, [refetchFuture, refetchPast]);

  const hasPlans = timelineItems.some((item) => item.type === "plan");
  const hasFuturePlans = useMemo(() => {
    return filteredFutureData.length > 0;
  }, [filteredFutureData]);

  return (
    <View className={`flex-1 ${surfaceClass}`}>
      {error && (
        <View style={{ padding: spacing.lg }}>
          <Text className="text-red-500" style={typography.subheadline}>
            {error.message}
          </Text>
        </View>
      )}
      <LegendList
        ref={listRef}
        data={timelineItems}
        renderItem={({ item, index }) => {
          const rendered = renderTimelineItem(item, index);
          // Insert placeholder after today marker if no future plans
          if (
            item.type === "today-marker" &&
            !hasFuturePlans &&
            !isFetchingFuture &&
            !isFetchingNextFuturePage
          ) {
            return (
              <View key={`${item.id}-with-placeholder`}>
                {rendered}
                <FuturePlansPlaceholder
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/plan/new/ai");
                  }}
                />
              </View>
            );
          }
          return rendered;
        }}
        keyExtractor={(item) => item.id}
        initialScrollIndex={
          todayMarkerIndex >= 0 ? todayMarkerIndex : undefined
        }
        maintainVisibleContentPosition={true}
        estimatedItemSize={150}
        onRefresh={handleRefresh}
        refreshing={Boolean(isRefetching || isFetching)}
        onEndReached={() => {
          if (hasNextFuturePage && !isFetchingNextFuturePage) {
            fetchNextFuturePage();
          }
        }}
        onStartReached={() => {
          // Load past plans when scrolling up
          if (hasNextPastPage && !isFetchingNextPastPage) {
            fetchNextPastPage();
          }
          // Also try to load previous future plans (closer to today) when scrolling up
          if (hasPreviousFuturePage && !isFetchingPreviousFuturePage) {
            fetchPreviousFuturePage();
          }
        }}
        onEndReachedThreshold={0.5}
        onStartReachedThreshold={0.5}
        ListEmptyComponent={
          !hasPlans ? (
            <View className="items-center justify-center py-8 gap-4 px-4">
              <View
                className="h-24 w-24 items-center justify-center rounded-full border border-indigo-200 bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                style={{ ...shadows.small }}
              >
                <Icon name="calendar" size={44} color="#007AFF" />
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
              <WhatIsAPlan />
              <Button
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/plan/new/ai");
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
          ) : null
        }
        contentContainerStyle={{
          paddingTop: spacing.xl,
          paddingBottom: bottomPadding,
        }}
        style={{ flex: 1 }}
      />

      {showFAB && hasPlans && (
        <NativeFAB onPress={() => router.push("/plan/new/ai")} />
      )}

      <PlanFilterBottomSheet
        ref={filterRef}
        initial={filter}
        onApply={(f) => setFilter(f)}
        hideLocation
      />
      <AIPlanBottomSheet ref={aiPlanBottomSheetRef} />
    </View>
  );
}

// Future Plans Placeholder Component
function FuturePlansPlaceholder({ onPress }: { onPress: () => void }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for the icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle scale animation for the card
    const scale = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    scale.start();

    return () => {
      pulse.stop();
      scale.stop();
    };
  }, [pulseAnim, scaleAnim]);

  return (
    <Pressable
      onPress={onPress}
      style={{
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.xl,
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <View
          className="rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-6 dark:border-indigo-500/40 dark:bg-indigo-500/5"
          style={{
            alignItems: "center",
            gap: spacing.md,
            ...shadows.small,
          }}
        >
          <Animated.View
            style={{
              transform: [{ scale: pulseAnim }],
            }}
          >
            <View
              className="h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20"
              style={{ ...shadows.small }}
            >
              <Icon name="plus.circle.fill" size={32} color="#6366F1" />
            </View>
          </Animated.View>
          <View style={{ alignItems: "center", gap: spacing.xs }}>
            <Text
              className="font-semibold text-indigo-900 dark:text-indigo-100"
              style={typography.headline}
            >
              Plane etwas für die Zukunft
            </Text>
            <Text
              className="text-center text-indigo-700 dark:text-indigo-300"
              style={typography.subheadline}
            >
              Erstelle deinen ersten Plan und teile ihn mit anderen
            </Text>
          </View>
          <Button
            onPress={onPress}
            variant="default"
            size="lg"
            style={{
              marginTop: spacing.sm,
              backgroundColor: "#6366F1",
            }}
          >
            <Text
              className={buttonTextVariants({
                variant: "default",
                size: "lg",
              })}
              style={{ color: "#FFFFFF" }}
            >
              Plan erstellen
            </Text>
          </Button>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// Native iOS FAB Component
function NativeFAB({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: isDark ? "#FFFFFF" : "#000000",
            alignItems: "center",
            justifyContent: "center",
            ...shadows.medium,
          }}
        >
          <Icon name="plus" size={28} color={isDark ? "#000000" : "#FFFFFF"} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

function WhatIsAPlan() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  // Better contrast for icons in dark mode - use lighter color
  const detailIconColor = isDark ? "#d4d4d8" : "#3C3C43";
  // Better contrast for badge background in dark mode
  const badgeBgClass =
    "rounded-xl border border-zinc-200 bg-zinc-100 p-1.5 dark:border-zinc-700 dark:bg-zinc-800/80";
  // Better text contrast in dark mode
  const detailTextClass = "text-sm text-zinc-600 dark:text-zinc-200";

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
            <Icon name="tag" size={14} color={detailIconColor} />
          </View>
          <Text className={detailTextClass}>
            Aktivität mit Titel und Beschreibung
          </Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View className={badgeBgClass}>
            <Icon name="clock" size={14} color={detailIconColor} />
          </View>
          <Text className={detailTextClass}>Zeitpunkt oder Zeitraum</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View className={badgeBgClass}>
            <Icon name="location" size={14} color={detailIconColor} />
          </View>
          <Text className={detailTextClass}>Ort (optional)</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View className={badgeBgClass}>
            <Icon name="person.2" size={14} color={detailIconColor} />
          </View>
          <Text className={detailTextClass}>Andere können dazukommen</Text>
        </View>
      </View>
    </View>
  );
}
