import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/client/auth";
import { orpc } from "@/client/orpc";
import Avatar from "@/components/Avatar";
import DateTimeBottomSheet from "@/components/DateTimeBottomSheet";
import LocationEditBottomSheet from "@/components/LocationEditBottomSheet";
import { shadows } from "@/components/PlanCard";
import TextEditBottomSheet from "@/components/TextEditBottomSheet";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useLocation } from "@/hooks/useLocation";
import {
  activities,
  type ActivityGroupId,
  type ActivityId,
} from "@/shared/activities";
import { calculateDistance, isWithinRadius } from "@/shared/utils/distance";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReactNode, useMemo, useState } from "react";
import tinycolor from "tinycolor2";

const typography = {
  largeTitle: { fontSize: 34, fontWeight: "700" as const, lineHeight: 41 },
  title2: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  body: { fontSize: 17, fontWeight: "400" as const, lineHeight: 22 },
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

const getGroupIdFromActivity = (
  activityId?: ActivityId
): ActivityGroupId | undefined => {
  if (!activityId) return undefined;
  const [groupId] = (activityId as string).split("/");
  return groupId as ActivityGroupId;
};

const getActivityGradient = (activityId?: ActivityId) => {
  const groupId = getGroupIdFromActivity(activityId);
  const base = (groupId && activities[groupId]?.color) || "#94a3b8";
  const c1 = tinycolor(base).lighten(35).toHexString();
  const c2 = tinycolor(base).lighten(15).toHexString();
  const c3 = tinycolor(base).toHexString();
  return [c1, c2, c3] as const;
};

const getActivityIcon = (activityId?: ActivityId) => {
  const groupId = getGroupIdFromActivity(activityId);
  switch (groupId) {
    case "food_drink":
      return "fork.knife";
    case "outdoors":
      return "mountain.2";
    case "social":
      return "person.2";
    case "sport":
      return "figure.run";
    case "arts_culture":
      return "theatermasks";
    case "learning":
      return "book";
    case "travel":
      return "airplane";
    case "wellness":
      return "heart";
    case "home":
      return "house";
    default:
      return "calendar";
  }
};

export default function PlanDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id as string;

  const queryClient = useQueryClient();
  const { session } = useSession();
  const {
    data: plan,
    refetch,
    isFetching,
    isRefetching,
  } = useQuery(orpc.plan.get.queryOptions({ input: { id } }));
  const changePlan = useMutation(
    orpc.plan.change.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );
  const updateUser = useMutation(
    orpc.user.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );
  const participateInPlan = useMutation(
    orpc.plan.participate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        Alert.alert(
          "Erfolgreich teilgenommen!",
          "Der Plan wurde zu deinen Plänen hinzugefügt."
        );
      },
      onError: (error: any) => {
        if (error?.code === "ALREADY_OWNER") {
          Alert.alert("Du besitzt diesen Plan bereits");
        } else {
          Alert.alert(
            "Fehler",
            "Konnte nicht am Plan teilnehmen. Bitte versuche es erneut."
          );
        }
      },
    })
  );

  const activity = (plan?.activity ?? undefined) as ActivityId | undefined;
  const [c1, c2, c3] = getActivityGradient(activity);
  const icon = getActivityIcon(activity);
  const isOwner = plan?.creatorId === session?.id;
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [showTextEdit, setShowTextEdit] = useState<{
    type: "title" | "description";
  } | null>(null);
  const [showLocationEdit, setShowLocationEdit] = useState<number | null>(null);
  // Overlap UI state
  const [overlapRadiusM] = useState(1000);
  const {
    latitude: userLat,
    longitude: userLon,
    hasPermission: hasLocationPermission,
  } = useLocation();

  // Ensure locations is always an array to prevent runtime errors
  const safeLocations = useMemo(
    () => (Array.isArray(plan?.locations) ? plan.locations : []),
    [plan?.locations]
  );

  // Compute time window for overlap search
  const { windowStartISO, windowEndISO } = useMemo(() => {
    if (!plan)
      return {
        windowStartISO: undefined as string | undefined,
        windowEndISO: undefined as string | undefined,
      };
    const start = new Date(plan.startDate as unknown as string);
    const end = plan.endDate
      ? new Date(plan.endDate as unknown as string)
      : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    // Expand window a bit to include slight differences
    const windowStart = new Date(start.getTime() - 3 * 60 * 60 * 1000);
    const windowEnd = new Date(end.getTime() + 3 * 60 * 60 * 1000);
    return {
      windowStartISO: windowStart.toISOString(),
      windowEndISO: windowEnd.toISOString(),
    };
  }, [plan]);

  const center = useMemo(() => {
    const first = safeLocations[0];
    if (
      first &&
      typeof first.latitude === "number" &&
      typeof first.longitude === "number"
    ) {
      return { latitude: first.latitude, longitude: first.longitude };
    }
    return undefined as { latitude: number; longitude: number } | undefined;
  }, [safeLocations]);

  // Fetch overlapping candidates near in time/location/activity
  const { data: overlapsRaw } = useQuery(
    orpc.plan.find.queryOptions({
      input: {
        startDate: windowStartISO
          ? (new Date(windowStartISO) as any)
          : undefined,
        endDate: windowEndISO ? (new Date(windowEndISO) as any) : undefined,
        location: center
          ? {
              latitude: center.latitude,
              longitude: center.longitude,
              radius: overlapRadiusM,
            }
          : undefined,
      },
      enabled: Boolean(plan && windowStartISO && windowEndISO),
    })
  );

  type OverlapCandidate = {
    id: string;
    title?: string | null;
    startDate: string | Date;
    endDate?: string | Date | null;
    activity: ActivityId;
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    locationTitle?: string | null;
    creatorId: string;
  };

  const overlaps: OverlapCandidate[] = useMemo(() => {
    if (!overlapsRaw) return [];
    const list = (overlapsRaw as any[]).filter((o) => o && o.id !== id);
    return list as OverlapCandidate[];
  }, [overlapsRaw, id]);

  const hasOwnOverlap = useMemo(() => {
    if (!session?.id) return false;
    return overlaps.some((o) => o.creatorId === session.id);
  }, [overlaps, session?.id]);

  // Fetch creator profiles for overlaps
  const uniqueCreatorIds = useMemo(() => {
    const set = new Set<string>();
    for (const o of overlaps) set.add(o.creatorId);
    return Array.from(set);
  }, [overlaps]);

  const { data: creatorProfiles } = useQuery(
    orpc.user.getMany.queryOptions({
      input: { ids: uniqueCreatorIds as any },
      enabled: uniqueCreatorIds.length > 0,
    })
  );

  const profileById = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name?: string; image?: string }
    >();
    for (const p of (creatorProfiles as any[]) ?? []) {
      if (p?.id) map.set(p.id, p);
    }
    return map;
  }, [creatorProfiles]);

  // Current plan owner profile
  const { data: ownerProfile } = useQuery(
    orpc.user.get.queryOptions({
      input: { id: (plan?.creatorId as any) || "" },
      enabled: Boolean(plan?.creatorId),
    })
  );

  type EnrichedOverlap = OverlapCandidate & {
    diff: {
      timeMinutes: number;
      distanceMeters?: number;
      differentTitle: boolean;
    };
    creator?: { id: string; name?: string; image?: string };
  };

  const { exactMatches, similarMatches } = useMemo(() => {
    if (!plan)
      return {
        exactMatches: [] as EnrichedOverlap[],
        similarMatches: [] as EnrichedOverlap[],
      };
    const baseStart = new Date(plan.startDate as unknown as string);
    const baseEnd = plan.endDate
      ? new Date(plan.endDate as unknown as string)
      : new Date(baseStart.getTime() + 60 * 60 * 1000);
    const baseTitle = (plan.title ?? "").trim().toLowerCase();

    const isSameLocation = (o: OverlapCandidate) => {
      if (!safeLocations?.length) return false;
      for (const loc of safeLocations) {
        const lat = Number(loc.latitude ?? NaN);
        const lon = Number(loc.longitude ?? NaN);
        if (
          isFinite(lat) &&
          isFinite(lon) &&
          isFinite(Number(o.latitude)) &&
          isFinite(Number(o.longitude))
        ) {
          if (
            isWithinRadius(
              lat,
              lon,
              Number(o.latitude),
              Number(o.longitude),
              50
            )
          )
            return true;
        }
        const a = (loc.title ?? loc.address ?? "")
          .toString()
          .trim()
          .toLowerCase();
        const b = (o.locationTitle ?? o.address ?? "")
          .toString()
          .trim()
          .toLowerCase();
        if (a && b && a === b) return true;
      }
      return false;
    };

    const enriched: EnrichedOverlap[] = overlaps
      .map((o) => {
        const oStart = new Date(o.startDate as any);
        const oEnd = o.endDate
          ? new Date(o.endDate as any)
          : new Date(oStart.getTime() + 60 * 60 * 1000);
        const overlapsInTime = oStart <= baseEnd && oEnd >= baseStart;
        if (!overlapsInTime) return null;
        const timeMinutes =
          Math.abs(oStart.getTime() - baseStart.getTime()) / 60000;
        let distanceMeters: number | undefined = undefined;
        if (
          safeLocations?.length &&
          isFinite(Number(o.latitude)) &&
          isFinite(Number(o.longitude))
        ) {
          distanceMeters = Math.min(
            ...safeLocations
              .map((loc) =>
                calculateDistance(
                  Number(loc.latitude),
                  Number(loc.longitude),
                  Number(o.latitude),
                  Number(o.longitude)
                )
              )
              .filter((d) => isFinite(d))
          );
        }
        const differentTitle =
          baseTitle !== (o.title ?? "").toString().trim().toLowerCase();
        return {
          ...o,
          diff: { timeMinutes, distanceMeters, differentTitle },
          creator: profileById.get(o.creatorId),
        } as EnrichedOverlap;
      })
      .filter(Boolean) as EnrichedOverlap[];

    const exact: EnrichedOverlap[] = [];
    const similar: EnrichedOverlap[] = [];
    for (const e of enriched) {
      const sameLoc = isSameLocation(e);
      const isExact =
        sameLoc &&
        e.diff.timeMinutes <= 5 &&
        !e.diff.differentTitle &&
        e.activity === (plan.activity as ActivityId);
      if (isExact) exact.push(e);
      else similar.push(e);
    }

    exact.sort((a, b) =>
      (a.creator?.name || "").localeCompare(b.creator?.name || "")
    );
    similar.sort((a, b) => {
      const at = a.diff.timeMinutes - b.diff.timeMinutes;
      if (at !== 0) return at;
      const ad =
        (a.diff.distanceMeters ?? Infinity) -
        (b.diff.distanceMeters ?? Infinity);
      return ad;
    });
    return { exactMatches: exact, similarMatches: similar };
  }, [plan, overlaps, safeLocations, profileById]);

  const handleEditTitle = () => {
    if (!isOwner) return;
    setShowTextEdit({ type: "title" });
  };

  const handleEditDescription = () => {
    if (!isOwner) return;
    setShowTextEdit({ type: "description" });
  };

  const handleEditStart = () => {
    if (!isOwner) return;
    setShowStartPicker(true);
  };

  const handleEditEnd = () => {
    if (!isOwner) return;
    setShowEndPicker(true);
  };

  const handleEditLocation = (index: number) => {
    if (!isOwner || !safeLocations[index]) return;
    setShowLocationEdit(index);
  };

  const handleEditCreatorName = () => {
    if (!isOwner || !ownerProfile) return;
    setShowTextEdit({ type: "title" }); // Reuse the text edit but we'll handle it differently
    // For now, we'll use Alert.prompt for creator name as it's less critical
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Name bearbeiten",
        undefined,
        [
          { text: "Abbrechen", style: "cancel" },
          {
            text: "Speichern",
            onPress: (value: string | undefined) => {
              if (value !== undefined) {
                updateUser.mutate({ name: value });
              }
            },
          },
        ],
        "plain-text",
        ownerProfile.name || ""
      );
    } else {
      // For Android/Web, we could show a simple input dialog
      // For now, just open a basic alert - could be improved with a modal
      Alert.alert(
        "Name bearbeiten",
        "Bitte nutze das Profil, um deinen Namen zu ändern."
      );
    }
  };

  if (!plan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
        <View style={{ padding: spacing.lg }}>
          <Text style={{ ...typography.subheadline, color: "#8E8E93" }}>
            Plan nicht gefunden
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const startDateObj = plan?.startDate
    ? new Date(plan.startDate as unknown as string)
    : undefined;
  const endDateObj = plan?.endDate
    ? new Date(plan.endDate as unknown as string)
    : undefined;
  const dayLabel = startDateObj
    ? startDateObj.toLocaleDateString("de-DE", { weekday: "long" })
    : undefined;
  const dateLabel = startDateObj
    ? startDateObj.toLocaleDateString("de-DE", {
        day: "numeric",
        month: "numeric",
      })
    : undefined;
  const primaryLocation = safeLocations[0];
  const locationLabel = primaryLocation
    ? primaryLocation.title || primaryLocation.address || undefined
    : undefined;
  const locationDistanceMeters =
    hasLocationPermission &&
    userLat &&
    userLon &&
    primaryLocation &&
    typeof primaryLocation.latitude === "number" &&
    typeof primaryLocation.longitude === "number"
      ? calculateDistance(
          userLat,
          userLon,
          primaryLocation.latitude,
          primaryLocation.longitude
        )
      : undefined;
  const gradientColors = [
    tinycolor(c1).lighten(10).desaturate(8).toHexString(),
    tinycolor.mix(c1, c2, 40).desaturate(6).toHexString(),
    tinycolor(c3).darken(6).desaturate(4).toHexString(),
  ] as const;
  const gradientMid = tinycolor
    .mix(gradientColors[0], gradientColors[2], 45)
    .toHexString();
  const heroIsDark = tinycolor(gradientMid).getLuminance() < 0.48;
  const heroTextColor = heroIsDark ? "#F9FAFB" : "#0F172A";
  const heroMutedColor = tinycolor(heroTextColor)
    .setAlpha(heroIsDark ? 0.72 : 0.68)
    .toRgbString();
  const heroSurfaceBold = heroIsDark
    ? "rgba(255,255,255,0.18)"
    : "rgba(15,23,42,0.12)";
  const heroBorder = heroIsDark
    ? "rgba(255,255,255,0.35)"
    : "rgba(15,23,42,0.15)";
  const heroIconColor = heroIsDark
    ? "rgba(0,0,0,0.18)"
    : "rgba(255,255,255,0.18)";
  const pageBackground = tinycolor(c1).lighten(38).desaturate(15).toHexString();
  const accentToken = tinycolor(c3).saturate(10).toHexString();
  const participateBackground = heroIsDark
    ? tinycolor(accentToken).setAlpha(0.22).toRgbString()
    : tinycolor(accentToken).lighten(28).setAlpha(0.32).toRgbString();
  const participateBorder = heroIsDark
    ? tinycolor(accentToken).setAlpha(0.45).toRgbString()
    : tinycolor(accentToken).setAlpha(0.28).toRgbString();
  const participateTextColor = heroIsDark
    ? "#FDFDFE"
    : tinycolor(accentToken).darken(12).toHexString();
  const hostName = ownerProfile?.name || "Unbekannt";

  return (
    <View style={{ flex: 1, backgroundColor: pageBackground }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
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
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        >
          <LinearGradient
            colors={[gradientColors[0], gradientColors[1], gradientColors[2]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32,
              paddingHorizontal: spacing.md,
              paddingTop: spacing.md,
              paddingBottom: spacing.lg,
              marginBottom: spacing.lg,
              position: "relative",
              overflow: "hidden",
              ...shadows.medium,
            }}
          >
            <View
              style={{
                position: "absolute",
                top: -60,
                right: -40,
                opacity: 0.14,
              }}
            >
              <IconSymbol name={icon} size={220} color={heroIconColor} />
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Pressable onPress={() => router.back()}>
                <BlurView
                  intensity={heroIsDark ? 50 : 70}
                  tint={heroIsDark ? "dark" : "light"}
                  style={{
                    borderRadius: 18,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <IconSymbol
                    name="chevron.left"
                    size={14}
                    color={heroTextColor}
                  />
                  <Text
                    style={{
                      ...typography.subheadline,
                      color: heroMutedColor,
                      fontWeight: "600",
                    }}
                  >
                    Zurück
                  </Text>
                </BlurView>
              </Pressable>
              {!isOwner && !hasOwnOverlap && (
                <Pressable
                  onPress={() => participateInPlan.mutate({ id })}
                  disabled={participateInPlan.isPending}
                  style={{
                    borderRadius: 18,
                    backgroundColor: participateBackground,
                    borderWidth: 1,
                    borderColor: participateBorder,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <IconSymbol
                      name={
                        participateInPlan.isPending
                          ? "clock"
                          : "person.badge.plus"
                      }
                      size={16}
                      color={participateTextColor}
                    />
                    <Text
                      style={{
                        ...typography.subheadline,
                        fontWeight: "600",
                        color: participateTextColor,
                      }}
                    >
                      {participateInPlan.isPending
                        ? "Teilnehmen..."
                        : "Teilnehmen"}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>

            <View style={{ marginTop: spacing.lg, gap: spacing.sm + 4 }}>
              {/* Combined Date and Time Field */}
              {startDateObj && (
                <Pressable
                  onPress={isOwner ? handleEditStart : undefined}
                  disabled={!isOwner}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    paddingVertical: 0,
                    opacity: isOwner ? 1 : 0.8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing.xs,
                        flexWrap: "wrap",
                      }}
                    >
                      {dayLabel && dateLabel && (
                        <Text
                          style={{
                            ...typography.subheadline,
                            color: heroTextColor,
                            fontWeight: "500",
                          }}
                        >
                          {`${dayLabel}, ${dateLabel}`}
                        </Text>
                      )}
                      <Text
                        style={{
                          ...typography.subheadline,
                          color: heroTextColor,
                        }}
                      >
                        {startDateObj.toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </Text>
                      {endDateObj ? (
                        <>
                          <Text
                            style={{
                              ...typography.subheadline,
                              color: heroMutedColor,
                            }}
                          >
                            –
                          </Text>
                          <Pressable
                            onPress={isOwner ? handleEditEnd : undefined}
                            disabled={!isOwner}
                            onStartShouldSetResponder={() => true}
                            onResponderTerminationRequest={() => false}
                          >
                            <Text
                              style={{
                                ...typography.subheadline,
                                color: heroTextColor,
                              }}
                            >
                              {endDateObj.toLocaleTimeString("de-DE", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })}
                            </Text>
                          </Pressable>
                        </>
                      ) : (
                        isOwner && (
                          <>
                            <Text
                              style={{
                                ...typography.subheadline,
                                color: heroMutedColor,
                              }}
                            >
                              –
                            </Text>
                            <Pressable
                              onPress={handleEditEnd}
                              onStartShouldSetResponder={() => true}
                              onResponderTerminationRequest={() => false}
                            >
                              <Text
                                style={{
                                  ...typography.subheadline,
                                  color: heroMutedColor,
                                  fontStyle: "italic",
                                }}
                              >
                                Endzeit
                              </Text>
                            </Pressable>
                          </>
                        )
                      )}
                    </View>
                  </View>
                  {isOwner && (
                    <IconSymbol
                      name="chevron.right"
                      size={12}
                      color={heroMutedColor}
                      style={{ marginTop: 2 }}
                    />
                  )}
                </Pressable>
              )}

              {/* Title Field */}
              <Pressable
                onPress={isOwner ? handleEditTitle : undefined}
                disabled={!isOwner}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  paddingVertical: 0,
                  opacity: isOwner ? 1 : 0.9,
                }}
              >
                <Text
                  style={{
                    ...typography.largeTitle,
                    color: heroTextColor,
                    fontSize: 32,
                    lineHeight: 38,
                    flex: 1,
                  }}
                  numberOfLines={2}
                >
                  {plan.title}
                </Text>
                {isOwner && (
                  <IconSymbol
                    name="chevron.right"
                    size={12}
                    color={heroMutedColor}
                    style={{ marginTop: 6 }}
                  />
                )}
              </Pressable>

              {/* Description Field */}
              {(plan.description !== undefined || isOwner) && (
                <Pressable
                  onPress={isOwner ? handleEditDescription : undefined}
                  disabled={!isOwner}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    paddingVertical: 0,
                    opacity: isOwner ? 1 : 0.8,
                  }}
                >
                  <Text
                    style={{
                      ...typography.subheadline,
                      color: plan.description ? heroTextColor : heroMutedColor,
                      flex: 1,
                      fontStyle: plan.description ? "normal" : "italic",
                    }}
                    numberOfLines={3}
                  >
                    {plan.description || "Beschreibung hinzufügen"}
                  </Text>
                  {isOwner && (
                    <IconSymbol
                      name="chevron.right"
                      size={12}
                      color={heroMutedColor}
                      style={{ marginTop: 2 }}
                    />
                  )}
                </Pressable>
              )}
            </View>

            {(primaryLocation || isOwner) && (
              <View style={{ marginTop: spacing.sm + 4 }}>
                <Pressable
                  onPress={
                    isOwner
                      ? primaryLocation
                        ? () => handleEditLocation(0)
                        : () => {
                            // TODO: Add location button
                          }
                      : undefined
                  }
                  disabled={!isOwner}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    paddingVertical: 0,
                    opacity: isOwner ? 1 : 0.8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: spacing.sm,
                      flex: 1,
                    }}
                  >
                    <IconSymbol
                      name="mappin.and.ellipse"
                      size={18}
                      color={heroTextColor}
                      style={{ marginTop: 2 }}
                    />
                    {primaryLocation && locationLabel ? (
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text
                          style={{
                            ...typography.subheadline,
                            color: heroTextColor,
                            fontWeight: "600",
                          }}
                          numberOfLines={1}
                        >
                          {locationLabel}
                        </Text>
                        {locationDistanceMeters !== undefined && (
                          <Text
                            style={{
                              ...typography.caption1,
                              color: heroMutedColor,
                            }}
                          >
                            {locationDistanceMeters < 1000
                              ? `${Math.round(locationDistanceMeters)} m`
                              : `${(locationDistanceMeters / 1000).toFixed(1)} km`}{" "}
                            entfernt
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text
                        style={{
                          ...typography.subheadline,
                          color: heroMutedColor,
                          fontStyle: "italic",
                        }}
                      >
                        Ort hinzufügen
                      </Text>
                    )}
                  </View>
                  {isOwner && (
                    <IconSymbol
                      name="chevron.right"
                      size={12}
                      color={heroMutedColor}
                      style={{ marginTop: 2 }}
                    />
                  )}
                </Pressable>
              </View>
            )}

            <View style={{ marginTop: spacing.sm + 4 }}>
              <Pressable
                onPress={isOwner ? handleEditCreatorName : undefined}
                disabled={!isOwner}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: spacing.sm,
                  justifyContent: "space-between",
                  paddingVertical: 0,
                  opacity: isOwner ? 1 : 0.8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: spacing.sm,
                    flex: 1,
                  }}
                >
                  <Avatar
                    size={40}
                    image={ownerProfile?.image as any}
                    name={ownerProfile?.name as any}
                  />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text
                      style={{
                        ...typography.subheadline,
                        color: heroTextColor,
                        fontWeight: "600",
                      }}
                    >
                      {hostName}
                    </Text>
                    <Text
                      style={{
                        ...typography.caption1,
                        color: heroMutedColor,
                      }}
                    >
                      {isOwner ? "Organisiert von dir" : "Veranstalter"}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.xs,
                  }}
                >
                  {!isOwner && plan.maybe !== undefined && (
                    <View
                      style={{
                        backgroundColor: heroSurfaceBold,
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: heroBorder,
                      }}
                    >
                      <Text
                        style={{
                          ...typography.caption1,
                          color: heroTextColor,
                        }}
                      >
                        {plan.maybe ? "Vielleicht" : "Sicher dabei"}
                      </Text>
                    </View>
                  )}
                  {isOwner && (
                    <IconSymbol
                      name="chevron.right"
                      size={12}
                      color={heroMutedColor}
                      style={{ marginTop: 2 }}
                    />
                  )}
                </View>
              </Pressable>
            </View>
          </LinearGradient>
          <View
            style={{
              paddingHorizontal: spacing.md,
              marginTop: -spacing.md,
              gap: spacing.md,
              paddingBottom: spacing.lg,
            }}
          >
            {plan.url && (
              <SectionCard
                icon="bubble.left"
                title="Weitere Infos"
                accentColor={accentToken}
              >
                <InfoRow
                  icon="link"
                  label="Link"
                  value={plan.url}
                  accentColor={accentToken}
                />
              </SectionCard>
            )}

            {/* Teilnehmer mit überlappenden Plänen */}
            {(exactMatches.length > 0 || similarMatches.length > 0) && (
              <SectionCard
                icon="person.2"
                title="Andere Teilnehmer"
                accentColor={accentToken}
                subtitle="Personen mit überlappenden Plänen"
              >
                {exactMatches.length > 0 && (
                  <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
                    {exactMatches.map((e) => (
                      <View
                        key={e.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: spacing.sm,
                          paddingVertical: spacing.xs,
                        }}
                      >
                        <Avatar
                          size={32}
                          image={e.creator?.image as any}
                          name={e.creator?.name as any}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              ...typography.subheadline,
                              fontWeight: "600",
                              color: "#1C1C1E",
                            }}
                          >
                            {e.creator?.name || "Unbekannt"}
                          </Text>
                          <Text
                            style={{
                              ...typography.caption1,
                              color: "#8E8E93",
                            }}
                          >
                            {e.title || "Plan"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {similarMatches.length > 0 && (
                  <View style={{ gap: spacing.sm }}>
                    {exactMatches.length > 0 && (
                      <Text
                        style={{
                          ...typography.caption1,
                          color: "#6B7280",
                          marginTop: spacing.xs,
                        }}
                      >
                        Ähnliche Pläne
                      </Text>
                    )}
                    {similarMatches.map((e) => (
                      <View
                        key={e.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: spacing.sm,
                          paddingVertical: spacing.xs,
                        }}
                      >
                        <Avatar
                          size={32}
                          image={e.creator?.image as any}
                          name={e.creator?.name as any}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              ...typography.subheadline,
                              fontWeight: "600",
                              color: "#1C1C1E",
                            }}
                          >
                            {e.creator?.name || "Unbekannt"}
                          </Text>
                          <Text
                            style={{
                              ...typography.caption1,
                              color: "#8E8E93",
                            }}
                          >
                            {e.title || "Plan"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </SectionCard>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
      {showActivityPicker && plan && (
        <ActivityBottomSheet
          selected={plan.activity as ActivityId}
          onClose={() => setShowActivityPicker(false)}
          onSelect={(value) => {
            setShowActivityPicker(false);
            changePlan.mutate({ id, plan: { activity: value } });
          }}
        />
      )}
      {showStartPicker && (
        <DateTimeBottomSheet
          title="Startzeit wählen"
          accentColor={c3}
          initialDate={
            plan?.startDate
              ? new Date(plan.startDate as unknown as string)
              : new Date()
          }
          onClose={() => setShowStartPicker(false)}
          onSelect={(d) => {
            setShowStartPicker(false);
            changePlan.mutate({ id, plan: { startDate: d.toISOString() } });
          }}
        />
      )}
      {showEndPicker && (
        <DateTimeBottomSheet
          title="Endzeit wählen"
          accentColor={c3}
          initialDate={
            plan?.endDate
              ? new Date(plan.endDate as unknown as string)
              : new Date()
          }
          onClose={() => setShowEndPicker(false)}
          onSelect={(d) => {
            setShowEndPicker(false);
            changePlan.mutate({ id, plan: { endDate: d.toISOString() } });
          }}
        />
      )}
      {showTextEdit && (
        <TextEditBottomSheet
          title={
            showTextEdit.type === "title"
              ? "Titel bearbeiten"
              : "Beschreibung bearbeiten"
          }
          initialValue={
            showTextEdit.type === "title"
              ? (plan?.title ?? "")
              : (plan?.description ?? "")
          }
          multiline={showTextEdit.type === "description"}
          accentColor={c3}
          onClose={() => setShowTextEdit(null)}
          onSave={(value) => {
            if (showTextEdit.type === "title") {
              changePlan.mutate({ id, plan: { title: value } });
            } else if (showTextEdit.type === "description") {
              changePlan.mutate({ id, plan: { description: value } });
            }
            setShowTextEdit(null);
          }}
        />
      )}
      {showLocationEdit !== null && (
        <LocationEditBottomSheet
          currentLocation={
            safeLocations[showLocationEdit]
              ? {
                  title: safeLocations[showLocationEdit].title || undefined,
                  address: safeLocations[showLocationEdit].address || undefined,
                  latitude: safeLocations[showLocationEdit].latitude,
                  longitude: safeLocations[showLocationEdit].longitude,
                }
              : undefined
          }
          accentColor={c3}
          userLat={userLat}
          userLon={userLon}
          onClose={() => setShowLocationEdit(null)}
          onSelect={(location) => {
            if (showLocationEdit !== null) {
              const updated = [...safeLocations];
              updated[showLocationEdit] = location as any;
              changePlan.mutate({ id, plan: { locations: updated as any } });
            }
            setShowLocationEdit(null);
          }}
        />
      )}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
  accentColor = "#0F172A",
}: {
  icon: Parameters<typeof IconSymbol>[0]["name"];
  label: string;
  value: ReactNode;
  onPress?: () => void;
  accentColor?: string;
}) {
  const interactive = typeof onPress === "function";
  const background = tinycolor(accentColor).setAlpha(0.06).toRgbString();
  const border = tinycolor(accentColor).setAlpha(0.1).toRgbString();
  const iconBg = tinycolor(accentColor).setAlpha(0.12).toRgbString();
  const labelColor = tinycolor(accentColor).darken(10).toHexString();
  const valueColor = tinycolor(accentColor).darken(25).toHexString();
  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: background,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: border,
        paddingHorizontal: spacing.sm + 6,
        paddingVertical: spacing.sm,
        opacity: interactive ? 1 : 0.9,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: iconBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconSymbol name={icon} size={16} color={accentColor} />
        </View>
        <Text style={{ ...typography.subheadline, color: labelColor }}>
          {label}
        </Text>
      </View>
      <View style={{ flexShrink: 1, maxWidth: "55%", alignItems: "flex-end" }}>
        {typeof value === "string" ? (
          <Text
            style={{
              ...typography.subheadline,
              color: valueColor,
              textAlign: "right",
            }}
            numberOfLines={2}
          >
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </Pressable>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  accentColor,
  children,
}: {
  icon: Parameters<typeof IconSymbol>[0]["name"];
  title: string;
  subtitle?: string;
  accentColor: string;
  children: ReactNode;
}) {
  const surface = tinycolor(accentColor).setAlpha(0.04).toRgbString();
  const border = tinycolor(accentColor).setAlpha(0.08).toRgbString();
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: spacing.md + 2,
        borderWidth: 1,
        borderColor: border,
        gap: spacing.sm,
        ...shadows.small,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconSymbol name={icon} size={20} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.title2, color: "#0F172A" }}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                ...typography.caption1,
                color: "#6B7280",
                marginTop: 2,
              }}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}

function ActivityBottomSheet({
  selected,
  onClose,
  onSelect,
}: {
  selected: ActivityId;
  onClose: () => void;
  onSelect: (id: ActivityId) => void;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        backgroundColor: "rgba(0,0,0,0.2)",
        justifyContent: "flex-end",
      }}
    >
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View
        style={{
          backgroundColor: "#fff",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: 24,
          paddingTop: 8,
        }}
      >
        <View
          style={{
            height: 4,
            width: 44,
            backgroundColor: "#D1D1D6",
            borderRadius: 2,
            alignSelf: "center",
            marginBottom: 8,
          }}
        />
        <ScrollView style={{ maxHeight: 420 }}>
          {Object.entries(activities).map(([groupId, group]) => (
            <View
              key={groupId}
              style={{ paddingHorizontal: 16, paddingTop: 12 }}
            >
              <Text
                style={{
                  ...typography.caption1,
                  color: "#8E8E93",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                {group.nameDe || group.name}
              </Text>
              <View style={{ gap: 8 }}>
                <Pressable
                  onPress={() => onSelect(groupId as ActivityId)}
                  style={{
                    backgroundColor:
                      (selected as string) === groupId ? "#E5F2FF" : "#F2F2F7",
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: "#1C1C1E" }}>
                    {group.nameDe || group.name}
                  </Text>
                </Pressable>
                {(() => {
                  const subs = group.subActivities as Record<
                    string,
                    { name: string }
                  >;
                  return Object.keys(subs).map((subId) => {
                    const sub = (subs as Record<string, { name: string }>)[
                      subId
                    ] as { name: string; nameDe?: string };
                    const value = `${groupId}/${subId}` as ActivityId;
                    const isSelected =
                      (selected as string) === (value as string);
                    return (
                      <Pressable
                        key={value}
                        onPress={() => onSelect(value)}
                        style={{
                          backgroundColor: isSelected ? "#E5F2FF" : "#F2F2F7",
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderRadius: 12,
                        }}
                      >
                        <Text style={{ color: "#1C1C1E" }}>
                          {sub.nameDe || sub.name}
                        </Text>
                      </Pressable>
                    );
                  });
                })()}
              </View>
            </View>
          ))}
          <View style={{ height: 16 }} />
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Pressable
            onPress={onClose}
            className="items-center p-3"
            style={{
              backgroundColor: "#E5E5EA",
            }}
          >
            <Text style={{ color: "#1C1C1E", ...typography.subheadline }}>
              Abbrechen
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
