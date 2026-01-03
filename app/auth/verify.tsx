import { useSignInWithPhone } from "@/client/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GradientBackdrop } from "@/components/ui/gradient-backdrop";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useThemeColor } from "@/hooks/useThemeColor";
import { CheckIcon } from "lucide-react-native";

export default function VerifyCodeScreen() {
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const signInWithPhone = useSignInWithPhone();
  const textColor = useThemeColor({}, "text");
  const placeholderColor = useThemeColor({}, "icon");
  const primaryColor = "#4F46E5";

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      Alert.alert(
        "Code ungültig",
        "Bitte gib den 6-stelligen Verifizierungscode ein."
      );
      return;
    }

    setIsLoading(true);
    try {
      await signInWithPhone(phoneNumber || "", code);
    } catch (error: any) {
      console.error("Error verifying code:", error);
      if (error?.message?.includes("Network request failed")) {
        Alert.alert(
          "Verbindungsfehler",
          "Der Server konnte nicht erreicht werden. Bitte stelle sicher, dass du das Backend mit 'bun run dev' gestartet hast."
        );
      } else {
        Alert.alert(
          "Fehler",
          "Code konnte nicht verifiziert werden. Bitte versuchen Sie es erneut."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1">
      <GradientBackdrop variant="cool" />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
              className="px-6"
              keyboardShouldPersistTaps="handled"
            >
              <View className="mb-10 items-center">
                <View className="mb-6 h-24 w-24 items-center justify-center rounded-[32px] bg-primary/10">
                  <Icon name={CheckIcon} size={48} color={primaryColor} />
                </View>
                <Text
                  variant="title"
                  className="text-center font-bold text-zinc-900 dark:text-zinc-50"
                >
                  Code bestätigen
                </Text>
                <Text
                  variant="subtitle"
                  className="mt-2 px-8 text-center text-zinc-600 dark:text-zinc-400"
                >
                  Wir haben dir einen Code an{" "}
                  <Text className="font-bold text-zinc-900 dark:text-zinc-50">
                    {phoneNumber}
                  </Text>{" "}
                  gesendet.
                </Text>
              </View>

              <Card>
                <CardContent>
                  <View className="mb-10">
                    <Text
                      variant="body"
                      className="mb-3 ml-1 uppercase tracking-widest text-zinc-500 dark:text-zinc-400"
                    >
                      Verifizierungscode
                    </Text>
                    <View
                      className={`flex-row items-center justify-center rounded-2xl border bg-white/60 dark:bg-black/30 px-4 py-5 ${
                        isFocused
                          ? "border-primary"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <TextInput
                        className="flex-1 text-center text-3xl font-bold tracking-[12px]"
                        style={{ color: textColor }}
                        placeholder="000000"
                        placeholderTextColor={placeholderColor}
                        value={code}
                        onChangeText={setCode}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoFocus
                      />
                    </View>
                  </View>

                  <Button
                    onPress={handleVerifyCode}
                    disabled={isLoading || code.length !== 6}
                    size="lg"
                    className="h-14 w-full shadow-lg shadow-primary/30"
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text>Code bestätigen</Text>
                    )}
                  </Button>

                  <Pressable
                    className="mt-6 self-center"
                    onPress={() => router.back()}
                  >
                    <Text
                      variant="caption"
                      className="text-zinc-500 dark:text-zinc-400"
                    >
                      Nummer ändern
                    </Text>
                  </Pressable>
                </CardContent>
              </Card>

              <Text
                variant="caption"
                className="mt-10 px-8 text-center leading-4 opacity-50"
              >
                Du hast keinen Code erhalten? Bitte warte einen Moment oder
                kontaktiere unseren Support.
              </Text>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
