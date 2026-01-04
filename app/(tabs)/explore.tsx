import * as Haptics from "expo-haptics";
import { useNavigation } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/client/auth";
import orpc from "@/client/orpc";
import { PlanCard } from "@/components/plan-card";
import PlanFilterBottomSheet, {
  PlanFilterBottomSheetRef,
  type PlanFilter,
} from "@/components/plan-filter-bottom-sheet";
import { Card } from "@/components/ui/card";
import { GradientBackdrop } from "@/components/ui/gradient-backdrop";
import { Icon } from "@/components/ui/icon";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFeatureFlagBoolean } from "@/hooks/use-feature-flag";
import { useLocation } from "@/hooks/use-location";
import type { ActivityId } from "@/shared/activities";
import { isWithinRadius } from "@/shared/utils/distance";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { ListFilterIcon, SearchIcon, XIcon } from "lucide-react-native";

// iOS Design System (matching Plans screen)
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
    url?: string;
    description?: string;
    category?: string;
  }[];
  participants?: { name: string; image?: string }[];
};

type GroupedPlans = {
  date: string;
  dayLabel: string;
  plans: PlanListItem[];
};

export default function ExploreScreen() {
  const navigation = useNavigation();
  const simpleAppBar = useFeatureFlagBoolean(
    "simple-appbar-for-starpage",
    false
  );
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<PlanFilter | undefined>(undefined);
  const colorScheme = useColorScheme();

  const filterRef = useRef<PlanFilterBottomSheetRef>(null);

  // Set header buttons when simple app bar is enabled
  useEffect(() => {
    if (!simpleAppBar) return;
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 18, marginRight: 8 }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSearch((v) => !v);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name={SearchIcon} size={22} />
          </Pressable>
          <Pressable
            onPress={() => {
              filterRef.current?.present();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name={ListFilterIcon} size={22} />
          </Pressable>
        </View>
      ),
    });
  }, [simpleAppBar, navigation]);
  const { latitude, longitude, hasPermission, requestPermission } =
    useLocation();

  const {
    data: foundPlansData,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isFetching,
    isRefetching,
  } = useInfiniteQuery({
    ...orpc.plan.find.queryOptions({
      input: {
        query: searchText || undefined,
        // Standardmäßig nur zukünftige Pläne (startDate >= startOfDay(now))
        // Filter-Daten werden nur verwendet, wenn explizit gesetzt
        startDate: filter?.startDate || startOfDay(new Date()),
        endDate: filter?.endDate,
        activity: filter?.activity,
        location:
          hasPermission && (filter?.radiusKm ?? 50) !== null
            ? {
                latitude,
                longitude,
                radius: Math.max(1, (filter?.radiusKm ?? 50) * 1000),
              }
            : undefined,
        limit: 20,
      },
    }),
    getNextPageParam: (lastPage: any[], allPages: any[][]) => {
      if (!lastPage || lastPage.length === 0) return undefined;
      // If we got fewer items than the limit, we've reached the end
      if (lastPage.length < 20) return undefined;
      // Use the startDate of the last item as cursor
      const lastItem = lastPage[lastPage.length - 1];
      return lastItem?.startDate
        ? new Date(lastItem.startDate as unknown as string)
        : undefined;
    },
    initialPageParam: undefined,
  });

  // Flatten all pages into a single array and deduplicate by id
  const foundPlans = useMemo(() => {
    if (!foundPlansData?.pages) return [];
    const allPlans = foundPlansData.pages.flat();
    // Deduplicate by id to avoid showing the same plan twice
    const seen = new Set<string>();
    return allPlans.filter((plan: any) => {
      const id = plan?.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [foundPlansData]);

  // Collect unique creator IDs for profile lookup
  const creatorIds = useMemo(() => {
    const s = new Set<string>();
    (foundPlans ?? []).forEach((p: any) => {
      if (p?.creatorId) s.add(p.creatorId as string);
    });
    return Array.from(s);
  }, [foundPlans]);

  // Fetch creator profiles in bulk
  const { data: creatorProfiles } = useQuery({
    ...orpc.user.getMany.queryOptions({ input: { ids: creatorIds } }),
    enabled: creatorIds.length > 0,
  } as any);

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    const arr = Array.isArray(creatorProfiles)
      ? (creatorProfiles as any[])
      : [];
    arr.forEach((u: any) => {
      if (u?.id) map[u.id] = (u.name as string) || "";
    });
    return map;
  }, [creatorProfiles]);

  const imageById = useMemo(() => {
    const map: Record<string, string | null> = {};
    const arr = Array.isArray(creatorProfiles)
      ? (creatorProfiles as any[])
      : [];
    arr.forEach((u: any) => {
      if (u?.id) map[u.id] = (u.image as string) || null;
    });
    return map;
  }, [creatorProfiles]);

  // Cluster plans (same activity, overlapping time, same/near location)
  const clusters = useMemo(() => {
    const plans = (foundPlans ?? []) as any[];
    const n = plans.length;
    const norm = (s?: string | null) =>
      (s ?? "").toString().trim().toLowerCase();
    const tokenize = (s?: string | null) =>
      norm(s)
        .split(/[^a-z0-9äöüß]+/i)
        .filter((t) => t.length >= 4);
    const sharesToken = (aStr?: string | null, bStr?: string | null) => {
      const aTokens = tokenize(aStr);
      const bTokens = tokenize(bStr);
      if (aTokens.length === 0 || bTokens.length === 0) return false;
      return aTokens.some((t) => bTokens.includes(t));
    };
    const sameLocation = (a: any, b: any) => {
      const aLat = Number(a.latitude ?? NaN);
      const aLon = Number(a.longitude ?? NaN);
      const bLat = Number(b.latitude ?? NaN);
      const bLon = Number(b.longitude ?? NaN);
      if (
        isFinite(aLat) &&
        isFinite(aLon) &&
        isFinite(bLat) &&
        isFinite(bLon)
      ) {
        if (isWithinRadius(aLat, aLon, bLat, bLon, 500)) return true;
      }
      if (norm(a.locationUrl) && norm(a.locationUrl) === norm(b.locationUrl))
        return true;
      if (
        norm(a.locationTitle) &&
        norm(a.locationTitle) === norm(b.locationTitle)
      )
        return true;
      if (norm(a.address) && norm(a.address) === norm(b.address)) return true;
      if (
        sharesToken(a.locationTitle, b.locationTitle) ||
        sharesToken(a.address, b.address) ||
        sharesToken(a.locationTitle, b.address) ||
        sharesToken(a.address, b.locationTitle)
      )
        return true;
      return false;
    };
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
      const a = plans[i];
      const aStart = new Date(a.startDate);
      const aEnd = a.endDate ? new Date(a.endDate) : new Date(a.startDate);
      for (let j = i + 1; j < n; j++) {
        const b = plans[j];
        const bStart = new Date(b.startDate);
        const bEnd = b.endDate ? new Date(b.endDate) : new Date(b.startDate);
        const timeOverlap = aStart <= bEnd && bStart <= aEnd;
        const timeClose =
          Math.abs(aStart.getTime() - bStart.getTime()) <= 60 * 60 * 1000;
        if (!timeOverlap && !timeClose) continue;
        if (!sameLocation(a, b)) continue;
        const activityMatch = a.activity === b.activity;
        const titleMatch = sharesToken(a.title, b.title);
        if (!activityMatch && !titleMatch) continue;
        adj[i].push(j);
        adj[j].push(i);
      }
    }
    const visited = new Array(n).fill(false);
    const groups: any[][] = [];
    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;
      const queue = [i];
      visited[i] = true;
      const group: any[] = [];
      while (queue.length) {
        const v = queue.shift()!;
        group.push(plans[v]);
        for (const w of adj[v]) {
          if (!visited[w]) {
            visited[w] = true;
            queue.push(w);
          }
        }
      }
      groups.push(group);
    }
    return groups;
  }, [foundPlans]);

  const { session } = useSession();

  const data = useMemo<PlanListItem[]>(() => {
    if (!foundPlans) return [];

    // One card per cluster: group of creators
    const items = clusters.map((group) => {
      // Prefer user's own plan as base if present
      const sortedByStart = group
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
      let base = sortedByStart[0];
      if (session?.id) {
        const mine = group.find((g: any) => g.creatorId === session.id);
        if (mine) base = mine;
      }

      // Participants: exactly all creators in this cluster (base first)
      const allCreatorIds: string[] = Array.from(
        new Set(group.map((g: any) => g.creatorId as string))
      );
      const orderedCreatorIds = [
        base.creatorId as string,
        ...allCreatorIds.filter((id) => id !== base.creatorId),
      ];

      return {
        id: base.id as string, // open the selected (own) plan when tapping
        title: base.title as string,
        date: (base.startDate?.toISOString?.() ?? base.startDate) as string,
        status: "committed" as const,
        activity: base.activity as ActivityId,
        locations:
          base.locationTitle || base.latitude || base.longitude
            ? [
                {
                  title: (base.locationTitle ?? "") as string,
                  address: (base.address ?? undefined) as string | undefined,
                  latitude: Number(base.latitude ?? 0),
                  longitude: Number(base.longitude ?? 0),
                  url: (base.locationUrl ?? undefined) as string | undefined,
                  description: (base.locationDescription ?? undefined) as
                    | string
                    | undefined,
                  category: (base.locationCategory ?? undefined) as
                    | string
                    | undefined,
                },
              ]
            : undefined,
        participants: orderedCreatorIds
          .map((id) => ({
            name: nameById[id] ?? "",
            image: imageById[id] ?? undefined,
          }))
          .filter((p) => p.name),
      } as PlanListItem;
    });

    return items;
  }, [foundPlans, clusters, nameById, imageById, session?.id]);

  const groupedPlans = useMemo(() => {
    const groups: Record<string, PlanListItem[]> = {};

    data.forEach((plan) => {
      const date = new Date(plan.date);
      // Stable local-date key (YYYY-MM-DD) to avoid parsing bugs on iOS/Safari
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const dateKey = `${y}-${m}-${d}`;

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(plan);
    });

    const today = startOfDay(new Date());
    const todayKey = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const tmr = new Date(today);
    tmr.setDate(tmr.getDate() + 1);
    const tomorrowKey = `${tmr.getFullYear()}-${String(
      tmr.getMonth() + 1
    ).padStart(2, "0")}-${String(tmr.getDate()).padStart(2, "0")}`;

    return Object.entries(groups)
      .map(([dateKey, plans]) => {
        // Recreate local Date from key
        const [y, m, d] = dateKey.split("-").map((v) => Number(v));
        const date = new Date(y, (m as number) - 1, d as number);

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
      .sort((a, b) => {
        // Sort: "Heute" first, then "Morgen", then chronologically
        if (a.date === todayKey) return -1;
        if (b.date === todayKey) return 1;
        if (a.date === tomorrowKey) return -1;
        if (b.date === tomorrowKey) return 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
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

  const onPressFilter = useCallback(() => {
    filterRef.current?.present();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const onApplyFilter = useCallback((f: PlanFilter) => {
    setFilter(f);
  }, []);

  // Simple app bar version
  if (simpleAppBar) {
    return (
      <View className="flex-1 bg-zinc-100 dark:bg-zinc-950">
        {showSearch && (
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
            className="bg-zinc-100 dark:bg-zinc-950"
          >
            <View
              style={{
                borderRadius: 10,
                backgroundColor: "rgba(120, 120, 128, 0.12)",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 8,
                height: 36,
              }}
              className="dark:bg-zinc-800"
            >
              <Icon name={SearchIcon} size={17} color="#8E8E93" />
              <TextInput
                placeholder="Suche"
                placeholderTextColor="#8E8E93"
                value={searchText}
                onChangeText={setSearchText}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 8,
                  fontSize: 17,
                  color: "#1C1C1E",
                }}
                className="dark:text-zinc-50"
                returnKeyType="search"
                autoFocus
              />
              {!!searchText && (
                <Pressable
                  onPress={() => setSearchText("")}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: "#8E8E93",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={XIcon} size={10} color="#FFFFFF" />
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        )}
        {error && (
          <View style={{ padding: spacing.lg }}>
            <Text
              style={{ ...typography.subheadline, color: "#8E8E93" }}
              className="text-zinc-500 dark:text-zinc-400"
            >
              {error.message}
            </Text>
          </View>
        )}
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={Boolean(isRefetching || isFetching)}
              onRefresh={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                try {
                  await refetch();
                } catch (e) {
                  console.error("Refresh error", e);
                }
              }}
              tintColor="#007AFF"
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;
            const paddingToBottom = 100; // Increased for better detection
            const isNearBottom =
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - paddingToBottom;

            if (isNearBottom && hasNextPage && !isFetchingNextPage) {
              // Near bottom, load more
              fetchNextPage();
            }
          }}
          scrollEventThrottle={Platform.OS === "web" ? 100 : 400}
          contentContainerStyle={{
            paddingTop: showSearch ? 0 : spacing.md,
            paddingHorizontal: spacing.lg,
            paddingBottom: 80,
          }}
        >
          {groupedPlans.map((group, index) => (
            <View key={group.date}>
              {renderDayGroup({ item: group, index })}
            </View>
          ))}
          {isFetchingNextPage && hasNextPage && (
            <View className="py-4 items-center">
              <Text
                style={{ ...typography.subheadline, color: "#8E8E93" }}
                className="text-zinc-500 dark:text-zinc-400"
              >
                Lade weitere Pläne...
              </Text>
            </View>
          )}
          {groupedPlans.length === 0 && (
            <View style={{ paddingTop: spacing.lg }}>
              <Text
                style={{ ...typography.subheadline, color: "#8E8E93" }}
                className="text-zinc-500 dark:text-zinc-400"
              >
                Keine Pläne gefunden
              </Text>
            </View>
          )}
        </Animated.ScrollView>

        <PlanFilterBottomSheet
          ref={filterRef}
          initial={{
            useLocation: hasPermission,
            radiusKm:
              typeof filter?.radiusKm === "undefined"
                ? 50
                : (filter?.radiusKm ?? null),
            ...filter,
          }}
          onApply={onApplyFilter}
          canUseLocation={hasPermission}
          onRequestLocation={() => requestPermission()}
        />
      </View>
    );
  }

  // Original complex app bar version
  return (
    <View className="flex-1">
      <GradientBackdrop variant="cool" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Large Title Header */}
        <Animated.View
          className="bg-zinc-100 dark:bg-zinc-950"
          style={{
            height: headerHeight,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.md,
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
                className="text-zinc-900 dark:text-zinc-50"
                style={{
                  ...typography.largeTitle,
                  marginBottom: spacing.xs,
                }}
              >
                Entdecken
              </Text>
              <Text
                style={{
                  ...typography.subheadline,
                  color: "#8E8E93",
                }}
              >
                Finde Pläne in deiner Nähe
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <HeaderIconButton
                icon={SearchIcon}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSearch((v) => !v);
                }}
              />
              <HeaderIconButton icon={ListFilterIcon} onPress={onPressFilter} />
            </View>
          </View>

          {showSearch && (
            <View
              style={{
                marginTop: spacing.md,
                borderRadius: 12,
                backgroundColor: "white",
                borderWidth: 1,
                borderColor: "#E5E5EA",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
              }}
            >
              <Icon name={SearchIcon} size={18} color="#8E8E93" />
              <TextInput
                placeholder="Suche nach Titel oder Ort"
                placeholderTextColor="#8E8E93"
                value={searchText}
                onChangeText={setSearchText}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  marginLeft: 8,
                  color: "#1C1C1E",
                }}
                returnKeyType="search"
              />
              {!!searchText && (
                <Pressable onPress={() => setSearchText("")}>
                  <Icon name={XIcon} size={18} color="#8E8E93" />
                </Pressable>
              )}
            </View>
          )}
        </Animated.View>

        {error && (
          <View style={{ padding: spacing.lg }}>
            <Text style={{ ...typography.subheadline, color: "#8E8E93" }}>
              {error.message}
            </Text>
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
          refreshControl={
            <RefreshControl
              refreshing={Boolean(isRefetching || isFetching)}
              onRefresh={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                try {
                  await refetch();
                } catch (e) {
                  console.error("Refresh error", e);
                }
              }}
              tintColor="#007AFF"
            />
          }
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 80,
          }}
        >
          {groupedPlans.map((group, index) => (
            <View key={group.date}>
              {renderDayGroup({ item: group, index })}
            </View>
          ))}
          {groupedPlans.length === 0 && (
            <View style={{ paddingTop: spacing.lg }}>
              <Text style={{ ...typography.subheadline, color: "#8E8E93" }}>
                Keine Pläne gefunden
              </Text>
            </View>
          )}
        </Animated.ScrollView>

        {/* Navigation Bar Overlay */}
        <Animated.View
          className="absolute top-0 left-0 right-0 z-1000 pointer-events-none"
          style={{ opacity: navTitleOpacity }}
          pointerEvents="none"
        >
          <SafeAreaView style={{ backgroundColor: "transparent" }}>
            <Card
              style={{
                height: 44,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  ...typography.headline,
                  color: "#1C1C1E",
                  fontWeight: "600",
                }}
              >
                Entdecken
              </Text>
            </Card>
          </SafeAreaView>
        </Animated.View>

        {/* Filter Sheet */}
        <PlanFilterBottomSheet
          ref={filterRef}
          initial={{
            useLocation: hasPermission,
            radiusKm:
              typeof filter?.radiusKm === "undefined"
                ? 50
                : (filter?.radiusKm ?? null),
            ...filter,
          }}
          onApply={onApplyFilter}
          canUseLocation={hasPermission}
          onRequestLocation={() => requestPermission()}
        />
      </SafeAreaView>
    </View>
  );
}

function HeaderIconButton({
  icon,
  onPress,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="w-9 h-9 rounded-9 border border-zinc-200 dark:border-zinc-800 shadow-sm justify-center items-center flex"
    >
      <Icon name={icon as any} size={18} color="#1C1C1E" />
    </Pressable>
  );
}
