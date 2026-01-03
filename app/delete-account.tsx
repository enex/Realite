import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useSession, useSignOut } from "@/client/auth";
import { orpc } from "@/client/orpc";
import { Icon } from "@/components/ui/icon";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { session } = useSession();
  const queryClient = useQueryClient();
  const signOut = useSignOut();

  const [confirmationText, setConfirmationText] = useState("");
  const [reason, setReason] = useState("");
  const requiredText = "LÖSCHEN";

  const deleteAccount = useMutation(
    orpc.user.deleteAccount.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        // Sign out and redirect to auth
        await signOut();
      },
      onError: (error: any) => {
        Alert.alert(
          "Fehler",
          "Account konnte nicht gelöscht werden. Bitte versuche es erneut."
        );
      },
    })
  );

  const canDelete = confirmationText === requiredText;

  const handleDelete = () => {
    if (!canDelete) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Account endgültig löschen?",
      "Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden unwiderruflich gelöscht.",
      [
        {
          text: "Abbrechen",
          style: "cancel",
        },
        {
          text: "Endgültig löschen",
          style: "destructive",
          onPress: () => {
            deleteAccount.mutate({ reason: reason.trim() || undefined });
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-100 dark:bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between border-b border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-4"
          style={{
            paddingTop: insets.top,
            paddingBottom: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <Icon
              name="chevron.left"
              size={20}
              color={isDark ? "#FFFFFF" : "#000000"}
            />
          </Pressable>
          <Text className="text-[17px] font-semibold text-black dark:text-white">
            Account löschen
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Warning Section */}
          <View className="bg-red-50 dark:bg-red-950/20 mx-4 mt-6 p-4 rounded-xl border border-red-200 dark:border-red-900/50">
            <View className="flex-row items-start mb-2">
              <Icon
                name="exclamationmark.triangle.fill"
                size={24}
                color="#DC2626"
              />
              <View className="flex-1 ml-3">
                <Text className="text-[17px] font-bold text-red-900 dark:text-red-200 mb-1">
                  Warnung
                </Text>
                <Text className="text-[15px] text-red-800 dark:text-red-300 leading-5">
                  Das Löschen deines Accounts ist eine irreversible Aktion. Alle
                  deine Daten, Pläne und Kontakte werden unwiderruflich
                  gelöscht.
                </Text>
              </View>
            </View>
          </View>

          {/* What will be deleted */}
          <View className="bg-white dark:bg-zinc-900 mx-4 mt-4 p-4 rounded-xl">
            <Text className="text-[17px] font-semibold text-black dark:text-white mb-3">
              Was wird gelöscht:
            </Text>
            <View className="gap-2">
              {[
                "Dein Profil und alle persönlichen Informationen",
                "Alle deine Pläne und Aktivitäten",
                "Deine Kontakte und Verbindungen",
                "Alle deine Einstellungen und Präferenzen",
              ].map((item, index) => (
                <View key={index} className="flex-row items-center">
                  <Icon
                    name="checkmark.circle.fill"
                    size={16}
                    color={isDark ? "#EF4444" : "#DC2626"}
                  />
                  <Text className="text-[15px] text-gray-700 dark:text-gray-300 ml-2">
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Reason (optional) */}
          <View className="bg-white dark:bg-zinc-900 mx-4 mt-4 p-4 rounded-xl">
            <Text className="text-[15px] font-medium text-black dark:text-white mb-2">
              Grund (optional)
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Warum möchtest du deinen Account löschen?"
              placeholderTextColor={
                isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"
              }
              multiline
              className="text-[15px] text-black dark:text-white bg-gray-50 dark:bg-zinc-800 rounded-lg px-3 py-2 min-h-[80px]"
              style={{ textAlignVertical: "top" }}
            />
          </View>

          {/* Confirmation */}
          <View className="bg-white dark:bg-zinc-900 mx-4 mt-4 p-4 rounded-xl">
            <Text className="text-[15px] font-medium text-black dark:text-white mb-2">
              Zur Bestätigung gib bitte{" "}
              <Text className="font-bold">{requiredText}</Text> ein:
            </Text>
            <TextInput
              value={confirmationText}
              onChangeText={setConfirmationText}
              placeholder={requiredText}
              placeholderTextColor={
                isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"
              }
              className="text-[15px] text-black dark:text-white bg-gray-50 dark:bg-zinc-800 rounded-lg px-3 py-3 font-semibold uppercase"
              autoCapitalize="characters"
            />
          </View>
        </ScrollView>

        {/* Delete Button */}
        <View
          className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-white/10 px-4 pt-3"
          style={{
            paddingBottom: insets.bottom + 12,
          }}
        >
          <Pressable
            onPress={handleDelete}
            disabled={!canDelete || deleteAccount.isPending}
            className={`w-full rounded-xl py-4 items-center justify-center ${
              canDelete
                ? "bg-red-500"
                : "bg-gray-300 dark:bg-zinc-700 opacity-50"
            }`}
          >
            {deleteAccount.isPending ? (
              <Text className="text-[17px] font-semibold text-white">
                Wird gelöscht...
              </Text>
            ) : (
              <Text className="text-[17px] font-semibold text-white">
                Account endgültig löschen
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
