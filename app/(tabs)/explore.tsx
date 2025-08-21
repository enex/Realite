import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

type ExploreItem = {
  id: string;
  title: string;
  date: string;
  distanceKm: number;
  activity: "food" | "outdoor" | "social" | "sports" | "culture";
  creator: string;
};

const getActivityColor = (activity: string) => {
  switch (activity) {
    case "food":
      return "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700/50";
    case "outdoor":
      return "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700/50";
    case "social":
      return "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/50";
    case "sports":
      return "bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700/50";
    case "culture":
      return "bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-700/50";
    default:
      return "bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50";
  }
};

const getActivityIcon = (activity: string) => {
  switch (activity) {
    case "food":
      return "🍽️";
    case "outdoor":
      return "🏔️";
    case "social":
      return "👥";
    case "sports":
      return "⚽";
    case "culture":
      return "🎭";
    default:
      return "📅";
  }
};

export default function ExploreScreen() {
  const [query, setQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState("10");

  // TODO: Replace with ORPC data: nearby or public plans
  const data = useMemo<ExploreItem[]>(
    () => [
      {
        id: "a",
        title: "Community Run",
        date: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
        distanceKm: 3.2,
        activity: "sports",
        creator: "Sarah M.",
      },
      {
        id: "b",
        title: "Wine Tasting",
        date: new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(),
        distanceKm: 8.7,
        activity: "food",
        creator: "Mike R.",
      },
      {
        id: "c",
        title: "Art Gallery Tour",
        date: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
        distanceKm: 2.1,
        activity: "culture",
        creator: "Emma L.",
      },
    ],
    []
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="px-6 pt-2 pb-6 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <ThemedText type="title" className="text-gray-900 dark:text-white">
            Explore
          </ThemedText>
          <ThemedText className="text-gray-600 dark:text-gray-300">
            Discover plans you might like
          </ThemedText>
        </View>

        <View className="px-6 pb-4">
          <View className="flex-row gap-3">
            <TextInput
              placeholder="Search plans..."
              placeholderTextColor="rgb(156 163 175)"
              value={query}
              onChangeText={setQuery}
              className="flex-1 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white"
            />
            <TextInput
              placeholder="Radius"
              placeholderTextColor="rgb(156 163 175)"
              value={radiusKm}
              onChangeText={setRadiusKm}
              keyboardType="numeric"
              className="w-20 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-3 py-3 text-center text-gray-900 dark:text-white"
            />
          </View>
        </View>

        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <View className="mb-4 flex-row items-start justify-between">
                <View className="flex-1">
                  <ThemedText
                    type="subtitle"
                    className="text-gray-900 dark:text-white"
                  >
                    {item.title}
                  </ThemedText>
                  <ThemedText className="text-sm text-gray-600 dark:text-gray-300">
                    {new Date(item.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </ThemedText>
                </View>
                <View
                  className={`h-10 w-10 items-center justify-center rounded-full ${getActivityColor(item.activity)}`}
                >
                  <Text className="text-lg">
                    {getActivityIcon(item.activity)}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="h-2 w-2 rounded-full bg-blue-400" />
                  <ThemedText className="text-sm text-gray-700 dark:text-gray-300">
                    by {item.creator}
                  </ThemedText>
                </View>
                <View className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 border border-blue-200 dark:border-blue-700/50">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {item.distanceKm.toFixed(1)} km
                  </Text>
                </View>
              </View>

              <Pressable className="mt-4 rounded-xl bg-blue-100 dark:bg-blue-900/30 py-3 border border-blue-200 dark:border-blue-700/50">
                <Text className="text-center text-sm font-semibold text-blue-700 dark:text-blue-300">
                  Join Plan
                </Text>
              </Pressable>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />

        <Link href="/onboarding/create-activity" asChild>
          <Pressable className="absolute bottom-24 right-6 h-16 w-16 items-center justify-center rounded-full bg-blue-500 dark:bg-blue-600 shadow-lg">
            <Text className="text-2xl text-white">+</Text>
          </Pressable>
        </Link>
      </ThemedView>
    </SafeAreaView>
  );
}
