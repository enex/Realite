import * as Haptics from "expo-haptics";
import { useCallback, useRef } from "react";
import { Animated, Pressable, View } from "react-native";

import { shadows } from "@/components/PlanCard";
import { Icon } from "@/components/ui/icon";
import { useColorScheme } from "@/hooks/useColorScheme";
import { PlusIcon } from "lucide-react-native";

// Native iOS FAB Component
export function NativeFAB({
  onPress,
  children,
}: {
  onPress: () => void;
  children?: React.ReactNode;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handlePressIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className="right-6 bottom-6 absolute z-1000"
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <View
          className="w-16 h-16 rounded-2xl bg-black dark:bg-white items-center justify-center flex"
          style={shadows.medium}
        >
          {children || (
            <Icon
              name={PlusIcon}
              size={28}
              color={isDark ? "#000000" : "#FFFFFF"}
            />
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}
