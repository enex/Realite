import * as Contacts from "expo-contacts";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { orpc } from "@/client/orpc";
import { Avatar } from "@/components/Avatar";
import { PlanCard } from "@/components/PlanCard";
import { Icon } from "@/components/ui/icon";
import useAllContacts from "@/hooks/useAllContacts";
import { getActivityGradient, type ActivityId } from "@/shared/activities";
import { standardizePhoneNumber } from "@/shared/validation/phone";
import { useQuery } from "@tanstack/react-query";
import { startOfDay, subDays } from "date-fns";
import {
  CalendarIcon,
  HeartIcon,
  MessageCircleIcon,
  UserCircleIcon,
  UserIcon,
  XIcon,
} from "lucide-react-native";

const GENDER_LABEL: Record<string, string> = {
  MALE: "Männlich",
  FEMALE: "Weiblich",
  NON_BINARY: "Nicht-binär",
  OTHER: "Andere",
  PREFER_NOT_TO_SAY: "Keine Angabe",
};

const REL_LABEL: Record<string, string> = {
  SINGLE: "Single",
  IN_RELATIONSHIP: "In Beziehung",
  MARRIED: "Verheiratet",
  PREFER_NOT_TO_SAY: "Keine Angabe",
  COMPLICATED: "Es ist kompliziert",
};

type PlanListItem = {
  id: string;
  title: string;
  date: string;
  status: "committed" | "pending";
  activity: ActivityId;
  locations?: {
    title: string;
    address?: string;
    latitude: number;
    longitude: number;
  }[];
};

export default function UserProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const userId = params.id as string;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [showPastPlans, setShowPastPlans] = useState(false);

  // Fetch user profile
  const { data: userProfile } = useQuery(
    orpc.user.get.queryOptions({ input: { id: userId } })
  );

  // Fetch user's plans
  const { data: futurePlans } = useQuery(
    orpc.plan.getUserPlans.queryOptions({
      input: {
        userId,
        includePast: false,
        startDate: startOfDay(new Date()),
      },
    })
  );

  const { data: pastPlans } = useQuery(
    orpc.plan.getUserPlans.queryOptions({
      input: {
        userId,
        includePast: true,
        startDate: subDays(startOfDay(new Date()), 90),
        endDate: startOfDay(new Date()),
      },
    })
  );

  // Get contact information if user is in contacts
  const allContacts = useAllContacts();

  // Find contact by matching name (simplified approach)
  // In a production app, you'd match by phoneNumberHash, but that requires
  // either exposing the hash in the profile or doing many queries
  const contact = useMemo(() => {
    if (!userProfile || !allContacts.data) return null;

    // Try to find contact by matching name
    const profileName = userProfile.name?.toLowerCase().trim();
    if (!profileName) return null;

    const matchingContact = allContacts.data.find((c) => {
      const contactName = c.name?.toLowerCase().trim();
      return contactName && contactName === profileName;
    });

    return matchingContact || null;
  }, [userProfile, allContacts.data]);

  // Format plans for PlanCard
  const formatPlans = (plans: any[]): PlanListItem[] => {
    if (!plans) return [];
    return plans
      .filter((plan: any) => {
        const planDate = new Date(plan.startDate);
        if (showPastPlans) {
          return planDate < new Date();
        }
        return planDate >= new Date();
      })
      .map((plan: any) => ({
        id: plan.id,
        title: plan.title || "",
        date: plan.startDate?.toISOString?.() ?? plan.startDate,
        status: "committed" as const,
        activity: plan.activity as ActivityId,
        locations:
          plan.locationTitle || plan.latitude || plan.longitude
            ? [
                {
                  title: plan.locationTitle || "",
                  address: plan.address || undefined,
                  latitude: Number(plan.latitude ?? 0),
                  longitude: Number(plan.longitude ?? 0),
                },
              ]
            : undefined,
      }));
  };

  const futurePlansList = useMemo(
    () => formatPlans(futurePlans as any[]),
    [futurePlans, showPastPlans]
  );
  const pastPlansList = useMemo(
    () => formatPlans(pastPlans as any[]),
    [pastPlans, showPastPlans]
  );

  const displayedPlans = showPastPlans ? pastPlansList : futurePlansList;

  // Get phone number from contact for WhatsApp
  const phoneNumber = useMemo(() => {
    if (!contact?.phoneNumbers || contact.phoneNumbers.length === 0)
      return null;
    return contact.phoneNumbers[0]?.number || null;
  }, [contact]);

  const openWhatsApp = () => {
    if (!phoneNumber) return;
    const standardized = standardizePhoneNumber(phoneNumber);
    const whatsappUrl = `https://wa.me/${standardized.replace(/[^0-9]/g, "")}`;
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert("Fehler", "WhatsApp konnte nicht geöffnet werden");
    });
  };

  const openContact = async () => {
    if (!contact?.id) return;
    try {
      if (Platform.OS === "ios") {
        await Contacts.presentFormAsync(contact.id, undefined, {
          allowsEditing: false,
          allowsActions: true,
        });
      } else {
        // Android: Open contact details
        const contactUri = `content://contacts/people/${contact.id}`;
        const canOpen = await Linking.canOpenURL(contactUri);
        if (canOpen) {
          await Linking.openURL(contactUri);
        } else {
          Alert.alert("Fehler", "Kontakt konnte nicht geöffnet werden");
        }
      }
    } catch (error) {
      console.error("Error opening contact:", error);
      Alert.alert("Fehler", "Kontakt konnte nicht geöffnet werden");
    }
  };

  // Calculate age if birthDate is available and public
  const age = useMemo(() => {
    if (!userProfile?.birthDate) return null;
    const birthDate = new Date(userProfile.birthDate);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }, [userProfile?.birthDate]);

  if (!userProfile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 dark:bg-black">
        <View className="p-6">
          <Text className="text-[15px] leading-5 text-gray-500 dark:text-gray-400">
            Profil nicht gefunden
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const activity = undefined as ActivityId | undefined;
  const [c1, c2, c3] = getActivityGradient(activity);
  const accentColor = c3 || "#007AFF";

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="pt-safe absolute top-0 left-0 right-0 flex-row items-center justify-between border-b border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3">
        <Pressable
          className="w-10 h-10 rounded-full items-center justify-center"
          onPress={() => router.back()}
        >
          <Icon name={XIcon} size={20} color={isDark ? "#FFFFFF" : "#000000"} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 pt-safe"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Profile Header */}
        <View className="bg-white dark:bg-zinc-900 px-6 py-8 items-center">
          <Avatar
            name={userProfile.name || ""}
            image={userProfile.image || null}
            size={100}
            className="mb-4"
          />
          <Text className="text-[28px] font-bold text-black dark:text-white mb-2">
            {userProfile.name}
          </Text>

          {/* Public Profile Info */}
          {/* Note: Privacy settings should be checked server-side */}
          <View className="w-full mt-4 gap-3">
            {userProfile.gender && (
              <View className="flex-row items-center justify-center">
                <Icon
                  name={UserIcon}
                  size={16}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
                <Text className="text-[15px] text-gray-600 dark:text-gray-400 ml-2">
                  {GENDER_LABEL[userProfile.gender] || userProfile.gender}
                </Text>
              </View>
            )}

            {age !== null && age > 0 && (
              <View className="flex-row items-center justify-center">
                <Icon
                  name={CalendarIcon}
                  size={16}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
                <Text className="text-[15px] text-gray-600 dark:text-gray-400 ml-2">
                  {age} Jahre alt
                </Text>
              </View>
            )}

            {userProfile.relationshipStatus &&
              userProfile.relationshipStatus !== "PREFER_NOT_TO_SAY" && (
                <View className="flex-row items-center justify-center">
                  <Icon
                    name={HeartIcon}
                    size={16}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                  />
                  <Text className="text-[15px] text-gray-600 dark:text-gray-400 ml-2">
                    {REL_LABEL[userProfile.relationshipStatus] ||
                      userProfile.relationshipStatus}
                  </Text>
                </View>
              )}
          </View>

          {/* Contact Actions */}
          {contact && (
            <View className="w-full mt-6 gap-2">
              {phoneNumber && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    openWhatsApp();
                  }}
                  className="flex-row items-center justify-center py-3 px-6 rounded-xl bg-green-500"
                >
                  <Icon name={MessageCircleIcon} size={20} color="#FFFFFF" />
                  <Text className="text-[15px] font-semibold text-white ml-2">
                    WhatsApp
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  openContact();
                }}
                className="flex-row items-center justify-center py-3 px-6 rounded-xl bg-gray-200 dark:bg-zinc-800"
              >
                <Icon
                  name={UserCircleIcon}
                  size={20}
                  color={isDark ? "#FFFFFF" : "#000000"}
                />
                <Text
                  className={`text-[15px] font-semibold ml-2 ${
                    isDark ? "text-white" : "text-black"
                  }`}
                >
                  Kontakt öffnen
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Plans Section */}
        <View className="mt-4">
          {/* Tabs */}
          <View className="flex-row bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-white/10">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowPastPlans(false);
              }}
              className="flex-1 py-4 items-center border-b-2"
              style={{
                borderBottomColor: !showPastPlans ? accentColor : "transparent",
              }}
            >
              <Text
                className="text-[15px] font-semibold"
                style={{
                  color: !showPastPlans
                    ? accentColor
                    : isDark
                      ? "#9CA3AF"
                      : "#6B7280",
                }}
              >
                Zukünftige Pläne ({futurePlansList.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowPastPlans(true);
              }}
              className="flex-1 py-4 items-center border-b-2"
              style={{
                borderBottomColor: showPastPlans ? accentColor : "transparent",
              }}
            >
              <Text
                className="text-[15px] font-semibold"
                style={{
                  color: showPastPlans
                    ? accentColor
                    : isDark
                      ? "#9CA3AF"
                      : "#6B7280",
                }}
              >
                Vergangene Pläne ({pastPlansList.length})
              </Text>
            </Pressable>
          </View>

          {/* Plans List */}
          {displayedPlans.length === 0 ? (
            <View className="bg-white dark:bg-zinc-900 px-6 py-12 items-center">
              <Text className="text-[15px] text-gray-500 dark:text-gray-400">
                {showPastPlans
                  ? "Keine vergangenen Pläne"
                  : "Keine zukünftigen Pläne"}
              </Text>
            </View>
          ) : (
            <View className="bg-white dark:bg-zinc-900 p-4">
              {displayedPlans.map((plan, index) => (
                <Pressable
                  key={plan.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/plan/${plan.id}` as any);
                  }}
                >
                  <PlanCard item={plan} index={index} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
