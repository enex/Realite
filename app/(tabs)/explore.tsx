import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import orpc from "@/client/orpc";
import { PlanCard, shadows } from "@/components/PlanCard";
import PlanFilterBottomSheet, {
  PlanFilterBottomSheetRef,
  type PlanFilter,
} from "@/components/PlanFilterBottomSheet";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useLocation } from "@/hooks/useLocation";
import type { ActivityId } from "@/shared/activities";
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
  participants?: string[];
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

  const { data: foundPlans, error } = useQuery(
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

  const data = useMemo<PlanListItem[]>(() => {
    if (!foundPlans) return [];

    // Map flattened findPlans rows to PlanCard items
    return foundPlans.map((p) => ({
      id: p.id,
      title: p.title,
      date: (p.startDate?.toISOString?.() ?? p.startDate) || "",
      status: "committed",
      activity: p.activity as ActivityId,
      locations:
        p.locationTitle || p.latitude || p.longitude
          ? [
              {
                title: p.locationTitle ?? "",
                address: p.address ?? undefined,
                latitude: Number(p.latitude ?? 0),
                longitude: Number(p.longitude ?? 0),
                url: p.locationUrl ?? undefined,
                description: p.locationDescription ?? undefined,
                category: p.locationCategory ?? undefined,
              },
            ]
          : undefined,
      participants: [],
    }));
  }, [foundPlans]);

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
          <Text>{JSON.stringify(foundPlans)}</Text>
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
