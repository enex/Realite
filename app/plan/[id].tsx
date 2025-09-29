import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
import { formatLocalDateTime } from "@/shared/utils/datetime";
import { calculateDistance, isWithinRadius } from "@/shared/utils/distance";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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

const formatPlanDateLabel = (value: unknown): string =>
  formatLocalDateTime(value as Date | string | number | null | undefined, {
    dateOptions: {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
    timeOptions: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  });

export default function PlanDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id as string;

  const queryClient = useQueryClient();
  const { session } = useSession();
  const { data: plan } = useQuery(
    orpc.plan.get.queryOptions({ input: { id } })
  );
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
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
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

  return (
    <View style={{ flex: 1, backgroundColor: c1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <LinearGradient
            colors={[c1, c2, c3]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: 24,
              borderBottomRightRadius: 24,
              margin: 0,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: spacing.lg,
              position: "relative",
              overflow: "hidden",
              ...shadows.medium,
            }}
          >
            <View
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                opacity: 0.35,
              }}
            >
              <IconSymbol name={icon} size={120} color="#000000" />
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: spacing.md,
              }}
            >
              <Pressable
                onPress={() => router.back()}
                style={{ alignSelf: "flex-start" }}
              >
                <BlurView
                  intensity={80}
                  style={{
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    overflow: "hidden",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <IconSymbol name="chevron.left" size={14} color="#1C1C1E" />
                    <Text style={{ marginLeft: 4, color: "#1C1C1E" }}>
                      Zurück
                    </Text>
                  </View>
                </BlurView>
              </Pressable>

              {!isOwner && (
                <Pressable
                  onPress={() => participateInPlan.mutate({ id })}
                  disabled={participateInPlan.isPending}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.9)",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    ...shadows.small,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <IconSymbol
                      name={
                        participateInPlan.isPending
                          ? "clock"
                          : "person.badge.plus"
                      }
                      size={16}
                      color="#007AFF"
                    />
                    <Text
                      style={{
                        marginLeft: 6,
                        color: "#007AFF",
                        ...typography.subheadline,
                        fontWeight: "600",
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

            <Pressable onPress={handleEditTitle} disabled={!isOwner}>
              <Text style={{ ...typography.largeTitle, color: "#1C1C1E" }}>
                {plan.title}
              </Text>
            </Pressable>
            {plan.description !== undefined && (
              <Pressable onPress={handleEditDescription} disabled={!isOwner}>
                <Text
                  style={{
                    ...typography.subheadline,
                    color: "#3C3C43",
                    marginTop: spacing.sm,
                  }}
                >
                  {plan.description || "Beschreibung hinzufügen"}
                </Text>
              </Pressable>
            )}

            <View style={{ height: spacing.md }} />

            {/* Owner under header with spacing */}
            <View style={{ gap: 8 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Avatar
                  size={28}
                  image={ownerProfile?.image as any}
                  name={ownerProfile?.name as any}
                />
                <Text style={{ ...typography.subheadline, color: "#1C1C1E" }}>
                  {ownerProfile?.name || "Unbekannt"}
                </Text>
                <View
                  style={{
                    backgroundColor: "#00000011",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                    marginLeft: 6,
                  }}
                >
                  <Text style={{ ...typography.caption1, color: "#1C1C1E" }}>
                    Ersteller
                  </Text>
                </View>
              </View>
              <View style={{ height: spacing.md }} />
            </View>

            <View style={{ gap: spacing.sm }}>
              <InfoRow
                icon="calendar"
                label="Datum"
                value={formatPlanDateLabel(plan.startDate)}
                onPress={isOwner ? handleEditStart : undefined}
              />
              <InfoRow
                icon="clock"
                label="Endet"
                value={plan?.endDate ? formatPlanDateLabel(plan.endDate) : "—"}
                onPress={isOwner ? handleEditEnd : undefined}
              />
              <InfoRow
                icon="tag"
                label="Aktivität"
                value={getActivityLabel(plan?.activity as ActivityId)}
                onPress={isOwner ? handleEditActivity : undefined}
              />
              {/* Locations */}
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.85)",
                  borderRadius: 14,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  ...shadows.small,
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <IconSymbol name="location" size={16} color="#1C1C1E" />
                    <Text
                      style={{
                        marginLeft: 8,
                        ...typography.subheadline,
                        color: "#1C1C1E",
                      }}
                    >
                      Orte
                    </Text>
                  </View>
                  {isOwner && (
                    <Pressable onPress={() => setShowLocationSearch((v) => !v)}>
                      <Text
                        style={{ color: "#007AFF", ...typography.subheadline }}
                      >
                        {showLocationSearch ? "Fertig" : "Hinzufügen"}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Selected locations */}
                <View style={{ gap: 8 }}>
                  {safeLocations.length === 0 && (
                    <Text style={{ ...typography.caption1, color: "#3C3C43" }}>
                      Keine Orte hinzugefügt
                    </Text>
                  )}
                  {safeLocations.length > 0 &&
                    safeLocations.map((location, index) => (
                      <View
                        key={index}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            ...typography.subheadline,
                            color: "#1C1C1E",
                          }}
                        >
                          {location.title || location.address || "Ort"}
                        </Text>
                        {isOwner && (
                          <Pressable
                            onPress={() => {
                              changePlan.mutate({
                                id,
                                plan: { locations: [] as any },
                              });
                            }}
                          >
                            <Text style={{ color: "#FF3B30" }}>Entfernen</Text>
                          </Pressable>
                        )}
                      </View>
                    ))}
                </View>

                {/* Search UI */}
                {isOwner && showLocationSearch && (
                  <View style={{ gap: 8 }}>
                    <TextInput
                      placeholder="Ort suchen (mind. 2 Zeichen)"
                      placeholderTextColor="#8E8E93"
                      value={locationQuery}
                      onChangeText={setLocationQuery}
                      style={{
                        backgroundColor: "rgba(0,0,0,0.05)",
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        color: "#1C1C1E",
                      }}
                    />
                    {debouncedQuery.length >= 2 && (
                      <View style={{ gap: 8 }}>
                        {(locationSearch?.locations ?? []).map((l) => (
                          <Pressable
                            key={l.id}
                            onPress={() => {
                              changePlan.mutate({
                                id,
                                plan: {
                                  locations: [
                                    ...(plan?.locations.map((l) => ({
                                      title: l.title ?? "",
                                      address: l.address ?? undefined,
                                      latitude: l.latitude,
                                      longitude: l.longitude,
                                    })) ?? []),
                                    {
                                      title: l.name,
                                      address: l.address ?? undefined,
                                      latitude: l.latitude,
                                      longitude: l.longitude,
                                    },
                                  ],
                                },
                              });
                            }}
                            style={{
                              backgroundColor: "rgba(0,0,0,0.04)",
                              borderRadius: 10,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                            }}
                          >
                            <Text
                              style={{
                                ...typography.subheadline,
                                color: "#1C1C1E",
                              }}
                            >
                              {l.name}
                            </Text>
                            {l.address && (
                              <Text
                                style={{
                                  ...typography.caption1,
                                  color: "#3C3C43",
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
              {plan.url && (
                <InfoRow icon="link" label="Verknüpfung" value={plan.url} />
              )}
              {plan.maybe !== undefined && (
                <InfoRow
                  icon="questionmark.circle"
                  label="Vielleicht"
                  value={plan.maybe ? "Ja" : "Nein"}
                />
              )}
            </View>
            {/* Overlapping Plans (header + rows, no container card) */}
            {(exactMatches.length > 0 || similarMatches.length > 0) && (
              <View style={{ marginTop: spacing.lg }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: spacing.sm,
                  }}
                >
                  <IconSymbol name="person.2" size={16} color="#1C1C1E" />
                  <Text
                    style={{
                      marginLeft: 8,
                      ...typography.subheadline,
                      color: "#1C1C1E",
                    }}
                  >
                    Überlappende Pläne
                  </Text>
                </View>

                {exactMatches.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text style={{ ...typography.caption1, color: "#8E8E93" }}>
                      Gleich
                    </Text>
                    {exactMatches.map((e) => (
                      <OverlapRow key={e.id} item={e} accent={c3} />
                    ))}
                  </View>
                )}

                {similarMatches.length > 0 && (
                  <View
                    style={{
                      gap: 8,
                      marginTop: exactMatches.length > 0 ? 6 : 0,
                    }}
                  >
                    <Text style={{ ...typography.caption1, color: "#8E8E93" }}>
                      Ähnlich
                    </Text>
                    {similarMatches.map((e) => (
                      <OverlapRow key={e.id} item={e} accent={c3} />
                    ))}
                  </View>
                )}
              </View>
            )}
          </LinearGradient>
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
}: {
  icon: Parameters<typeof IconSymbol>[0]["name"];
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255,255,255,0.85)",
        borderRadius: 14,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        ...shadows.small,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <IconSymbol name={icon} size={16} color="#1C1C1E" />
        <Text
          style={{ marginLeft: 8, ...typography.subheadline, color: "#1C1C1E" }}
        >
          {label}
        </Text>
      </View>
      <Text style={{ ...typography.subheadline, color: "#3C3C43" }}>
        {value}
      </Text>
    </Pressable>
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
    isFinite(item.diff.distanceMeters)
  )
    diffs.push(`${Math.round(item.diff.distanceMeters)} m entfernt`);
  if (item.diff.differentTitle) diffs.push("anderer Titel");
  return (
    <Pressable
      onPress={() => router.push(`/plan/${item.id}` as any)}
      style={{
        backgroundColor: "rgba(255,255,255,0.85)",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        ...shadows.small,
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
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.subheadline, color: "#1C1C1E" }}>
              {item.title || "Plan"}
            </Text>
            <Text style={{ ...typography.caption1, color: "#3C3C43" }}>
              {timeStr}
              {item.creator?.name ? ` · ${item.creator.name}` : ""}
            </Text>
          </View>
        </View>
        {diffs.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              maxWidth: 180,
              justifyContent: "flex-end",
            }}
          >
            {diffs.map((d, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: accent + "22",
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ ...typography.caption1, color: "#1C1C1E" }}>
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
