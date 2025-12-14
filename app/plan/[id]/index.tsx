import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useSession } from "@/client/auth";
import { orpc } from "@/client/orpc";
import SmartDateTimePicker from "@/components/SmartDateTimePicker";
import { Icon } from "@/components/ui/Icon";
import {
  activities,
  type ActivityGroupId,
  type ActivityId,
} from "@/shared/activities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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

const HEADER_HEIGHT = 280;

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

const getActivityLabel = (id?: ActivityId) => {
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
};

export default function PlanDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id as string;
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const scrollY = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const queryClient = useQueryClient();
  const { session } = useSession();
  const {
    data: plan,
    refetch,
    isFetching,
    isRefetching,
  } = useQuery(orpc.plan.get.queryOptions({ input: { id } }));

  // Current plan owner profile - must be called before early return
  const { data: ownerProfile } = useQuery(
    orpc.user.get.queryOptions({
      input: { id: (plan?.creatorId as any) || "" },
      enabled: Boolean(plan?.creatorId),
    })
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
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);

  const safeLocations = useMemo(
    () => (Array.isArray(plan?.locations) ? plan.locations : []),
    [plan?.locations]
  );

  const primaryLocation = safeLocations[0];
  const locationImageUrl = (primaryLocation as any)?.imageUrl;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Header animation styles
  const headerImageStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
      [1.2, 1, 0.8],
      "clamp"
    );
    const translateY = interpolate(
      scrollY.value,
      [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
      [0, 0, -HEADER_HEIGHT * 0.3],
      "clamp"
    );
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  const headerOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT * 0.5, HEADER_HEIGHT],
      [0, 0.3, 0.7],
      "clamp"
    );
    return { opacity };
  });

  if (!plan) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: isDark ? "#000000" : "#F2F2F7",
        }}
      >
        <View style={{ padding: spacing.lg }}>
          <Text
            style={{
              ...typography.subheadline,
              color: isDark ? "#9CA3AF" : "#8E8E93",
            }}
          >
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
  const locationLabel = primaryLocation
    ? primaryLocation.title || primaryLocation.address || undefined
    : undefined;
  const locationAddress =
    primaryLocation?.title &&
    primaryLocation?.address &&
    primaryLocation.title !== primaryLocation.address
      ? (primaryLocation.address as string)
      : undefined;

  // Create placeholder gradient if no image
  const placeholderGradient = [
    tinycolor(c1)
      .darken(isDark ? 35 : 10)
      .desaturate(8)
      .toHexString(),
    tinycolor
      .mix(c1, c2, 40)
      .darken(isDark ? 35 : 10)
      .desaturate(6)
      .toHexString(),
    tinycolor(c3)
      .darken(isDark ? 30 : 6)
      .desaturate(4)
      .toHexString(),
  ] as const;

  const hostName = ownerProfile?.name || "Unbekannt";
  const activityLabel = getActivityLabel(plan?.activity as ActivityId);

  // Format date/time for display
  const dateTimeLabel =
    dayLabel && dateLabel
      ? `${dayLabel} • ${dateLabel}${timeRangeLabel ? ` • ${timeRangeLabel}` : ""}`
      : timeRangeLabel || "";

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#000000" : "#F2F2F7" }}>
      <SafeAreaView style={{ flex: 1 }} edges={[]}>
        {/* Fixed Header (always visible, over image) */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            paddingTop: insets.top,
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.sm,
            backgroundColor: "transparent",
          }}
          pointerEvents="box-none"
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.3)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="xmark" size={18} color="#FFFFFF" />
            </Pressable>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {isOwner && (
                <Pressable
                  onPress={() => router.push(`/plan/${id}/edit` as any)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(0,0,0,0.3)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="pencil" size={18} color="#FFFFFF" />
                </Pressable>
              )}
              <Pressable
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(0,0,0,0.3)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="ellipsis" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>

        <Animated.ScrollView
          ref={scrollRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
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
            paddingBottom: 120, // Space for fixed buttons
          }}
        >
          {/* Header Image */}
          <Animated.View
            style={[
              {
                height: HEADER_HEIGHT + insets.top,
                overflow: "hidden",
                marginTop: -insets.top,
              },
              headerImageStyle,
            ]}
          >
            {locationImageUrl ? (
              <Image
                source={{ uri: locationImageUrl }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={placeholderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: "100%",
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={icon} size={120} color="rgba(255,255,255,0.3)" />
              </LinearGradient>
            )}
            {/* Dark overlay */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.3)",
                },
                headerOverlayStyle,
              ]}
            />
          </Animated.View>

          {/* Content Card */}
          <View
            style={{
              backgroundColor: isDark ? "#1F1F1F" : "#FFFFFF",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              marginTop: -20,
              paddingTop: spacing.lg,
              paddingHorizontal: spacing.md,
              paddingBottom: spacing.xl,
              minHeight: 600,
            }}
          >
            {/* Title Section */}
            <View style={{ marginBottom: spacing.lg }}>
              {/* Activity indicator */}
              {activityLabel && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: spacing.sm,
                  }}
                >
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: c3,
                      marginRight: spacing.sm,
                    }}
                  />
                  <Text
                    style={{
                      ...typography.caption1,
                      color: isDark
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.6)",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {activityLabel}
                  </Text>
                </View>
              )}

              {/* Title */}
              <Text
                style={{
                  ...typography.largeTitle,
                  color: isDark ? "#FFFFFF" : "#000000",
                  fontWeight: "700",
                  marginBottom: spacing.xs,
                }}
              >
                {plan.title}
              </Text>

              {/* Date/Time */}
              {dateTimeLabel && (
                <Text
                  style={{
                    ...typography.subheadline,
                    color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                    marginBottom: spacing.xs,
                  }}
                >
                  {dateTimeLabel}
                </Text>
              )}
            </View>

            {/* Location Info Row */}
            {locationLabel && (
              <InfoRow
                icon="mappin.and.ellipse"
                label={locationLabel}
                value={locationAddress || undefined}
                onPress={isOwner ? () => {} : undefined}
                accentColor={c3}
              />
            )}

            {/* Time Info Row */}
            {timeRangeLabel && (
              <InfoRow
                icon="clock"
                label="Zeit"
                value={timeRangeLabel}
                onPress={isOwner ? () => setShowStartPicker(true) : undefined}
                accentColor={c3}
              />
            )}

            {/* Host Info Row */}
            <InfoRow
              icon="person.circle"
              label="Veranstalter"
              value={hostName}
              accentColor={c3}
            />

            {/* Description if available */}
            {plan.description && (
              <View
                style={{
                  marginTop: spacing.md,
                  paddingTop: spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                }}
              >
                <Text
                  style={{
                    ...typography.body,
                    color: isDark ? "#FFFFFF" : "#000000",
                    lineHeight: 24,
                  }}
                >
                  {plan.description}
                </Text>
              </View>
            )}
          </View>
        </Animated.ScrollView>

        {/* Fixed Action Buttons */}
        {!isOwner && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingBottom: insets.bottom + spacing.sm,
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm,
              backgroundColor: isDark ? "#1F1F1F" : "#FFFFFF",
              borderTopWidth: 1,
              borderTopColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",
              flexDirection: "row",
              gap: spacing.sm,
            }}
          >
            <Pressable
              onPress={() => participateInPlan.mutate({ id })}
              disabled={participateInPlan.isPending}
              style={{
                flex: 1,
                backgroundColor: c3,
                borderRadius: 12,
                paddingVertical: spacing.md,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: spacing.xs,
              }}
            >
              <Icon name="checkmark" size={18} color="#FFFFFF" />
              <Text
                style={{
                  ...typography.subheadline,
                  color: "#FFFFFF",
                  fontWeight: "600",
                }}
              >
                Ja
              </Text>
            </Pressable>
            <Pressable
              style={{
                flex: 1,
                backgroundColor: isDark ? "#2F2F2F" : "#F2F2F7",
                borderRadius: 12,
                paddingVertical: spacing.md,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  ...typography.subheadline,
                  color: isDark ? "#FFFFFF" : "#000000",
                  fontWeight: "600",
                }}
              >
                Nein
              </Text>
            </Pressable>
            <Pressable
              style={{
                flex: 1,
                backgroundColor: isDark ? "#2F2F2F" : "#F2F2F7",
                borderRadius: 12,
                paddingVertical: spacing.md,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  ...typography.subheadline,
                  color: isDark ? "#FFFFFF" : "#000000",
                  fontWeight: "600",
                }}
              >
                Vielleicht
              </Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      {/* Bottom Sheets */}
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
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  value?: string;
  onPress?: () => void;
  accentColor?: string;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const defaultAccent = isDark ? "#F9FAFB" : "#0F172A";
  const effectiveAccent = accentColor || defaultAccent;
  const interactive = typeof onPress === "function";

  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: spacing.md,
        opacity: interactive ? 1 : 0.9,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.1)"
            : tinycolor(effectiveAccent).setAlpha(0.1).toRgbString(),
          alignItems: "center",
          justifyContent: "center",
          marginRight: spacing.md,
        }}
      >
        <Icon name={icon} size={20} color={effectiveAccent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...typography.subheadline,
            color: isDark ? "#FFFFFF" : "#000000",
            fontWeight: "500",
            marginBottom: spacing.xs,
          }}
        >
          {label}
        </Text>
        {value && (
          <Text
            style={{
              ...typography.body,
              color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
            }}
          >
            {value}
          </Text>
        )}
      </View>
      {interactive && (
        <Icon
          name="chevron.right"
          size={16}
          color={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
        />
      )}
    </Pressable>
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
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
          backgroundColor: isDark ? "#1F1F1F" : "#fff",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: 24,
          paddingTop: 8,
          maxHeight: "80%",
        }}
      >
        <View
          style={{
            height: 4,
            width: 44,
            backgroundColor: isDark ? "#3F3F3F" : "#D1D1D6",
            borderRadius: 2,
            alignSelf: "center",
            marginBottom: 8,
          }}
        />
        <ScrollView style={{ maxHeight: 500 }}>
          {Object.entries(activities).map(([groupId, group]) => (
            <View
              key={groupId}
              style={{ paddingHorizontal: 16, paddingTop: 12 }}
            >
              <Text
                style={{
                  ...typography.caption1,
                  color: isDark ? "#9CA3AF" : "#8E8E93",
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
                      (selected as string) === groupId
                        ? isDark
                          ? "rgba(59,130,246,0.3)"
                          : "#E5F2FF"
                        : isDark
                          ? "#2F2F2F"
                          : "#F2F2F7",
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      color: isDark ? "#F9FAFB" : "#1C1C1E",
                    }}
                  >
                    {group.nameDe || group.name}
                  </Text>
                </Pressable>
                {Object.entries(group.subActivities).map(([subId, sub]) => {
                  const value = `${groupId}/${subId}` as ActivityId;
                  const isSelected = (selected as string) === (value as string);
                  return (
                    <Pressable
                      key={value}
                      onPress={() => onSelect(value)}
                      style={{
                        backgroundColor: isSelected
                          ? isDark
                            ? "rgba(59,130,246,0.3)"
                            : "#E5F2FF"
                          : isDark
                            ? "#2F2F2F"
                            : "#F2F2F7",
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: isDark ? "#F9FAFB" : "#1C1C1E",
                        }}
                      >
                        {(sub as any).nameDe || (sub as any).name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={{ height: 16 }} />
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Pressable
            onPress={onClose}
            style={{
              backgroundColor: isDark ? "#2F2F2F" : "#E5E5EA",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: isDark ? "#F9FAFB" : "#1C1C1E",
                ...typography.subheadline,
              }}
            >
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
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
          backgroundColor: isDark ? "#1F1F1F" : "#fff",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: 12,
          paddingTop: 8,
        }}
      >
        <View style={{ alignItems: "center", paddingVertical: 6 }}>
          <Text
            style={{
              ...typography.subheadline,
              color: isDark ? "#F9FAFB" : "#1C1C1E",
            }}
          >
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
              backgroundColor: isDark ? "#2F2F2F" : "#E5E5EA",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: isDark ? "#F9FAFB" : "#1C1C1E",
                ...typography.subheadline,
              }}
            >
              Abbrechen
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
