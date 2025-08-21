import { Link } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function ProfileScreen() {
  // TODO: Wire with real profile via ORPC user router
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="px-6 pt-2 pb-6 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <ThemedText type="title" className="text-gray-900 dark:text-white">
            Profile
          </ThemedText>
          <ThemedText className="text-gray-600 dark:text-gray-300">
            Your personal information and settings
          </ThemedText>
        </View>

        <View className="px-6 space-y-6">
          {/* Profile Picture Section */}
          <View className="items-center">
            <View className="h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center mb-4">
              <ThemedText className="text-3xl">👤</ThemedText>
            </View>
            <ThemedText
              type="subtitle"
              className="text-gray-900 dark:text-white text-center"
            >
              John Doe
            </ThemedText>
          </View>

          {/* Basic Info Section */}
          <View className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <ThemedText
              type="subtitle"
              className="text-gray-900 dark:text-white mb-4"
            >
              Basic Information
            </ThemedText>
            <View className="space-y-3">
              <View className="flex-row items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <ThemedText className="text-gray-600 dark:text-gray-400">
                  Name
                </ThemedText>
                <ThemedText className="text-gray-900 dark:text-white">
                  John Doe
                </ThemedText>
              </View>
              <View className="flex-row items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <ThemedText className="text-gray-600 dark:text-gray-400">
                  Gender
                </ThemedText>
                <ThemedText className="text-gray-900 dark:text-white">
                  —
                </ThemedText>
              </View>
              <View className="flex-row items-center justify-between py-2">
                <ThemedText className="text-gray-600 dark:text-gray-400">
                  Birthday
                </ThemedText>
                <ThemedText className="text-gray-900 dark:text-white">
                  —
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Settings Section */}
          <View className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <ThemedText
              type="subtitle"
              className="text-gray-900 dark:text-white mb-4"
            >
              Settings
            </ThemedText>
            <Link href="/onboarding/profile-setup" asChild>
              <View className="flex-row items-center justify-between py-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl px-4 border border-blue-200 dark:border-blue-700/50">
                <ThemedText className="text-blue-700 dark:text-blue-300">
                  Edit Profile
                </ThemedText>
                <ThemedText className="text-blue-700 dark:text-blue-300">
                  →
                </ThemedText>
              </View>
            </Link>
          </View>

          {/* Stats Section */}
          <View className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <ThemedText
              type="subtitle"
              className="text-gray-900 dark:text-white mb-4"
            >
              Activity Stats
            </ThemedText>
            <View className="flex-row justify-around">
              <View className="items-center">
                <ThemedText className="text-2xl font-bold text-gray-900 dark:text-white">
                  12
                </ThemedText>
                <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
                  Plans Created
                </ThemedText>
              </View>
              <View className="items-center">
                <ThemedText className="text-2xl font-bold text-gray-900 dark:text-white">
                  8
                </ThemedText>
                <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
                  Plans Joined
                </ThemedText>
              </View>
              <View className="items-center">
                <ThemedText className="text-2xl font-bold text-gray-900 dark:text-white">
                  24
                </ThemedText>
                <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
                  Total Activities
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}
