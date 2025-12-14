import { Stack } from "expo-router";

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
    </Stack>
  );
}
