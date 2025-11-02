import orpc, { client } from "@/client/orpc";
import { Button } from "@/components/ui/button";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useLocation } from "@/hooks/useLocation";
import {
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  TextInput as RNTextInput,
  View,
} from "react-native";

type AIPlanBottomSheetProps = {
  onPlanCreated?: (plan: any) => void;
};

export type AIPlanBottomSheetRef = {
  present: () => void;
  dismiss: () => void;
};

const AIPlanBottomSheet = forwardRef<
  AIPlanBottomSheetRef,
  AIPlanBottomSheetProps
>(({ onPlanCreated }, ref) => {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomSheetRef = React.useRef<BottomSheetModal>(null);
  const textInputRef = useRef<any>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => ["75%", "90%"], []);

  const handlePresentModalPress = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current.present();
    }
  }, []);

  const handleDismissModalPress = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current.dismiss();
    }
  }, []);

  // Expose methods to parent component
  React.useImperativeHandle(
    ref,
    () => ({
      present: handlePresentModalPress,
      dismiss: handleDismissModalPress,
    }),
    [handlePresentModalPress, handleDismissModalPress]
  );

  const queryClient = useQueryClient();
  const { latitude, longitude, hasPermission } = useLocation();
  const handleSubmit = useCallback(async () => {
    if (!text.trim()) {
      Alert.alert("Bitte geben Sie ein, was Sie tun möchten");
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await client.plan.withAI({
        text: text.trim(),
        location: hasPermission
          ? {
              latitude,
              longitude,
              radius: 50000,
            }
          : undefined,
      });

      if (result.plan) {
        // Create the actual plan using the create endpoint
        const created = await client.plan.create(result.plan);

        // Provide the new plan id to the parent for navigation
        onPlanCreated?.({ ...result.plan, id: (created as any)?.id });
        setText("");
        handleDismissModalPress();

        queryClient.invalidateQueries(
          orpc.plan.myPlans.queryOptions({
            input: {},
          })
        );
      } else {
        Alert.alert(
          "Fehler",
          "Konnte keinen Plan aus Ihrer Anfrage erstellen. Bitte versuchen Sie es erneut."
        );
      }
    } catch (error) {
      console.error("Error creating AI plan:", error);
      Alert.alert(
        "Fehler",
        "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut."
      );
    } finally {
      setIsLoading(false);
    }
  }, [text, onPlanCreated, handleDismissModalPress]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      // Sheet is dismissed
      setText("");
    } else if (index >= 0) {
      // Sheet is opened - focus the input after a short delay to ensure sheet is fully rendered
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 300);
    }
  }, []);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={0}
      onChange={handleSheetChanges}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{
        backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? "#636366" : "#C6C6C8",
      }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 0,
          flex: 1,
        }}
      >
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <Text
            variant="h3"
            className="text-foreground"
            style={{
              fontSize: 24,
              fontWeight: "700",
              marginBottom: 8,
              color: isDark ? "#FFFFFF" : "#000000",
            }}
          >
            Was möchten Sie tun?
          </Text>
          <Text
            variant="muted"
            style={{
              fontSize: 15,
              lineHeight: 22,
              color: isDark ? "#8E8E93" : "#6B7280",
            }}
          >
            Sagen Sie mir, was Sie tun möchten, und ich helfe Ihnen dabei, einen
            Plan zu erstellen
          </Text>
        </View>

        {/* Text Input */}
        <View style={{ marginBottom: 8 }}>
          {Platform.OS === "web" ? (
            <RNTextInput
              ref={textInputRef}
              style={{
                backgroundColor: isDark ? "#2C2C2E" : "#F9FAFB",
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: isDark ? "#FFFFFF" : "#000000",
                minHeight: 120,
                textAlignVertical: "top",
                borderWidth: 1,
                borderColor: isDark ? "#3A3A3C" : "#E5E7EB",
              }}
              placeholder="z.B. Ich möchte dieses Wochenende mit Freunden wandern gehen oder ein gemütliches Abendessen zu Hause haben..."
              placeholderTextColor={isDark ? "#636366" : "#9CA3AF"}
              multiline
              value={text}
              onChangeText={setText}
              maxLength={500}
              autoFocus
            />
          ) : (
            <BottomSheetTextInput
              ref={textInputRef}
              style={{
                backgroundColor: isDark ? "#2C2C2E" : "#F9FAFB",
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: isDark ? "#FFFFFF" : "#000000",
                minHeight: 120,
                textAlignVertical: "top",
                borderWidth: 1,
                borderColor: isDark ? "#3A3A3C" : "#E5E7EB",
              }}
              placeholder="z.B. Ich möchte dieses Wochenende mit Freunden wandern gehen oder ein gemütliches Abendessen zu Hause haben..."
              placeholderTextColor={isDark ? "#636366" : "#9CA3AF"}
              multiline
              value={text}
              onChangeText={setText}
              maxLength={500}
              autoFocus
            />
          )}
        </View>

        {/* Character Counter */}
        <Text
          variant="small"
          style={{
            fontSize: 13,
            color: isDark ? "#636366" : "#9CA3AF",
            textAlign: "right",
            marginBottom: 16,
          }}
        >
          {text.length}/500
        </Text>

        {/* Action Buttons - positioned to stay above keyboard */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginBottom: Platform.OS === "android" ? 16 : 0,
          }}
        >
          {/* Cancel Button */}
          <Button
            variant="outline"
            className="flex-1"
            onPress={handleDismissModalPress}
            disabled={isLoading}
            style={{
              backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF",
              borderColor: isDark ? "#3A3A3C" : "#E5E7EB",
            }}
          >
            <Text
              style={{
                color: isDark ? "#FFFFFF" : "#000000",
                fontWeight: "600",
              }}
            >
              Abbrechen
            </Text>
          </Button>

          {/* Create Plan Button */}
          <Button
            variant="default"
            className="flex-[2]"
            onPress={handleSubmit}
            disabled={isLoading || !text.trim()}
            style={{
              backgroundColor:
                isLoading || !text.trim()
                  ? isDark
                    ? "#3A3A3C"
                    : "#D1D5DB"
                  : "#6366F1",
            }}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text style={{ color: "white", fontWeight: "600" }}>
                  Erstelle...
                </Text>
              </>
            ) : (
              <>
                <IconSymbol name="sparkles" size={16} color="white" />
                <Text style={{ color: "white", fontWeight: "600" }}>
                  Mit KI erstellen
                </Text>
              </>
            )}
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

AIPlanBottomSheet.displayName = "AIPlanBottomSheet";

export default AIPlanBottomSheet;
