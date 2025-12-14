import orpc, { client } from "@/client/orpc";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
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
  useImperativeHandle,
  useRef,
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
  const textInputRef = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isSmallScreen = width < 768;
  const useNativeBottomSheet = !isWeb;
  const useWebSheet = isWeb && isSmallScreen;
  const useDialog = isWeb && !isSmallScreen;

  const handlePresentModalPress = useCallback(() => {
    if (useNativeBottomSheet) {
      bottomSheetRef.current?.present();
    } else if (useWebSheet) {
      setIsDialogOpen(true);
    } else {
      setIsDialogOpen(true);
    }
  }, [useNativeBottomSheet, useWebSheet]);

  const handleDismissModalPress = useCallback(() => {
    if (useNativeBottomSheet) {
      bottomSheetRef.current?.dismiss();
    } else {
      setIsDialogOpen(false);
    }
  }, [useNativeBottomSheet]);

  // Expose methods to parent component
  useImperativeHandle(
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
      // Sheet is opened - focus the input after a short delay to ensure the sheet is fully rendered
      setTimeout(() => {
        (textInputRef.current as any)?.focus();
      }, 300);
    }
  }, []);

  useEffect(() => {
    if (!isDialogOpen && isWeb) {
      setText("");
    } else if (isDialogOpen && isWeb) {
      // Focus the input when dialog opens on web
      setTimeout(() => {
        (textInputRef.current as any)?.focus();
      }, 100);
    }
  }, [isDialogOpen, isWeb]);

  const InputComponent: any = useNativeBottomSheet
    ? BottomSheetTextInput
    : TextInput;

  const content = (
    <React.Fragment>
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
        ref={textInputRef}
        className="bg-background rounded-xl p-4 text-base text-foreground min-h-[120px] border border-input mb-4"
        style={{ textAlignVertical: "top" }}
        placeholder="z.B. Ich möchte dieses Wochenende mit Freunden wandern gehen oder ein gemütliches Abendessen zu Hause haben..."
        placeholderTextColor="#8E8E93"
        multiline
        value={text}
        onChangeText={setText}
        maxLength={500}
        autoFocus={false}
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
              <Icon name="sparkles" size={16} color="white" />
              <Text>Mit KI erstellen</Text>
            </>
          )}
        </Button>
      </View>
    </React.Fragment>
  );

  if (useNativeBottomSheet) {
    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        index={1}
        onChange={handleSheetChanges}
        enablePanDownToClose
        enableDynamicSizing
        snapPoints={["50%", "75%", "90%"]}
        keyboardBehavior="extend"
        backgroundStyle={{
          backgroundColor: "#F2F2F7",
        }}
        handleIndicatorStyle={{
          backgroundColor: "#C6C6C8",
        }}
      >
        <BottomSheetView className="px-6 pt-4">{content}</BottomSheetView>
      </BottomSheetModal>
    );
  }

  if (useDialog) {
    return (
      <Modal
        visible={isDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={handleDismissModalPress}
      >
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-full max-w-xl rounded-2xl bg-secondary shadow-xl px-6 pt-4 pb-8">
            {content}
          </View>
        </View>
      </Modal>
    );
  }

  // Web small-screen fallback: native-like bottom sheet via Modal to avoid
  // @gorhom/bottom-sheet layout quirks on mobile web.
  return (
    <Modal
      visible={isDialogOpen}
      transparent
      animationType="slide"
      onRequestClose={handleDismissModalPress}
    >
      <View className="flex-1 justify-end bg-black/30">
        <View className="w-full rounded-t-3xl bg-secondary shadow-xl max-h-[90%]">
          <View className="items-center pt-2">
            <View className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </View>
          <View className="px-6 pt-4 pb-8">{content}</View>
        </View>
      </View>
    </Modal>
  );
});

AIPlanBottomSheet.displayName = "AIPlanBottomSheet";

export default AIPlanBottomSheet;
