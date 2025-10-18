import orpc from "@/client/orpc";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChangePhoneScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"enter" | "verify">("enter");

  const request = useMutation(
    orpc.auth.requestSMSCode.mutationOptions({
      onSuccess: () => setStep("verify"),
      onError: (e) => Alert.alert("Fehler", e.message),
    })
  );

  const verify = useMutation(
    orpc.auth.verifySMSCode.mutationOptions({
      onSuccess: () => {
        Alert.alert("Erfolg", "Telefonnummer aktualisiert.");
        router.back();
      },
      onError: (e) => Alert.alert("Fehler", e.message),
    })
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-6">
        <Text className="mb-2 text-2xl font-bold text-foreground">
          Telefonnummer ändern
        </Text>
        <Text className="mb-6 text-base text-muted-foreground">
          Gib deine neue Nummer ein und bestätige sie mit dem SMS-Code.
        </Text>

        {step === "enter" ? (
          <>
            <TextInput
              className="mb-4 rounded-xl border border-input bg-white px-4 py-3 text-foreground"
              placeholder="Neue Telefonnummer"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
            <Pressable
              className={`items-center rounded-xl bg-primary px-5 py-4 ${!phoneNumber ? "opacity-70" : ""}`}
              disabled={!phoneNumber || request.isPending}
              onPress={() => request.mutate({ phoneNumber })}
            >
              <Text className="text-base font-semibold text-primary-foreground">
                {request.isPending ? "Sende..." : "Code senden"}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="mb-2 text-foreground">
              Code an {phoneNumber} eingeben
            </Text>
            <TextInput
              className="mb-4 rounded-xl border border-input bg-white px-4 py-3 text-center text-foreground tracking-widest"
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
            <Pressable
              className={`items-center rounded-xl bg-primary px-5 py-4 ${code.length !== 6 ? "opacity-70" : ""}`}
              disabled={code.length !== 6 || verify.isPending}
              onPress={() => verify.mutate({ phoneNumber, code })}
            >
              <Text className="text-base font-semibold text-primary-foreground">
                {verify.isPending ? "Prüfe..." : "Bestätigen"}
              </Text>
            </Pressable>
          </>
        )}

        <Pressable
          className="mt-6 items-center rounded-xl bg-muted px-5 py-4"
          onPress={() => router.back()}
        >
          <Text className="text-base font-semibold text-foreground">
            Abbrechen
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
