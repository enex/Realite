import { useUser } from "@/client/auth";
import rpc from "@/client/orpc";
import { validatePhoneNumber } from "@/shared/validation/phone";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { GradientBackdrop } from "@/components/ui/gradient-backdrop";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/text";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function PhoneAuthScreen() {
  const [phoneNumber, setPhoneNumber] = useState("+49");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const textColor = useThemeColor({}, "text");
  const placeholderColor = useThemeColor({}, "icon");
  const primaryColor = "#4F46E5";

  const user = useUser();
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const requestSMSCode = useMutation(
    rpc.auth.requestSMSCode.mutationOptions({
      onSuccess: () => {
        router.push({
          pathname: "/auth/verify" as never,
          params: { phoneNumber },
        });
      },
      onError: (error) => {
        if (error.message.includes("Network request failed")) {
          Alert.alert(
            "Verbindungsfehler",
            "Der Server konnte nicht erreicht werden. Bitte stelle sicher, dass du das Backend mit 'bun run dev' gestartet hast."
          );
        } else {
          Alert.alert("Fehler", error.message);
        }
      },
    })
  );

  const isLoading = requestSMSCode.isPending;

  const handlePhoneNumberChange = (value: string) => {
    let formatted = value;

    // Automatisches Ergänzen von +49, wenn die Nummer mit 0 beginnt
    if (value.startsWith("0") && !value.startsWith("00")) {
      formatted = "+49" + value.substring(1);
    }
    // Sicherstellen, dass die Nummer mit + beginnt, wenn Ziffern eingegeben werden
    else if (value.length > 0 && !value.startsWith("+") && /^\d/.test(value)) {
      formatted = "+" + value;
    }

    setPhoneNumber(formatted);

    const validation = validatePhoneNumber(formatted);
    setValidationError(validation.isValid ? null : (validation.error ?? null));
  };

  const handleRequestCode = async () => {
    if (!phoneNumber || phoneNumber === "+49") {
      Alert.alert(
        "Telefonnummer fehlt",
        "Bitte gib deine Telefonnummer ein, um fortzufahren."
      );
      return;
    }

    if (validationError) {
      Alert.alert("Ungültige Telefonnummer", validationError);
      return;
    }

    if (!privacyAccepted) {
      Alert.alert(
        "Zustimmung erforderlich",
        "Bitte akzeptiere die Datenschutzbestimmungen, um dich anzumelden."
      );
      return;
    }

    await requestSMSCode.mutateAsync({ phoneNumber });
  };

  const openPrivacyPolicy = () => {
    void Linking.openURL("https://realite.app/datenschutz").catch((err) => {
      console.error("Fehler beim Öffnen der Datenschutzerklärung:", err);
      Alert.alert(
        "Fehler",
        "Die Datenschutzerklärung konnte nicht geöffnet werden."
      );
    });
  };

  const openTerms = () => {
    void Linking.openURL("https://realite.app/agb").catch((err) => {
      console.error("Fehler beim Öffnen der AGB:", err);
      Alert.alert("Fehler", "Die AGB konnten nicht geöffnet werden.");
    });
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
                  <Icon name="phone.fill" size={48} color={primaryColor} />
                </View>
                <Text
                  variant="titleLarge"
                  className="text-center font-bold text-zinc-900 dark:text-zinc-50"
                >
                  Willkommen
                </Text>
                <Text
                  variant="subtitle"
                  className="mt-2 px-4 text-center text-zinc-600 dark:text-zinc-400"
                >
                  Melde dich mit deiner Nummer an, um deine Pläne zu sehen.
                </Text>
              </View>

              <Card className="p-8 shadow-2xl">
                <View className="mb-8">
                  <Text
                    variant="small"
                    className="mb-3 ml-1 uppercase tracking-widest text-zinc-500 dark:text-zinc-400"
                  >
                    Telefonnummer
                  </Text>
                  <View
                    className={`flex-row items-center rounded-2xl border bg-white/60 dark:bg-black/30 px-4 py-4 ${
                      validationError
                        ? "border-red-500/50"
                        : isFocused
                          ? "border-primary"
                          : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <Icon
                      name="phone"
                      size={22}
                      color={isFocused ? primaryColor : placeholderColor}
                    />
                    <TextInput
                      className="ml-3 flex-1 text-xl font-semibold"
                      style={{ color: textColor }}
                      placeholder="+49 123 456789"
                      placeholderTextColor={placeholderColor}
                      value={phoneNumber}
                      onChangeText={handlePhoneNumberChange}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      keyboardType="phone-pad"
                      autoFocus
                    />
                  </View>
                  {validationError && (
                    <Text
                      variant="caption"
                      className="mt-2 ml-1 text-red-500 font-medium"
                    >
                      {validationError}
                    </Text>
                  )}
                </View>

                <View className="mb-10 flex-row items-start px-1">
                  <Pressable
                    onPress={() => setPrivacyAccepted(!privacyAccepted)}
                    className={`mt-0.5 h-6 w-6 items-center justify-center rounded-lg border ${
                      privacyAccepted
                        ? "bg-primary border-primary"
                        : "border-zinc-300 dark:border-zinc-700 bg-white/40 dark:bg-black/20"
                    }`}
                  >
                    {privacyAccepted && (
                      <Icon name="checkmark" size={16} color="white" />
                    )}
                  </Pressable>
                  <View className="ml-4 flex-1">
                    <Text
                      variant="small"
                      className="leading-5 text-zinc-600 dark:text-zinc-400"
                    >
                      Ich akzeptiere die{" "}
                      <Text
                        variant="small"
                        className="font-bold text-primary"
                        onPress={openPrivacyPolicy}
                      >
                        Datenschutzbestimmungen
                      </Text>{" "}
                      und die{" "}
                      <Text
                        variant="small"
                        className="font-bold text-primary"
                        onPress={openTerms}
                      >
                        AGB
                      </Text>
                      .
                    </Text>
                  </View>
                </View>

                <Button
                  onPress={handleRequestCode}
                  disabled={
                    isLoading ||
                    !privacyAccepted ||
                    !!validationError ||
                    !phoneNumber ||
                    phoneNumber === "+49"
                  }
                  size="pill"
                  className="h-14 w-full shadow-lg shadow-primary/30"
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-lg font-bold text-white">
                      Code senden
                    </Text>
                  )}
                </Button>
              </Card>

              <Text
                variant="caption"
                className="mt-10 px-8 text-center leading-4 opacity-50"
              >
                Wir senden dir einen 6-stelligen Code per SMS zur Verifizierung
                deiner Identität.
              </Text>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
