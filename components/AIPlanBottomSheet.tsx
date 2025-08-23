import orpc, { client } from "@/client/orpc";
import { IconSymbol } from "@/components/ui/IconSymbol";
import {
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { forwardRef, useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

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

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => ["50%", "75%", "90%"], []);

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
  const handleSubmit = useCallback(async () => {
    if (!text.trim()) {
      Alert.alert("Please enter what you want to do");
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await client.plan.withAI({ text: text.trim() });

      if (result.plan) {
        // Create the actual plan using the create endpoint
        await client.plan.create(result.plan);

        onPlanCreated?.(result.plan);
        setText("");
        handleDismissModalPress();

        queryClient.invalidateQueries(orpc.plan.myPlans.queryOptions({}));

        Alert.alert(
          "Success!",
          result.answer || "Your plan has been created!",
          [{ text: "OK", style: "default" }]
        );
      } else {
        Alert.alert(
          "Error",
          "Could not create a plan from your request. Please try again."
        );
      }
    } catch (error) {
      console.error("Error creating AI plan:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [text, onPlanCreated, handleDismissModalPress]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      // Sheet is dismissed
      setText("");
    }
  }, []);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={1}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={{
        backgroundColor: "#F2F2F7",
      }}
      handleIndicatorStyle={{
        backgroundColor: "#C6C6C8",
      }}
    >
      <BottomSheetView
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 34,
        }}
      >
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#1C1C1E",
              marginBottom: 6,
            }}
          >
            What do you want to do?
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "#8E8E93",
              lineHeight: 22,
            }}
          >
            Tell me what you&apos;d like to do and I&apos;ll help you create a
            plan
          </Text>
        </View>

        {/* Text Input */}
        <BottomSheetTextInput
          style={{
            backgroundColor: "white",
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            color: "#1C1C1E",
            minHeight: 120,
            textAlignVertical: "top",
            borderWidth: 1,
            borderColor: "#E5E5EA",
            marginBottom: 16,
          }}
          placeholder="e.g., I want to go hiking this weekend with friends, or have a cozy dinner at home..."
          placeholderTextColor="#8E8E93"
          multiline
          value={text}
          onChangeText={setText}
          maxLength={500}
        />

        {/* Character Counter */}
        <Text
          style={{
            fontSize: 12,
            color: "#8E8E93",
            textAlign: "right",
            marginBottom: 20,
          }}
        >
          {text.length}/500
        </Text>

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {/* Cancel Button */}
          <Pressable
            onPress={handleDismissModalPress}
            style={{
              flex: 1,
              backgroundColor: "#F2F2F7",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#E5E5EA",
            }}
            disabled={isLoading}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#8E8E93",
              }}
            >
              Cancel
            </Text>
          </Pressable>

          {/* Create Plan Button */}
          <Pressable
            onPress={handleSubmit}
            style={{
              flex: 2,
              backgroundColor: isLoading ? "#B0B0B0" : "#007AFF",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
            }}
            disabled={isLoading || !text.trim()}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "white",
                  }}
                >
                  Creating...
                </Text>
              </>
            ) : (
              <>
                <IconSymbol name="sparkles" size={16} color="white" />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "white",
                  }}
                >
                  Create with AI
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

AIPlanBottomSheet.displayName = "AIPlanBottomSheet";

export default AIPlanBottomSheet;
