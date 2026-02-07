import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useColor } from "@/hooks/use-color";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { Settings2, UserCircle2 } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function HeaderIconButton({
  onPress,
  label,
  icon,
  color,
}: {
  onPress: () => void;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      style={styles.iconButton}
    >
      <Icon name={icon} size={20} color={color} />
    </Pressable>
  );
}

function HomeHeader({
  title,
  textColor,
  iconColor,
  backgroundColor,
  onOpenSettings,
  onOpenProfile,
}: {
  title: string;
  textColor: string;
  iconColor: string;
  backgroundColor: string;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.homeHeader, { backgroundColor, paddingTop: insets.top }]}>
      <View style={styles.homeHeaderRow}>
        <Text style={[styles.homeHeaderTitle, { color: textColor }]}>{title}</Text>
        <View style={styles.headerActions}>
          <HeaderIconButton
            label="Einstellungen"
            icon={Settings2}
            color={iconColor}
            onPress={onOpenSettings}
          />
          <HeaderIconButton
            label="Profil"
            icon={UserCircle2}
            color={iconColor}
            onPress={onOpenProfile}
          />
        </View>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const router = useRouter();
  const backgroundColor = useColor("background");
  const textColor = useColor("text");
  const iconColor = useColor("icon");

  const triggerTap = () => {
    if (Platform.OS === "web") return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openSettings = () => {
    triggerTap();
    router.push("/settings/intents" as any);
  };

  const openProfile = () => {
    triggerTap();
    router.push("/profile" as any);
  };

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          header: () => (
            <HomeHeader
              title="Startseite"
              textColor={textColor}
              iconColor={iconColor}
              backgroundColor={backgroundColor}
              onOpenSettings={openSettings}
              onOpenProfile={openProfile}
            />
          ),
        }}
      />
      <Stack.Screen
        name="my-plans"
        options={{
          title: "Meine Pläne",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="explore"
        options={{
          title: "Entdecken",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: "Profil",
          headerShown: true,
          headerTitleAlign: "center",
          headerRight: () => <View style={styles.profileHeaderRightSpacer} />,
          headerStyle: { backgroundColor },
          headerTintColor: textColor,
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 21,
          },
          headerBackButtonDisplayMode: "minimal",
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  homeHeader: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  homeHeaderRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeHeaderTitle: {
    fontWeight: "800",
    fontSize: 22,
    lineHeight: 26,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileHeaderRightSpacer: {
    width: 40,
  },
});
