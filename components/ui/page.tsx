import { useColor } from "@/hooks/useColor";
import { Stack } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvoidKeyboard } from "./avoid-keyboard";
import { ScrollView } from "./scroll-view";
import { View } from "./view";

/** Abstraction for Pretty much any page so they look consistent */
export default function Page({
  children,
  contentContainerStyle,
  rightButton,
  bottom,
  ...rest
}: {
  children?: React.ReactNode;
  rightButton?: React.ReactNode;
  bottom?: React.ReactNode;
} & React.ComponentProps<typeof ScrollView>) {
  const backgroundColor = useColor("background");
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor }}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor },
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="always"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          {
            padding: 16,
            paddingTop: insets.top + 16,
          },
          contentContainerStyle,
        ]}
        {...rest}
      >
        {children}
      </ScrollView>
      {rightButton && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 8,
            right: 16,
          }}
        >
          {rightButton}
        </View>
      )}
      {bottom}
      <AvoidKeyboard />
    </View>
  );
}
