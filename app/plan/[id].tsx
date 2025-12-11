import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useSession } from "@/client/auth";
import { orpc } from "@/client/orpc";
import { shadows } from "@/components/PlanCard";
import SmartDateTimePicker from "@/components/SmartDateTimePicker";
import { IconSymbol } from "@/components/ui/IconSymbol";
import {
  activities,
  type ActivityGroupId,
  type ActivityId,
} from "@/shared/activities";
import { calculateDistance, isWithinRadius } from "@/shared/utils/distance";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ReactNode, useEffect, useMemo, useState } from "react";
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
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && windowWidth >= 1024;
  const pageMaxWidth = 860;

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
  // Overlap UI state
  const [overlapRadiusM] = useState(1000);

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

  const copiedFromMatch = useMemo(() => {
    if (!isOwner) return undefined;
    const exactSource = exactMatches.find(
      (m) => m.creator?.id && m.creator.id !== session?.id
    );
    if (exactSource) return exactSource;
    return similarMatches.find(
      (m) => m.creator?.id && m.creator.id !== session?.id
    );
  }, [isOwner, exactMatches, similarMatches, session?.id]);

  const promptEdit = (
    title: string,
    current: string,
    onSubmit: (value: string) => void
  ) => {
    Alert.prompt(
      title,
      undefined,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Speichern",
          onPress: (value: string | undefined) => {
            if (value !== undefined) onSubmit(value);
          },
        },
      ],
      "plain-text",
      current
    );
  };

  const handleEditTitle = () => {
    if (!isOwner) return;
    promptEdit("Titel bearbeiten", plan?.title ?? "", (value) => {
      changePlan.mutate({ id, plan: { title: value } });
    });
  };

  const handleEditDescription = () => {
    if (!isOwner) return;
    promptEdit("Beschreibung bearbeiten", plan?.description ?? "", (value) => {
      changePlan.mutate({ id, plan: { description: value } });
    });
  };

  const handleEditStart = () => {
    if (!isOwner) return;
    setShowStartPicker(true);
  };

  const handleEditEnd = () => {
    if (!isOwner) return;
    setShowEndPicker(true);
  };

  const handleEditActivity = () => {
    if (!isOwner) return;
    setShowActivityPicker(true);
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
        day: "2-digit",
        month: "long",
      })
    : undefined;
  const timeRangeLabel = startDateObj
    ? `${startDateObj.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}${
        endDateObj
          ? ` – ${endDateObj.toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}`
          : ""
      }`
    : undefined;
  const primaryLocation = safeLocations[0];
  const locationLabel = primaryLocation
    ? primaryLocation.title || primaryLocation.address || undefined
    : undefined;
  const locationAddress =
    primaryLocation?.title &&
    primaryLocation?.address &&
    primaryLocation.title !== primaryLocation.address
      ? (primaryLocation.address as string)
      : undefined;
  const isMaybe = plan?.maybe === true;
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
  const heroSurface = heroIsDark
    ? "rgba(255,255,255,0.12)"
    : "rgba(15,23,42,0.08)";
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
  const activityLabel = getActivityLabel(plan?.activity as ActivityId);

  return (
    <View style={{ flex: 1, backgroundColor: pageBackground }}>
      <SafeAreaView style={{ flex: 1 }} edges={["left", "right", "bottom"]}>
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
          contentContainerStyle={{
            paddingBottom: spacing.xl,
            ...(isWebLarge ? { alignItems: "center" } : null),
          }}
        >
          <View
            style={
              isWebLarge ? { width: "100%", maxWidth: pageMaxWidth } : null
            }
          >
          <LinearGradient
            colors={[
              gradientColors[0],
              gradientColors[1],
              gradientColors[2],
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32,
              paddingHorizontal: spacing.md,
              paddingTop: insets.top + spacing.md,
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

            <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: spacing.sm,
                }}
              >
                <Pressable
                  onPress={isOwner ? handleEditStart : undefined}
                  onLongPress={isOwner ? handleEditEnd : undefined}
                  disabled={!isOwner}
                >
                  {dayLabel && dateLabel && (
                    <Text
                      style={{
                        ...typography.caption1,
                        color: heroMutedColor,
                        textTransform: "uppercase",
                        letterSpacing: 1.1,
                      }}
                    >
                      {`${dayLabel} · ${dateLabel}${
                        timeRangeLabel ? ` · ${timeRangeLabel}` : ""
                      }`}
                    </Text>
                  )}
                </Pressable>
                {activityLabel && (
                  <Pressable
                    onPress={isOwner ? handleEditActivity : undefined}
                    disabled={!isOwner}
                    style={{
                      backgroundColor: heroSurfaceBold,
                      borderRadius: 14,
                      paddingHorizontal: 10,
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
                      numberOfLines={1}
                    >
                      {activityLabel}
                    </Text>
                  </Pressable>
                )}
              </View>
              <Pressable
                onPress={isOwner ? handleEditTitle : undefined}
                disabled={!isOwner}
              >
                <Text
                  style={{
                    ...typography.largeTitle,
                    color: heroTextColor,
                    fontSize: 40,
                    lineHeight: 46,
                  }}
                >
                  {plan.title}
                </Text>
              </Pressable>
              {plan.description !== undefined && (
                <Pressable
                  onPress={isOwner ? handleEditDescription : undefined}
                  disabled={!isOwner}
                  style={{ marginTop: spacing.sm }}
                >
                  <Text
                    style={{
                      ...typography.subheadline,
                      color: heroMutedColor,
                    }}
                  >
                    {plan.description || "Beschreibung hinzufügen"}
                  </Text>
                </Pressable>
              )}
              {locationLabel && (
                <View
                  style={{
                    marginTop: spacing.sm,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <IconSymbol
                    name="mappin.and.ellipse"
                    size={14}
                    color={heroMutedColor}
                  />
                  <View style={{ flexShrink: 1 }}>
                    <Text
                      style={{
                        ...typography.subheadline,
                        color: heroMutedColor,
                        fontWeight: "600",
                      }}
                      numberOfLines={1}
                    >
                      {locationLabel}
                    </Text>
                    {locationAddress && (
                      <Text
                        style={{
                          ...typography.caption1,
                          color: heroMutedColor,
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {locationAddress}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            <View
              style={{
                marginTop: spacing.md,
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Avatar
                size={40}
                image={ownerProfile?.image as any}
                name={ownerProfile?.name as any}
              />
              <View style={{ flex: 1, gap: 4 }}>
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
                  {isMaybe && (
                    <Text
                      style={{
                        color: tinycolor(heroMutedColor)
                          .setAlpha(0.75)
                          .toRgbString(),
                        fontWeight: "500",
                      }}
                    >
                      {" · vielleicht"}
                    </Text>
                  )}
                </Text>
              </View>
            </View>
            {copiedFromMatch && (
              <View style={{ marginTop: spacing.md }}>
                <HeroMetaItem
                  icon="doc.on.doc"
                  label="Quelle"
                  primary={
                    copiedFromMatch.creator?.name ||
                    "Plan eines anderen Nutzers"
                  }
                  accent={heroTextColor}
                  surface={heroSurface}
                  border={heroBorder}
                  disabled
                />
              </View>
            )}
          </LinearGradient>
          <View
            style={{
              paddingHorizontal: spacing.md,
              marginTop: -spacing.md,
              gap: spacing.md,
              paddingBottom: spacing.lg,
            }}
          >
            <SectionCard
              icon="mappin.and.ellipse"
              title="Orte"
              accentColor={accentToken}
              subtitle={
                isOwner
                  ? "Füge Treffpunkte oder Highlights hinzu"
                  : "Geteilte Treffpunkte"
              }
            >
              <Locations
                isOwner={isOwner}
                id={id}
                accentColor={accentToken}
              />
            </SectionCard>

            {(plan.url || plan.maybe !== undefined) && (
              <SectionCard
                icon="bubble.left"
                title="Weitere Infos"
                accentColor={accentToken}
              >
                {plan.url && (
                  <InfoRow
                    icon="link"
                    label="Link"
                    value={plan.url}
                    accentColor={accentToken}
                  />
                )}
                {plan.maybe !== undefined && (
                  <InfoRow
                    icon="questionmark.circle"
                    label="Vielleicht"
                    value={plan.maybe ? "Ja" : "Nein"}
                    accentColor={accentToken}
                  />
                )}
              </SectionCard>
            )}

            {(exactMatches.length > 0 || similarMatches.length > 0) && (
              <SectionCard
                icon="person.2"
                title="Ähnliche Pläne"
                accentColor={accentToken}
                subtitle="Von anderen Personen in deiner Nähe"
              >
                {exactMatches.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text
                      style={{ ...typography.caption1, color: "#6B7280" }}
                    >
                      Gleich
                    </Text>
                    {exactMatches.map((e) => (
                      <OverlapRow
                        key={e.id}
                        item={e}
                        accent={accentToken}
                        isSource={copiedFromMatch?.id === e.id}
                      />
                    ))}
                  </View>
                )}
                {similarMatches.length > 0 && (
                  <View style={{ gap: 8, marginTop: spacing.sm }}>
                    <Text
                      style={{ ...typography.caption1, color: "#6B7280" }}
                    >
                      Ähnlich
                    </Text>
                    {similarMatches.map((e) => (
                      <OverlapRow
                        key={e.id}
                        item={e}
                        accent={accentToken}
                        isSource={copiedFromMatch?.id === e.id}
                      />
                    ))}
                  </View>
                )}
              </SectionCard>
            )}
          </View>
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

function HeroMetaItem({
  icon,
  label,
  primary,
  secondary,
  accent,
  surface,
  border,
  onPress,
  onLongPress,
  disabled,
}: {
  icon: Parameters<typeof IconSymbol>[0]["name"];
  label: string;
  primary: string;
  secondary?: string;
  accent: string;
  surface: string;
  border: string;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}) {
  const interactive = typeof onPress === "function" && !disabled;
  const readableAccent = tinycolor(accent).darken(10).toHexString();
  const secondaryColor = tinycolor(accent)
    .setAlpha(0.65)
    .desaturate(8)
    .toRgbString();
  const body = (
    <View
      style={{
        backgroundColor: surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: border,
        paddingHorizontal: spacing.sm + 4,
        paddingVertical: spacing.sm,
        minWidth: 120,
        maxWidth: 210,
        flexShrink: 0,
        gap: 4,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: tinycolor(accent).setAlpha(0.18).toRgbString(),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconSymbol name={icon} size={14} color={readableAccent} />
        </View>
        <Text
          style={{
            ...typography.caption1,
            color: secondaryColor,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          ...typography.subheadline,
          color: readableAccent,
          fontWeight: "600",
        }}
        numberOfLines={2}
      >
        {primary}
      </Text>
      {secondary ? (
        <Text
          style={{
            ...typography.caption1,
            color: secondaryColor,
          }}
          numberOfLines={2}
        >
          {secondary}
        </Text>
      ) : null}
    </View>
  );
  if (!interactive && !onLongPress) return body;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ flexShrink: 0 }}
    >
      {body}
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

function getActivityLabel(id?: ActivityId) {
  if (!id) return "";
  const [groupId, subId] = (id as string).split("/");
  const group = activities[groupId as keyof typeof activities];
  if (!group) return id as string;
  if (!subId) return group.nameDe || group.name;
  const sub: any =
    group.subActivities[subId as keyof typeof group.subActivities];
  return sub
    ? `${group.nameDe || group.name}/${sub.nameDe || sub.name}`
    : (id as string);
}

function OverlapRow({
  item,
  accent,
  isSource,
}: {
  item: {
    id: string;
    title?: string | null;
    startDate: string | Date;
    endDate?: string | Date | null;
    creator?: { id: string; name?: string; image?: string };
    diff: {
      timeMinutes: number;
      distanceMeters?: number;
      differentTitle: boolean;
    };
  };
  accent: string;
  isSource?: boolean;
}) {
  const router = useRouter();
  const start = new Date(item.startDate as any);
  const timeStr = start.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const diffs: string[] = [];
  if (item.diff.timeMinutes > 0)
    diffs.push(`${Math.round(item.diff.timeMinutes)} Min anders`);
  if (
    typeof item.diff.distanceMeters === "number" &&
    isFinite(item.diff.distanceMeters) &&
    item.diff.distanceMeters > 4
  )
    diffs.push(`${Math.round(item.diff.distanceMeters)} m entfernt`);
  if (item.diff.differentTitle) diffs.push("anderer Titel");
  const background = tinycolor(accent).setAlpha(0.08).toRgbString();
  const border = tinycolor(accent).setAlpha(0.18).toRgbString();
  const titleColor = tinycolor(accent).darken(20).toHexString();
  const metaColor = tinycolor(accent).darken(32).setAlpha(0.7).toRgbString();
  const chipBg = tinycolor(accent).setAlpha(0.18).toRgbString();
  const chipText = tinycolor(accent).darken(35).toHexString();
  return (
    <Pressable
      onPress={() => router.push(`/plan/${item.id}` as any)}
      style={{
        backgroundColor: background,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: border,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            paddingRight: 8,
            gap: 10,
          }}
        >
          <Avatar
            size={24}
            image={item.creator?.image as any}
            name={item.creator?.name as any}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ ...typography.subheadline, color: titleColor }}>
              {item.title || "Plan"}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <Text style={{ ...typography.caption1, color: metaColor }}>
                {timeStr}
                {item.creator?.name ? ` · ${item.creator.name}` : ""}
              </Text>
              {isSource && (
                <View
                  style={{
                    backgroundColor: chipBg,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ ...typography.caption1, color: chipText }}>
                    Original
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {diffs.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              maxWidth: 180,
              justifyContent: "flex-end",
            }}
          >
            {diffs.map((d, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: chipBg,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ ...typography.caption1, color: chipText }}>
                  {d}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

function Avatar({
  size = 28,
  image,
  name,
}: {
  size?: number;
  image?: string;
  name?: string;
}) {
  const initials = (name || "?")
    .toString()
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: "#E5E5EA",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {image ? (
        <Image source={{ uri: image }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ ...typography.caption1, color: "#1C1C1E" }}>
          {initials}
        </Text>
      )}
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
            style={{
              backgroundColor: "#E5E5EA",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
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

function DateTimeBottomSheet({
  title,
  initialDate,
  onClose,
  onSelect,
  accentColor,
}: {
  title: string;
  initialDate: Date;
  onClose: () => void;
  onSelect: (d: Date) => void;
  accentColor: string;
}) {
  const [selected, setSelected] = useState<Date[]>([initialDate]);
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
          paddingBottom: 12,
          paddingTop: 8,
        }}
      >
        <View style={{ alignItems: "center", paddingVertical: 6 }}>
          <Text style={{ ...typography.subheadline, color: "#1C1C1E" }}>
            {title}
          </Text>
        </View>
        <View style={{ height: 420 }}>
          <SmartDateTimePicker
            selectedDates={selected}
            onDateSelect={(d) => {
              setSelected([d]);
              onSelect(d);
            }}
            onDateRemove={() => {}}
            accentColor={accentColor}
          />
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Pressable
            onPress={onClose}
            style={{
              backgroundColor: "#E5E5EA",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
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

function Locations({
  isOwner,
  id,
  accentColor,
}: {
  isOwner: boolean;
  id: string;
  accentColor: string;
}) {
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(locationQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [locationQuery]);

  const { data: locationSearch } = useQuery(
    orpc.location.search.queryOptions({
      input: {
        query: debouncedQuery || "",
        includePhotos: true,
        limit: 10,
      },
      enabled: showLocationSearch && debouncedQuery.length >= 2,
    })
  );
  const queryClient = useQueryClient();
  const { data: plan } = useSuspenseQuery(
    orpc.plan.get.queryOptions({ input: { id } })
  );
  const changePlan = useMutation(
    orpc.plan.change.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  if (!plan) return null;

  const chipBackground = tinycolor(accentColor).setAlpha(0.08).toRgbString();
  const chipBorder = tinycolor(accentColor).setAlpha(0.18).toRgbString();
  const primaryText = tinycolor(accentColor).darken(12).toHexString();
  const mutedText = tinycolor(accentColor)
    .darken(24)
    .setAlpha(0.75)
    .toRgbString();
  const actionText = accentColor;

  const normalizedLocations = Array.isArray(plan.locations)
    ? plan.locations.map((l) => ({
        title: l.title ?? "",
        address: l.address ?? undefined,
        latitude: l.latitude,
        longitude: l.longitude,
      }))
    : [];

  return (
    <View
      style={{
        gap: spacing.sm,
      }}
    >
      {isOwner && (
        <Pressable
          onPress={() =>
            setShowLocationSearch((previous) => !previous)
          }
          style={{
            alignSelf: "flex-start",
            backgroundColor: chipBackground,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: chipBorder,
            paddingHorizontal: 14,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconSymbol
            name={showLocationSearch ? "xmark" : "plus"}
            size={14}
            color={actionText}
          />
          <Text style={{ ...typography.subheadline, color: actionText }}>
            {showLocationSearch ? "Fertig" : "Ort hinzufügen"}
          </Text>
        </Pressable>
      )}

      {normalizedLocations.length === 0 ? (
        <Text style={{ ...typography.caption1, color: mutedText }}>
          Noch keine Orte geteilt
        </Text>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {normalizedLocations.map((location, index) => (
            <View
              key={`${location.title}-${index}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: chipBackground,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: chipBorder,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 2,
                gap: spacing.sm,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: tinycolor(accentColor)
                      .setAlpha(0.14)
                      .toRgbString(),
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconSymbol
                    name="mappin.and.ellipse"
                    size={16}
                    color={primaryText}
                  />
                </View>
                <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...typography.subheadline,
                    color: primaryText,
                    fontWeight: "600",
                  }}
                  numberOfLines={2}
                >
                  {location.title || location.address || "Ort"}
                </Text>
                {location.address &&
                  location.title &&
                  location.title !== location.address && (
                    <Text
                      style={{
                        ...typography.caption1,
                        color: mutedText,
                        marginTop: 2,
                      }}
                      numberOfLines={2}
                    >
                      {location.address}
                    </Text>
                  )}
                </View>
              </View>
              {isOwner && (
                <Pressable
                  onPress={() => {
                    const remaining = normalizedLocations.filter(
                      (_, i) => i !== index
                    );
                    changePlan.mutate({
                      id,
                      plan: { locations: remaining as any },
                    });
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                >
                  <Text style={{ ...typography.caption1, color: "#EF4444" }}>
                    Entfernen
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Search UI */}
      {isOwner && showLocationSearch && (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            placeholder="Ort suchen (mind. 2 Zeichen)"
            placeholderTextColor="#8E8E93"
            value={locationQuery}
            onChangeText={setLocationQuery}
            style={{
              backgroundColor: "#F5F7FB",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: chipBorder,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              color: primaryText,
            }}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {debouncedQuery.length >= 2 && (
            <View style={{ gap: spacing.sm }}>
              {(locationSearch?.locations ?? []).map((l) => (
                <Pressable
                  key={l.id}
                  onPress={() => {
                    const current = normalizedLocations;
                    changePlan.mutate({
                      id,
                      plan: {
                        locations: [
                          ...current,
                          {
                            title: l.name,
                            address: l.address ?? undefined,
                            latitude: l.latitude,
                            longitude: l.longitude,
                          },
                        ],
                      },
                    });
                    setLocationQuery("");
                    setDebouncedQuery("");
                    setShowLocationSearch(false);
                  }}
                  style={{
                    backgroundColor: chipBackground,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: chipBorder,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  }}
                >
                  <Text
                    style={{
                      ...typography.subheadline,
                      color: primaryText,
                      fontWeight: "600",
                    }}
                  >
                    {l.name}
                  </Text>
                  {l.address && (
                    <Text
                      style={{
                        ...typography.caption1,
                        color: mutedText,
                        marginTop: 2,
                      }}
                    >
                      {l.address}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
