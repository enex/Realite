import orpc, { client } from "@/client/orpc";
import { Button } from "@/components/ui/button";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Text } from "@/components/ui/text";
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
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  TextInput,
  useWindowDimensions,
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const bottomSheetRef = React.useRef<BottomSheetModal>(null);
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isSmallScreen = width < 768;
  const useBottomSheet = !isWeb || isSmallScreen;

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => ["50%", "75%", "90%"], []);

  const handlePresentModalPress = useCallback(() => {
    if (useBottomSheet) {
      bottomSheetRef.current?.present();
    } else {
      setIsDialogOpen(true);
    }
  }, [useBottomSheet]);

  const handleDismissModalPress = useCallback(() => {
    if (useBottomSheet) {
      bottomSheetRef.current?.dismiss();
    } else {
      setIsDialogOpen(false);
    }
  }, [useBottomSheet]);

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
    }
  }, []);

  useEffect(() => {
    if (!isDialogOpen && isWeb && !useBottomSheet) {
      setText("");
    }
  }, [isDialogOpen, isWeb, useBottomSheet]);

  const InputComponent: any = useBottomSheet
    ? BottomSheetTextInput
    : TextInput;
  const ContentWrapper: any = useBottomSheet ? BottomSheetView : View;

  const content = (
    <ContentWrapper className="flex-1 px-6 pt-4 pb-8">
      {/* Header */}
      <View className="mb-5">
        <Text variant="h3" className="text-foreground mb-1.5">
          Was möchten Sie tun?
        </Text>
        <Text variant="muted" className="text-base leading-6">
          Sagen Sie mir, was Sie tun möchten, und ich helfe Ihnen dabei, einen
          Plan zu erstellen
        </Text>
      </View>

      {/* Text Input */}
      <InputComponent
        className="bg-background rounded-xl p-4 text-base text-foreground min-h-[120px] border border-input mb-4"
        style={{ textAlignVertical: "top" }}
        placeholder="z.B. Ich möchte dieses Wochenende mit Freunden wandern gehen oder ein gemütliches Abendessen zu Hause haben..."
        placeholderTextColor="#8E8E93"
        multiline
        value={text}
        onChangeText={setText}
        maxLength={500}
      />

      {/* Character Counter */}
      <Text variant="small" className="text-muted-foreground text-right mb-5">
        {text.length}/500
      </Text>

      {/* Action Buttons */}
      <View className="flex-row gap-3">
        {/* Cancel Button */}
        <Button
          variant="outline"
          className="flex-1"
          onPress={handleDismissModalPress}
          disabled={isLoading}
        >
          <Text>Abbrechen</Text>
        </Button>

        {/* Create Plan Button */}
        <Button
          variant="default"
          className="flex-[2]"
          onPress={handleSubmit}
          disabled={isLoading || !text.trim()}
        >
          {isLoading ? (
            <>
              <ActivityIndicator color="white" size="small" />
              <Text>Erstelle...</Text>
            </>
          ) : (
            <>
              <IconSymbol name="sparkles" size={16} color="white" />
              <Text>Mit KI erstellen</Text>
            </>
          )}
        </Button>
      </View>
    </ContentWrapper>
  );

  if (useBottomSheet) {
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
        {content}
      </BottomSheetModal>
    );
  }

  return (
    <Modal
      visible={isDialogOpen}
      transparent
      animationType="fade"
      onRequestClose={handleDismissModalPress}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="w-full max-w-xl rounded-2xl bg-secondary shadow-xl">
          {content}
        </View>
      </View>
    </Modal>
  );
});

AIPlanBottomSheet.displayName = "AIPlanBottomSheet";

export default AIPlanBottomSheet;
