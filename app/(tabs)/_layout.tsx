import { Tabs } from "expo-router";
import React from "react";
import { useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/HapticTab";
import { Icon } from "@/components/ui/Icon";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { useFeatureFlagBoolean } from "@/hooks/useFeatureFlag";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const simpleAppBar = useFeatureFlagBoolean(
    "simple-appbar-for-starpage",
    false
  );

  // Better contrast for inactive tabs in dark mode
  const inactiveTintColor = colorScheme === "dark" ? "#9CA3AF" : "#8E8E93";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#6366F1",
        tabBarInactiveTintColor: inactiveTintColor,
        headerShown: simpleAppBar,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        title: "Realite",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Meine Pläne",
          headerTitle: "Meine Pläne",
          tabBarIcon: ({ color, focused }) => (
            <Icon size={24} name={"calendar"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Entdecken",
          headerTitle: "Entdecken",
          tabBarIcon: ({ color, focused }) => (
            <Icon
              size={24}
              name={focused ? "location.fill" : "location"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          headerTitle: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <Icon
              size={24}
              name={focused ? "person.fill" : "person"}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
