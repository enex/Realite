import * as Haptics from "expo-haptics";
import { useCallback, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { shadows } from "@/components/plan-card";
import { Icon } from "@/components/ui/icon";
import { useColor } from "@/hooks/use-color";
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
  const insets = useSafeAreaInsets();
  const backgroundColor = useColor("blue");

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
      style={{
        position: "absolute",
        right: 20,
        bottom: Math.max(16, insets.bottom + 12),
        zIndex: 1000,
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <View
          style={[
            shadows.medium,
            {
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          {children || <Icon name={PlusIcon} size={28} color="#FFFFFF" />}
        </View>
      </Animated.View>
    </Pressable>
  );
}
