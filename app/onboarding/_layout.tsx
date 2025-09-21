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
        name="how-it-works"
        options={{
          title: "So funktioniert's",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create-activity"
        options={{
          title: "Erste Aktivität",
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
