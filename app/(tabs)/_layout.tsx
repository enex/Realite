import { Tabs } from "expo-router";
import { useFeatureFlag } from "posthog-react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const simpleAppBar = Boolean(useFeatureFlag("simple-appbar-for-starpage"));

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#6366F1",
        tabBarInactiveTintColor: "#8E8E93",
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
            <IconSymbol size={24} name={"calendar"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Entdecken",
          headerTitle: "Entdecken",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
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
            <IconSymbol
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
