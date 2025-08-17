import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";

export const unstable_settings = {
  initialRouteName: "sign-in",
};

export default function AuthLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: isDark ? "#09090B" : "#FFFFFF",
        },
        animation: "fade",
        animationDuration: 150,
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
          headerShown: true,
          title: "Phone Authentication",
          headerStyle: {
            backgroundColor: isDark ? "#09090B" : "#FFFFFF",
          },
          headerTintColor: isDark ? "#FFFFFF" : "#000000",
        }}
      />
      <Stack.Screen
        name="verify"
        options={{
          headerShown: true,
          title: "Verify Code",
          headerStyle: {
            backgroundColor: isDark ? "#09090B" : "#FFFFFF",
          },
          headerTintColor: isDark ? "#FFFFFF" : "#000000",
        }}
      />
    </Stack>
  );
}
