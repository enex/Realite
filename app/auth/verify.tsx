import { useSignInWithPhone } from "@/client/auth";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

export default function VerifyCodeScreen() {
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const signInWithPhone = useSignInWithPhone();

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit verification code");
      return;
    }

    setIsLoading(true);
    try {
      await signInWithPhone(phoneNumber || "", code);
    } catch (error) {
      console.error("Error verifying code:", error);
      Alert.alert(
        "Fehler",
        "Code konnte nicht verifiziert werden. Bitte versuchen Sie es erneut."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex flex-1 flex-col justify-center bg-background p-5">
      <Stack.Screen
        options={{
          title: "Verify Code",
          headerShown: false,
          headerStyle: {
            backgroundColor: "#4F46E5",
          },
        }}
      />

      <Text className="mb-2 text-center text-2xl font-bold text-foreground">
        Verifikationscode eingeben
      </Text>
      <Text className="mb-8 text-center text-base text-muted-foreground">
        Wir haben einen 6-stelligen Code an {phoneNumber} gesendet
      </Text>

      <TextInput
        className="mb-5 rounded-lg border border-input bg-white p-4 text-center text-base tracking-widest"
        placeholder="6-digit code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        testID="verify-code-input"
        accessibilityLabel="Verifizierungscode eingeben"
      />

      <Pressable
        className={`mb-3 flex items-center rounded-lg bg-primary p-3 ${isLoading ? "opacity-70" : ""}`}
        onPress={handleVerifyCode}
        disabled={isLoading}
        testID="verify-code-button"
        accessibilityLabel="Code verifizieren"
      >
        <Text className="text-base font-semibold text-white">
          {isLoading ? "Verifying..." : "Verify Code"}
        </Text>
      </Pressable>
      <View className="flex-1" />
      <Pressable
        className="flex items-center rounded-lg bg-muted p-3"
        onPress={() => router.back()}
      >
        <Text className="text-base font-semibold text-foreground">Zurück</Text>
      </Pressable>
    </View>
  );
}
