import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/client/auth";
import orpc from "@/client/orpc";
import { shadows } from "@/components/PlanCard";
import { IconSymbol } from "@/components/ui/IconSymbol";
import {
  activities,
  activityIds,
  type ActivityGroupId,
  type ActivityId,
} from "@/shared/activities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const getGroupIdFromActivity = (activityId: ActivityId): ActivityGroupId => {
  const [groupId] = (activityId as string).split("/");
  return (groupId as ActivityGroupId) ?? (activityId as ActivityGroupId);
};

const getActivityGradient = (activityId: ActivityId) => {
  const groupId = getGroupIdFromActivity(activityId);
  const base = activities[groupId]?.color ?? "#94a3b8";
  const c1 = tinycolor(base).lighten(35).toHexString();
  const c2 = tinycolor(base).lighten(15).toHexString();
  const c3 = tinycolor(base).toHexString();
  return [c1, c2, c3] as const;
};

const getActivityIcon = (activityId: ActivityId) => {
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

  if (!plan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
        <View style={{ padding: spacing.lg }}>
          <Text style={{ ...typography.subheadline, color: "#8E8E93" }}>
            Plan not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const activity = plan.activity as ActivityId;
  const [c1, c2, c3] = getActivityGradient(activity);
  const icon = getActivityIcon(activity);
  const isOwner = plan.creatorId === session?.id;

  const promptEdit = (
    title: string,
    current: string,
    onSubmit: (value: string) => void
  ) => {
    Alert.prompt(
      title,
      undefined,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: (value) => {
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
    promptEdit("Titel bearbeiten", plan.title ?? "", (value) => {
      changePlan.mutate({ id, plan: { title: value } });
    });
  };

  const handleEditDescription = () => {
    if (!isOwner) return;
    promptEdit("Beschreibung bearbeiten", plan.description ?? "", (value) => {
      changePlan.mutate({ id, plan: { description: value } });
    });
  };

  const handleEditStart = () => {
    if (!isOwner) return;
    promptEdit(
      "Startzeit bearbeiten",
      new Date(plan.startDate as unknown as string).toISOString(),
      (value) => {
        const d = new Date(value);
        if (isNaN(d.getTime())) return;
        changePlan.mutate({ id, plan: { startDate: d.toISOString() } });
      }
    );
  };

  const handleEditEnd = () => {
    if (!isOwner) return;
    promptEdit(
      "Endzeit bearbeiten",
      plan.endDate
        ? new Date(plan.endDate as unknown as string).toISOString()
        : "",
      (value) => {
        if (!value) {
          changePlan.mutate({ id, plan: { endDate: undefined } });
          return;
        }
        const d = new Date(value);
        if (isNaN(d.getTime())) return;
        changePlan.mutate({ id, plan: { endDate: d.toISOString() } });
      }
    );
  };

  const handleEditActivity = () => {
    if (!isOwner) return;
    promptEdit("Aktivität bearbeiten", String(plan.activity), (value) => {
      if ((activityIds as readonly string[]).includes(value)) {
        changePlan.mutate({ id, plan: { activity: value as ActivityId } });
      }
    });
  };

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

            <Pressable
              onPress={() => router.back()}
              style={{ marginBottom: spacing.md, alignSelf: "flex-start" }}
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
                  <Text style={{ marginLeft: 4, color: "#1C1C1E" }}>Back</Text>
                </View>
              </BlurView>
            </Pressable>

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
                label="Date"
                value={new Date(
                  plan.startDate as unknown as string
                ).toLocaleString()}
                onPress={isOwner ? handleEditStart : undefined}
              />
              {plan.endDate && (
                <InfoRow
                  icon="clock"
                  label="Ends"
                  value={new Date(
                    plan.endDate as unknown as string
                  ).toLocaleString()}
                  onPress={isOwner ? handleEditEnd : undefined}
                />
              )}
              <InfoRow
                icon="tag"
                label="Activity"
                value={String(plan.activity)}
                onPress={isOwner ? handleEditActivity : undefined}
              />
              {plan.url && (
                <InfoRow icon="link" label="Link" value={plan.url} />
              )}
              {plan.maybe !== undefined && (
                <InfoRow
                  icon="questionmark.circle"
                  label="Maybe"
                  value={plan.maybe ? "Yes" : "No"}
                />
              )}
            </View>
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
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
