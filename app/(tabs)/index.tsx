import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";

type PlanListItem = {
  id: string;
  title: string;
  date: string;
  status: "committed" | "pending";
  activity: "food" | "outdoor" | "social" | "sports" | "culture";
  location?: string;
  participants?: string[];
};

type GroupedPlans = {
  date: string;
  dayLabel: string;
  plans: PlanListItem[];
};

const getActivityGradient = (activity: string) => {
  switch (activity) {
    case "food":
      return ["#fed7aa", "#fdba74", "#fb923c"]; // stronger orange gradient
    case "outdoor":
      return ["#bbf7d0", "#86efac", "#4ade80"]; // stronger green gradient
    case "social":
      return ["#bfdbfe", "#93c5fd", "#3b82f6"]; // stronger blue gradient
    case "sports":
      return ["#e9d5ff", "#c4b5fd", "#8b5cf6"]; // stronger purple gradient
    case "culture":
      return ["#fce7f3", "#fbcfe8", "#f472b6"]; // stronger pink gradient
    default:
      return ["#f1f5f9", "#e2e8f0", "#94a3b8"]; // stronger gray gradient
  }
};

const getActivityBorderColor = (activity: string) => {
  switch (activity) {
    case "food":
      return "#fed7aa"; // orange-200
    case "outdoor":
      return "#bbf7d0"; // green-200
    case "social":
      return "#bfdbfe"; // blue-200
    case "sports":
      return "#e9d5ff"; // purple-200
    case "culture":
      return "#fce7f3"; // pink-200
    default:
      return "#e2e8f0"; // gray-200
  }
};

const getActivityIconColor = (activity: string) => {
  switch (activity) {
    case "food":
      return "#ea580c"; // orange-600
    case "outdoor":
      return "#059669"; // emerald-600
    case "social":
      return "#2563eb"; // blue-600
    case "sports":
      return "#9333ea"; // purple-600
    case "culture":
      return "#ec4899"; // pink-600
    default:
      return "#4b5563"; // gray-600
  }
};

const getActivityIcon = (activity: string) => {
  switch (activity) {
    case "food":
      return "fork.knife";
    case "outdoor":
      return "mountain.2";
    case "social":
      return "person.2";
    case "sports":
      return "figure.run";
    case "culture":
      return "theatermasks";
    default:
      return "calendar";
  }
};

export default function PlansScreen() {
  // TODO: Replace with data from ORPC once endpoint is available
  const data = useMemo<PlanListItem[]>(
    () => [
      {
        id: "1",
        title: "Takama/Honkai-Karate",
        date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        status: "committed",
        activity: "sports",
        location: "SV 1945 Königshofen",
        participants: ["S"],
      },
      {
        id: "2",
        title: "Sunday Coffee Run - Green Fit",
        date: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
        status: "pending",
        activity: "food",
        location: "Café - Bar Human",
        participants: ["S"],
      },
      {
        id: "3",
        title: "Museumssuferfest Frankfurt",
        date: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
        status: "committed",
        activity: "culture",
        location: "Frankfurt am Main",
        participants: ["S", "A"],
      },
    ],
    []
  );

  const groupedPlans = useMemo(() => {
    const groups: Record<string, PlanListItem[]> = {};

    data.forEach((plan) => {
      const date = new Date(plan.date);
      const dateKey = date.toDateString();

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(plan);
    });

    return Object.entries(groups)
      .map(([dateKey, plans]) => {
        const date = new Date(dateKey);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let dayLabel = date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });

        if (date.toDateString() === today.toDateString()) {
          dayLabel = "Today";
        } else if (date.toDateString() === tomorrow.toDateString()) {
          dayLabel = "Tomorrow";
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

  const renderPlanItem = ({ item }: { item: PlanListItem }) => (
    <LinearGradient
      colors={getActivityGradient(item.activity)}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={{
        marginBottom: 16,
        borderRadius: 24,
        padding: 20,
        position: "relative",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: getActivityBorderColor(item.activity),
      }}
    >
      {/* Large background icon */}
      <View
        style={{
          position: "absolute",
          top: -16,
          right: -16,
          opacity: 0.35,
          zIndex: 0,
        }}
      >
        <IconSymbol
          name={getActivityIcon(item.activity)}
          size={120}
          color={getActivityIconColor(item.activity)}
        />
      </View>

      {/* Content */}
      <View style={{ position: "relative", zIndex: 10 }}>
        <View className="mb-4">
          <ThemedText className="text-gray-900 dark:text-white mb-2 font-bold text-lg">
            {item.title}
          </ThemedText>
          {item.location && (
            <View className="flex-row items-center gap-2">
              <View className="bg-white/60 dark:bg-gray-800/60 rounded-full p-1.5">
                <IconSymbol
                  name="location"
                  size={12}
                  color="rgb(107 114 128)"
                />
              </View>
              <ThemedText className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {item.location}
              </ThemedText>
            </View>
          )}
        </View>

        <View className="flex-row items-center justify-between">
          {item.participants && item.participants.length > 0 && (
            <View className="flex-row items-center">
              <View className="flex-row">
                {item.participants.map((participant, index) => (
                  <View
                    key={participant}
                    className={`h-10 w-10 rounded-full bg-white dark:bg-gray-800 items-center justify-center border-2 border-white/50 dark:border-gray-600/50 shadow-sm ${index > 0 ? "-ml-3" : ""}`}
                    style={{ zIndex: item.participants!.length - index }}
                  >
                    <Text className="text-gray-900 dark:text-white text-sm font-bold">
                      {participant}
                    </Text>
                  </View>
                ))}
              </View>
              {item.participants.length > 1 && (
                <ThemedText className="ml-3 text-sm text-gray-700 dark:text-gray-300 font-medium">
                  +{item.participants.length - 1} more
                </ThemedText>
              )}
            </View>
          )}

          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: getActivityBorderColor(item.activity),
            }}
          >
            <ThemedText className="text-xs font-medium text-gray-900 dark:text-white">
              {new Date(item.date).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </ThemedText>
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  const renderDayGroup = ({ item }: { item: GroupedPlans }) => (
    <View className="mb-8">
      <View className="mb-3 px-1">
        <ThemedText className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {item.dayLabel}
        </ThemedText>
      </View>
      {item.plans.map((plan) => (
        <View key={plan.id}>{renderPlanItem({ item: plan })}</View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="px-4 pt-2 pb-6 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <ThemedText type="title" className="text-gray-900 dark:text-white">
            My Plans
          </ThemedText>
          <ThemedText className="text-gray-600 dark:text-gray-300">
            Organized by day, sorted by time
          </ThemedText>
        </View>

        <FlatList
          data={groupedPlans}
          keyExtractor={(item) => item.date}
          renderItem={renderDayGroup}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
        />

        <Link href="/onboarding/create-activity" asChild>
          <Pressable className="absolute bottom-24 right-6 h-14 w-14 items-center justify-center rounded-full bg-blue-500 dark:bg-blue-600">
            <IconSymbol name="plus" size={20} color="white" />
          </Pressable>
        </Link>
      </ThemedView>
    </SafeAreaView>
  );
}
