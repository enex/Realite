import { Stack } from "expo-router";
import { useUniwind } from "uniwind";

export const unstable_settings = {
  initialRouteName: "sign-in",
};

export default function AuthLayout() {
  const { theme } = useUniwind();
  const isDark = theme === "dark";

  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: isDark ? "#09090B" : "#FFFFFF",
        },
        animation: "fade",
        animationDuration: 150,
        headerShown: true,
        headerStyle: {
          backgroundColor: isDark ? "#09090B" : "#FFFFFF",
        },
        headerTintColor: isDark ? "#FFFFFF" : "#000000",
      }}
    >
      <Stack.Screen
        name="sign-in"
        options={{
          headerShown: false,
          title: "Sign In",
        }}
      />
      <Stack.Screen
        name="phone"
        options={{
          headerShown: false,
          title: "Phone Authentication",
        }}
      />
      <Stack.Screen
        name="verify"
        options={{
          headerShown: false,
          title: "Verify Code",
        }}
      />
      <Stack.Screen
        name="change-phone"
        options={{
          title: "Telefonnummer ändern",
          headerTitle: "Telefonnummer ändern",
        }}
      />
    </Stack>
  );
}
