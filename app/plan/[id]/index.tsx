import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
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
import { Avatar } from "@/components/Avatar";
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

  // Get primary location for participant queries
  const planPrimaryLocationForQuery = useMemo(() => {
    const safeLocations = Array.isArray(plan?.locations) ? plan.locations : [];
    return safeLocations[0];
  }, [plan?.locations]);

  // Find similar/overlapping plans to get participants
  const { data: similarPlans } = useQuery({
    ...orpc.plan.find.queryOptions({
      input: {
        startDate: plan?.startDate
          ? new Date(plan.startDate as unknown as string)
          : new Date(),
        endDate: plan?.endDate
          ? new Date(plan.endDate as unknown as string)
          : new Date(Date.now() + 24 * 60 * 60 * 1000),
        activity: plan?.activity as ActivityId | undefined,
        location:
          planPrimaryLocationForQuery &&
          planPrimaryLocationForQuery.latitude &&
          planPrimaryLocationForQuery.longitude
            ? {
                latitude: planPrimaryLocationForQuery.latitude,
                longitude: planPrimaryLocationForQuery.longitude,
                radius: 50, // 50 meters
              }
            : undefined,
      },
    }),
    enabled:
      Boolean(plan?.startDate) &&
      Boolean(planPrimaryLocationForQuery?.latitude) &&
      Boolean(planPrimaryLocationForQuery?.longitude),
  });

  // Check if current user already participates (has a similar plan)
  const alreadyParticipates = useMemo(() => {
    if (!similarPlans || !plan || !session?.id) return false;
    return (similarPlans as any[]).some(
      (similarPlan: any) =>
        (similarPlan?.creatorId || similarPlan?.creator_id) === session.id &&
        similarPlan.id !== plan.id
    );
  }, [similarPlans, plan, session?.id]);

  // Extract participant IDs (creators of similar plans, excluding the current plan owner)
  const participantIds = useMemo(() => {
    if (!similarPlans || !plan) return [];
    const ids = new Set<string>();
    (similarPlans as any[]).forEach((similarPlan: any) => {
      const creatorId = similarPlan?.creatorId || similarPlan?.creator_id;
      if (
        creatorId &&
        creatorId !== plan.creatorId &&
        similarPlan.id !== plan.id
      ) {
        ids.add(creatorId);
      }
    });
    return Array.from(ids);
  }, [similarPlans, plan]);

  // Fetch participant profiles
  const { data: participantProfiles } = useQuery({
    ...orpc.user.getMany.queryOptions({
      input: { ids: participantIds },
    }),
    enabled: participantIds.length > 0,
  });

  // Map participant IDs to names and images
  const participants = useMemo(() => {
    if (!participantProfiles || !Array.isArray(participantProfiles)) return [];
    return (participantProfiles as any[])
      .map((profile: any) => ({
        id: profile.id,
        name: profile.name || "",
        image: profile.image || null,
      }))
      .filter((p) => p.name);
  }, [participantProfiles]);

  const changePlan = useMutation(
    orpc.plan.change.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );
  const participateInPlan = useMutation(
    orpc.plan.participate.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries();
        // Navigate to the duplicated plan
        if (result?.id) {
          router.replace(`/plan/${result.id}` as any);
        } else {
          Alert.alert(
            "Erfolgreich!",
            "Der Plan wurde zu deinen Plänen hinzugefügt."
          );
        }
      },
      onError: (error: any) => {
        if (error?.code === "ALREADY_OWNER") {
          Alert.alert("Du besitzt diesen Plan bereits");
        } else {
          Alert.alert(
            "Fehler",
            "Konnte den Plan nicht kopieren. Bitte versuche es erneut."
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
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);

  const cancelPlan = useMutation(
    orpc.plan.cancel.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        router.back();
      },
      onError: (error: any) => {
        Alert.alert(
          "Fehler",
          "Konnte Plan nicht löschen. Bitte versuche es erneut."
        );
      },
    })
  );

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
      <SafeAreaView className="flex-1 bg-black dark:bg-black">
        <View className="p-6">
          <Text className="text-[15px] leading-5 text-gray-500 dark:text-gray-400">
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

  // Function to open location in Maps
  const openLocationInMaps = () => {
    if (!primaryLocation) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const lat = primaryLocation.latitude;
    const lng = primaryLocation.longitude;
    const address = primaryLocation.address || primaryLocation.title;

    let url: string;

    if (lat && lng) {
      // Use coordinates if available
      if (Platform.OS === "ios") {
        url = `maps://maps.apple.com/?q=${lat},${lng}`;
      } else {
        url = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(
          address || ""
        )})`;
      }
    } else if (address) {
      // Fallback to address search
      if (Platform.OS === "ios") {
        url = `maps://maps.apple.com/?q=${encodeURIComponent(address)}`;
      } else {
        url = `geo:0,0?q=${encodeURIComponent(address)}`;
      }
    } else {
      return;
    }

    // Try to open native maps, fallback to Google Maps web
    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web
      const googleMapsUrl =
        lat && lng
          ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              address || ""
            )}`;
      Linking.openURL(googleMapsUrl);
    });
  };

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
    <View className="flex-1 bg-gray-100 dark:bg-black">
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <SafeAreaView className="flex-1" edges={["bottom", "left", "right"]}>
        {/* Fixed Header (always visible, over image) */}
        <View
          className="absolute top-0 left-0 right-0 z-[1000] bg-transparent"
          style={{
            paddingTop: insets.top,
            paddingHorizontal: 16,
            paddingBottom: 8,
          }}
          pointerEvents="box-none"
        >
          <View className="flex-row items-center justify-between pt-2">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-black/30 items-center justify-center"
            >
              <Icon name="xmark" size={18} color="#FFFFFF" />
            </Pressable>
            <View className="flex-row gap-2">
              {isOwner && (
                <Pressable
                  onPress={() => router.push(`/plan/${id}/edit` as any)}
                  className="w-10 h-10 rounded-full bg-black/30 items-center justify-center"
                >
                  <Icon name="pencil" size={18} color="#FFFFFF" />
                </Pressable>
              )}
              <Pressable
                className="w-10 h-10 rounded-full bg-black/30 items-center justify-center"
                onPress={() => setShowDeleteSheet(true)}
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
          contentInsetAdjustmentBehavior="never"
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
            className="overflow-hidden"
            style={[
              {
                height: HEADER_HEIGHT + insets.top,
                marginTop: 0,
                paddingTop: 0,
              },
              headerImageStyle,
            ]}
          >
            {locationImageUrl ? (
              <Image
                source={{ uri: locationImageUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={placeholderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="w-full h-full items-center justify-center pt-safe"
              >
                <Icon name={icon} size={120} color="rgba(255,255,255,0.3)" />
              </LinearGradient>
            )}
            {/* Dark overlay */}
            <Animated.View
              className="absolute inset-0 bg-black/30"
              style={headerOverlayStyle}
            />
          </Animated.View>

          {/* Content Card */}
          <View className="bg-white dark:bg-zinc-900 rounded-t-[20px] -mt-5 pt-6 px-6 pb-8 min-h-[600px]">
            {/* Title Section */}
            <View className="mb-6">
              {/* Activity indicator */}
              {activityLabel && (
                <View className="flex-row items-center mb-2">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: c3 }}
                  />
                  <Text className="text-[12px] leading-4 text-gray-600 dark:text-white/70 uppercase tracking-wide">
                    {activityLabel}
                  </Text>
                </View>
              )}

              {/* Title */}
              <Text className="text-[34px] leading-[41px] font-bold text-black dark:text-white mb-1">
                {plan.title}
              </Text>

              {/* Date/Time */}
              {dateTimeLabel && (
                <Text className="text-[15px] leading-5 text-gray-600 dark:text-white/70 mb-1">
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
                onPress={openLocationInMaps}
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
              label="Ersteller"
              value={hostName}
              onPress={() => {
                if (plan?.creatorId) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/user/${plan.creatorId}` as any);
                }
              }}
              accentColor={c3}
            />

            {/* Participants Section */}
            {participants.length > 0 && (
              <View className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                <View className="flex-row items-center mb-3">
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center mr-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : tinycolor(c3).setAlpha(0.1).toRgbString(),
                    }}
                  >
                    <Icon name="person.2" size={18} color={c3} />
                  </View>
                  <Text className="text-[17px] font-semibold text-black dark:text-white">
                    Teilnehmer ({participants.length})
                  </Text>
                </View>
                <View className="gap-2">
                  {participants.map((participant) => (
                    <Pressable
                      key={participant.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/user/${participant.id}` as any);
                      }}
                      className="flex-row items-center py-2"
                    >
                      <Avatar
                        name={participant.name}
                        image={participant.image}
                        size={40}
                        className="mr-3"
                      />
                      <Text className="text-[15px] text-black dark:text-white flex-1">
                        {participant.name}
                      </Text>
                      <Icon
                        name="chevron.right"
                        size={16}
                        color={isDark ? "#9CA3AF" : "#6B7280"}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Description if available */}
            {plan.description && (
              <View className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                <Text className="text-[17px] leading-6 text-black dark:text-white">
                  {plan.description}
                </Text>
              </View>
            )}
          </View>
        </Animated.ScrollView>

        {/* Fixed Action Buttons */}
        {!isOwner && !alreadyParticipates && (
          <View
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-white/10 px-4 pt-2"
            style={{
              paddingBottom: insets.bottom + 8,
            }}
          >
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                participateInPlan.mutate({ id });
              }}
              disabled={participateInPlan.isPending}
              className="w-full rounded-xl py-4 items-center justify-center flex-row gap-2"
              style={{ backgroundColor: c3 }}
            >
              <Icon name="plus.circle.fill" size={20} color="#FFFFFF" />
              <Text className="text-[17px] leading-5 text-white font-semibold">
                {participateInPlan.isPending
                  ? "Wird hinzugefügt..."
                  : "Ich auch"}
              </Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      {/* Plan Action Sheet */}
      {showDeleteSheet && isOwner && plan && (
        <PlanActionSheet
          onClose={() => setShowDeleteSheet(false)}
          onDelete={() => {
            setShowDeleteSheet(false);
            Alert.alert(
              "Plan löschen",
              "Möchtest du diesen Plan wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
              [
                {
                  text: "Abbrechen",
                  style: "cancel",
                },
                {
                  text: "Löschen",
                  style: "destructive",
                  onPress: () => {
                    cancelPlan.mutate({ id });
                  },
                },
              ]
            );
          }}
          onDuplicate={() => {
            setShowDeleteSheet(false);
            // Prepare plan data for duplication
            const planData = {
              title: plan.title,
              description: plan.description || undefined,
              activity: plan.activity,
              startDate: plan.startDate
                ? new Date(plan.startDate as unknown as string).toISOString()
                : new Date().toISOString(),
              endDate: plan.endDate
                ? new Date(plan.endDate as unknown as string).toISOString()
                : undefined,
              locations: plan.locations?.map((loc: any) => ({
                title: loc.title || "",
                address: loc.address || undefined,
                latitude: loc.latitude,
                longitude: loc.longitude,
                url: loc.url || undefined,
                description: loc.description || undefined,
                category: loc.category || undefined,
              })),
              url: plan.url || undefined,
              repetition: plan.repetition || undefined,
              maybe: plan.maybe || undefined,
            };
            router.push({
              pathname: "/plan/new/edit",
              params: {
                planData: JSON.stringify(planData),
              },
            } as any);
          }}
        />
      )}

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
      className="flex-row items-start py-4"
      style={{ opacity: interactive ? 1 : 0.9 }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-4 bg-white/10 dark:bg-white/10"
        style={{
          backgroundColor: isDark
            ? "rgba(255,255,255,0.1)"
            : tinycolor(effectiveAccent).setAlpha(0.1).toRgbString(),
        }}
      >
        <Icon name={icon} size={20} color={effectiveAccent} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] leading-5 text-black dark:text-white font-medium mb-1">
          {label}
        </Text>
        {value && (
          <Text className="text-[17px] leading-[22px] text-gray-600 dark:text-white/70">
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
    <View className="absolute inset-0 bg-black/20 justify-end">
      <Pressable className="flex-1" onPress={onClose} />
      <View className="bg-white dark:bg-zinc-900 rounded-t-[20px] pb-6 pt-2 max-h-[80%]">
        <View className="h-1 w-11 bg-gray-300 dark:bg-zinc-700 rounded-sm self-center mb-2" />
        <ScrollView className="max-h-[500px]">
          {Object.entries(activities).map(([groupId, group]) => (
            <View key={groupId} className="px-4 pt-3">
              <Text className="text-[12px] leading-4 text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                {group.nameDe || group.name}
              </Text>
              <View className="gap-2">
                <Pressable
                  onPress={() => onSelect(groupId as ActivityId)}
                  className={`px-3 py-3 rounded-xl ${
                    (selected as string) === groupId
                      ? isDark
                        ? "bg-blue-500/30"
                        : "bg-blue-50"
                      : isDark
                        ? "bg-zinc-800"
                        : "bg-gray-100"
                  }`}
                >
                  <Text className="text-white dark:text-zinc-50">
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
                      className={`px-3 py-3 rounded-xl ${
                        isSelected
                          ? isDark
                            ? "bg-blue-500/30"
                            : "bg-blue-50"
                          : isDark
                            ? "bg-zinc-800"
                            : "bg-gray-100"
                      }`}
                    >
                      <Text className="text-white dark:text-zinc-50">
                        {(sub as any).nameDe || (sub as any).name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <View className="h-4" />
        </ScrollView>
        <View className="px-4 pt-2">
          <Pressable
            onPress={onClose}
            className="bg-gray-200 dark:bg-zinc-800 rounded-xl py-3 items-center"
          >
            <Text className="text-[15px] leading-5 text-black dark:text-zinc-50">
              Abbrechen
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function PlanActionSheet({
  onClose,
  onDelete,
  onDuplicate,
}: {
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <View className="absolute inset-0 bg-black/20 justify-end">
      <Pressable className="flex-1" onPress={onClose} />
      <View className="bg-white dark:bg-zinc-900 rounded-t-[20px] pb-6 pt-2">
        <View className="h-1 w-11 bg-gray-300 dark:bg-zinc-700 rounded-sm self-center mb-4" />
        <Pressable
          onPress={onDuplicate}
          className="px-4 py-4 items-center border-b border-gray-200 dark:border-white/10"
        >
          <View className="flex-row items-center gap-3">
            <Icon name="doc.on.doc" size={20} color="#007AFF" />
            <Text className="text-[17px] leading-[22px] text-black dark:text-white font-medium">
              Plan duplizieren
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={onDelete}
          className="px-4 py-4 items-center border-b border-gray-200 dark:border-white/10"
        >
          <View className="flex-row items-center gap-3">
            <Icon name="trash" size={20} color="#FF3B30" />
            <Text className="text-[17px] leading-[22px] text-red-500 font-medium">
              Plan löschen
            </Text>
          </View>
        </Pressable>
        <View className="px-4 pt-2">
          <Pressable
            onPress={onClose}
            className="bg-gray-200 dark:bg-zinc-800 rounded-xl py-3 items-center"
          >
            <Text className="text-[15px] leading-5 text-black dark:text-zinc-50">
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
    <View className="absolute inset-0 bg-black/20 justify-end">
      <Pressable className="flex-1" onPress={onClose} />
      <View className="bg-white dark:bg-zinc-900 rounded-t-[20px] pb-3 pt-2">
        <View className="items-center py-1.5">
          <Text className="text-[15px] leading-5 text-black dark:text-zinc-50">
            {title}
          </Text>
        </View>
        <View className="h-[420px]">
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
        <View className="px-4 pt-2">
          <Pressable
            onPress={onClose}
            className="bg-gray-200 dark:bg-zinc-800 rounded-xl py-3 items-center"
          >
            <Text className="text-[15px] leading-5 text-black dark:text-zinc-50">
              Abbrechen
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
