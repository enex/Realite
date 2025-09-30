import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/client/auth";
import orpc from "@/client/orpc";
import { PlanCard, shadows } from "@/components/PlanCard";
import PlanFilterBottomSheet, {
  PlanFilterBottomSheetRef,
  type PlanFilter,
} from "@/components/PlanFilterBottomSheet";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useLocation } from "@/hooks/useLocation";
import type { ActivityId } from "@/shared/activities";
import { isWithinRadius } from "@/shared/utils/distance";
import { useQuery } from "@tanstack/react-query";

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
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<PlanFilter | undefined>(undefined);

  const filterRef = useRef<PlanFilterBottomSheetRef>(null);
  const { latitude, longitude, hasPermission, requestPermission } =
    useLocation();

  const {
    data: foundPlans,
    error,
    refetch,
    isFetching,
    isRefetching,
  } = useQuery(
    orpc.plan.find.queryOptions({
      input: {
        query: searchText || undefined,
        startDate: filter?.startDate,
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
      },
    })
  );

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

  // Cluster plans (same activity, overlapping time, same/near location)
  const clusters = useMemo(() => {
    const plans = (foundPlans ?? []) as any[];
    const n = plans.length;
    const norm = (s?: string | null) =>
      (s ?? "").toString().trim().toLowerCase();
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
      return false;
    };
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
      const a = plans[i];
      const aStart = new Date(a.startDate);
      const aEnd = a.endDate ? new Date(a.endDate) : new Date(a.startDate);
      for (let j = i + 1; j < n; j++) {
        const b = plans[j];
        if (a.activity !== b.activity) continue;
        const bStart = new Date(b.startDate);
        const bEnd = b.endDate ? new Date(b.endDate) : new Date(b.startDate);
        const timeOverlap = aStart <= bEnd && bStart <= aEnd;
        if (!timeOverlap) continue;
        if (!sameLocation(a, b)) continue;
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
    return clusters.map((group) => {
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
          .map((id) => ({ name: nameById[id] ?? "" }))
          .filter((p) => p.name),
      } as PlanListItem;
    });
  }, [foundPlans, clusters, nameById, session?.id]);

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

    return Object.entries(groups)
      .map(([dateKey, plans]) => {
        // Recreate local Date from key and compute today/tomorrow keys
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

  return (
    <View className="flex-1 bg-zinc-100 dark:bg-zinc-950">
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
                icon="magnifyingglass"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSearch((v) => !v);
                }}
              />
              <HeaderIconButton
                icon="line.3.horizontal.decrease.circle"
                onPress={onPressFilter}
              />
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
              <IconSymbol name="magnifyingglass" size={18} color="#8E8E93" />
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
                  <IconSymbol name="xmark" size={18} color="#8E8E93" />
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
                height: 44,
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
                Entdecken
              </Text>
            </BlurView>
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
  icon: Parameters<typeof IconSymbol>[0]["name"];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
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
      <IconSymbol name={icon as any} size={18} color="#1C1C1E" />
    </Pressable>
  );
}
