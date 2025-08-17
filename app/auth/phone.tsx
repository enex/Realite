import { useUser } from "@/client/auth";
import orpc from "@/client/orpc";
import { validatePhoneNumber } from "@/shared/validation/phone";
import { useMutation } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Text, TextInput, View } from "react-native";

export default function PhoneAuthScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const router = useRouter();

  const user = useUser();
  useEffect(() => {
    console.log("user", user);
    if (user) router.replace("/");
  }, [user, router]);

  const requestSMSCode = useMutation(
    orpc.auth.requestSMSCode.mutationOptions({
      onSuccess: () => {
        router.push({
          pathname: "/auth/verify" as never,
          params: { phoneNumber },
        });
      },
      onError: (error) => {
        Alert.alert("Fehler", error.message);
      },
    })
  );

  const isLoading = requestSMSCode.isPending;

  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(value);
    // Validiere die Nummer bei jeder Änderung
    const validation = validatePhoneNumber(value);
    setValidationError(validation.isValid ? null : (validation.error ?? null));
  };

  const handleRequestCode = async () => {
    if (!phoneNumber) {
      Alert.alert(
        "Ungültige Telefonnummer",
        "Bitte geben Sie eine Telefonnummer ein"
      );
      return;
    }

    if (validationError) {
      Alert.alert("Ungültige Telefonnummer", validationError);
      return;
    }

    if (!privacyAccepted) {
      Alert.alert(
        "Einwilligung erforderlich",
        "Bitte stimmen Sie den Datenschutzbestimmungen zu"
      );
      return;
    }

    await requestSMSCode.mutateAsync({ phoneNumber });
  };

  const openPrivacyPolicy = () => {
    void Linking.openURL("https://ihre-domain.de/datenschutz").catch((err) => {
      console.error("Fehler beim Öffnen der Datenschutzerklärung:", err);
      Alert.alert(
        "Fehler",
        "Die Datenschutzerklärung konnte nicht geöffnet werden."
      );
    });
  };

  const openTerms = () => {
    void Linking.openURL("https://ihre-domain.de/agb").catch((err) => {
      console.error("Fehler beim Öffnen der AGB:", err);
      Alert.alert("Fehler", "Die AGB konnten nicht geöffnet werden.");
    });
  };

  return (
    <View className="flex-1 justify-center bg-background p-5">
      <Stack.Screen
        options={{
          title: "Anmeldung per Telefon",
          headerShown: false,
          headerStyle: {
            backgroundColor: "#4F46E5",
          },
        }}
      />

      <Text className="mb-2 text-center text-2xl font-bold text-foreground">
        Geben Sie Ihre Telefonnummer ein
      </Text>
      <Text className="mb-6 text-center text-base text-muted-foreground">
        Wir senden Ihnen einen 6-stelligen Verifizierungscode
      </Text>

      <TextInput
        className={`mb-2 rounded-lg border bg-white p-4 text-base ${validationError ? "border-red-500" : "border-input"}`}
        placeholder="Telefonnummer (z.B. +49123456789)"
        value={phoneNumber}
        onChangeText={handlePhoneNumberChange}
        keyboardType="phone-pad"
        autoFocus
      />

      {validationError && (
        <Text className="mb-3 text-sm text-red-500">{validationError}</Text>
      )}

      <View className="mb-4 flex-row items-center">
        <Pressable
          onPress={() => setPrivacyAccepted(!privacyAccepted)}
          className="mr-2 h-6 w-6 items-center justify-center rounded border border-input"
        >
          {privacyAccepted && <Text className="text-primary">✓</Text>}
        </Pressable>
        <Text className="flex-1 text-sm text-muted-foreground">
          Ich stimme der{" "}
          <Text className="text-primary" onPress={openPrivacyPolicy}>
            Datenschutzerklärung
          </Text>{" "}
          und den{" "}
          <Text className="text-primary" onPress={openTerms}>
            AGB
          </Text>{" "}
          zu. Meine Daten werden ausschließlich zur Authentifizierung verwendet.
        </Text>
      </View>

      <Pressable
        className={`mb-3 flex items-center rounded-lg bg-primary p-3 ${isLoading || !privacyAccepted || validationError || !phoneNumber ? "opacity-70" : ""}`}
        onPress={handleRequestCode}
        disabled={
          isLoading || !privacyAccepted || !!validationError || !phoneNumber
        }
      >
        <Text className="text-base font-semibold text-white">
          {isLoading ? "Wird gesendet..." : "Code senden"}
        </Text>
      </Pressable>

      <Text className="mt-8 text-xs text-muted-foreground">
        Durch Klicken auf &quot;Code senden&quot; stimmen Sie zu, dass wir Ihnen
        eine SMS mit einem Verifizierungscode zusenden dürfen. Es können Kosten
        gemäß Ihrem Mobilfunktarif entstehen.
      </Text>
    </View>
  );
}
