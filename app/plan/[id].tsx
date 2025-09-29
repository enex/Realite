import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/client/auth";
import orpc from "@/client/orpc";
import { shadows } from "@/components/PlanCard";
import SmartDateTimePicker from "@/components/SmartDateTimePicker";
import { IconSymbol } from "@/components/ui/IconSymbol";
import {
  activities,
  type ActivityGroupId,
  type ActivityId,
} from "@/shared/activities";
import { formatLocalDateTime } from "@/shared/utils/datetime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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

  // Ensure locations is always an array to prevent runtime errors
  const safeLocations = Array.isArray(plan?.locations) ? plan.locations : [];

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

            <View style={{ height: spacing.lg }} />

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
                value={
                  plan?.endDate
                    ? formatPlanDateLabel(plan.endDate)
                    : "—"
                }
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
