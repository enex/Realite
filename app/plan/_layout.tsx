import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function PlanLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="new/edit"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="new/ai"
        options={{
          presentation: Platform.OS === "ios" ? "formSheet" : "modal",
        }}
      />
    </Stack>
  );
}
