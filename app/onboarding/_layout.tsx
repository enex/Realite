import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";

export default function OnboardingLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? "#09090B" : "#FFFFFF",
        },
        headerTintColor: isDark ? "#FFFFFF" : "#000000",
        contentStyle: {
          backgroundColor: isDark ? "#09090B" : "#FFFFFF",
        },
        headerShown: false,
        animation: "fade",
        animationDuration: 150,
      }}
    >
      <Stack.Screen
        name="welcome"
        options={{
          title: "Willkommen",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="calendar-sync"
        options={{
          title: "Kalender verbinden",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="permissions"
        options={{
          title: "Berechtigungen",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="intents"
        options={{
          title: "Intentionen",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile-setup"
        options={{
          title: "Profil einrichten",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
