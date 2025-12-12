import * as Haptics from "expo-haptics";
import { useNavigation, useRouter } from "expo-router";
import { useFeatureFlag } from "posthog-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, buttonTextVariants } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass";
import { GradientBackdrop } from "@/components/ui/gradient-backdrop";
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
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useColorScheme } from "@/hooks/useColorScheme";
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
  participants?: { name: string; image?: string }[];
};

type GroupedPlans = {
  date: string;
  dayLabel: string;
  plans: PlanListItem[];
};

export default function PlansScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const simpleAppBar = useFeatureFlag("simple-appbar-for-starpage");
  const aiPlanBottomSheetRef = useRef<AIPlanBottomSheetRef>(null);
  const filterRef = useRef<PlanFilterBottomSheetRef>(null);
  const [filter, setFilter] = useState<PlanFilter | undefined>(undefined);
  const queryClient = useQueryClient();

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
              <IconSymbol
                name="line.3.horizontal.decrease.circle"
                size={22}
                color="#007AFF"
              />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                aiPlanBottomSheetRef.current?.present();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol name="plus" size={22} color="#007AFF" />
            </Pressable>
          </View>
        ),
      } as any);
    }
  }, [simpleAppBar, navigation]);
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
            participants.push({
              name: participantNameById[creatorId],
              image: undefined, // Can be extended later if profile images are available
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
  }, [plans, participantNameById]);

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

  // Participants are now fetched as part of myPlans via similarOverlappingPlans

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

  // Simple app bar version
  if (simpleAppBar) {
    return (
      <View className={`flex-1 ${surfaceClass}`}>
        {error && (
          <View style={{ padding: spacing.lg }}>
            <Text className="text-red-500" style={typography.subheadline}>
              {error.message}
            </Text>
          </View>
        )}
        <Animated.ScrollView
          style={{ flex: 1 }}
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
            paddingTop: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingBottom: bottomPadding,
          }}
        >
          {groupedPlans.map((group, index) => (
            <View key={group.date}>
              {renderDayGroup({ item: group, index })}
            </View>
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

        {isAndroid && groupedPlans.length > 0 && (
          <NativeFAB onPress={() => aiPlanBottomSheetRef.current?.present()} />
        )}

        <AIPlanBottomSheet
          ref={aiPlanBottomSheetRef}
          onPlanCreated={(plan: any) => {
            console.log("Plan created:", plan);
            queryClient.invalidateQueries({
              queryKey: orpc.plan.myPlans.queryOptions({
                input: filter ?? {},
              }).queryKey,
            });
            if (plan?.id) {
              setTimeout(() => {
                router.push(`/plan/${plan.id}` as any);
              }, 0);
            }
          }}
        />

        <PlanFilterBottomSheet
          ref={filterRef}
          initial={filter}
          onApply={(f) => setFilter(f)}
          hideLocation
        />
      </View>
    );
  }

  // Original complex app bar version
  return (
    <SafeAreaView edges={["top"]} className="flex-1">
      <GradientBackdrop variant="cool" />
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
            <GlassSurface
              intensity={80}
              tint={colorScheme === "dark" ? "dark" : "light"}
              className="border-b border-white/30 dark:border-white/10 bg-white/60 dark:bg-black/40"
              style={{
                height: 44,
                justifyContent: "center",
                alignItems: "center",
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
            </GlassSurface>
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
          // Refresh the plans list so the new plan appears (also refreshes participants via similarOverlappingPlans)
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
