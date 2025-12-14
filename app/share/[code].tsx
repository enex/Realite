import { orpc } from "@/client/orpc";
import { Avatar } from "@/components/Avatar";
import { PlanCard } from "@/components/PlanCard";
import { Icon } from "@/components/ui/Icon";
import type { ActivityId } from "@/shared/activities";
import { useQuery } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";

export default function ShareProfileScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = params.code as string;
  const colorScheme = useColorScheme();

  // Get link info to find the user ID
  const { data: linkInfo } = useQuery({
    ...orpc.user.getShareLinkInfo.queryOptions({ input: { code } }),
    enabled: Boolean(code),
  });

  const userId = linkInfo?.targetId;

  // Fetch user profile
  const { data: userProfile } = useQuery({
    ...orpc.user.get.queryOptions({ input: { id: userId || "" } }),
    enabled: Boolean(userId),
  });

  // Set OG meta tags for web preview
  useEffect(() => {
    if (
      Platform.OS === "web" &&
      typeof document !== "undefined" &&
      userProfile
    ) {
      const baseUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://realite.app";
      const ogImageUrl = `${baseUrl}/api/og/share/${code}`;

      // Update or create meta tags
      const updateMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
          meta = document.createElement("meta");
          meta.setAttribute("property", property);
          document.head.appendChild(meta);
        }
        meta.setAttribute("content", content);
      };

      updateMetaTag(
        "og:title",
        `${userProfile.name} - Meine Pläne auf Realite`
      );
      updateMetaTag(
        "og:description",
        `Sieh dir an, was ${userProfile.name} vorhat und mach mit!`
      );
      updateMetaTag("og:image", ogImageUrl);
      updateMetaTag("og:type", "website");
      updateMetaTag("og:url", `${baseUrl}/share/${code}`);

      // Twitter card
      updateMetaTag("twitter:card", "summary_large_image");
      updateMetaTag(
        "twitter:title",
        `${userProfile.name} - Meine Pläne auf Realite`
      );
      updateMetaTag(
        "twitter:description",
        `Sieh dir an, was ${userProfile.name} vorhat und mach mit!`
      );
      updateMetaTag("twitter:image", ogImageUrl);

      // Update page title
      document.title = `${userProfile.name} - Meine Pläne auf Realite`;
    }
  }, [userProfile, code]);

  // Fetch user's upcoming plans
  const { data: futurePlans } = useQuery({
    ...orpc.plan.getUserPlans.queryOptions({
      input: {
        userId: userId || "",
        includePast: false,
        startDate: startOfDay(new Date()),
      },
    }),
    enabled: Boolean(userId),
  });

  // Format plans for PlanCard
  const formattedPlans = useMemo(() => {
    if (!futurePlans) return [];
    return (futurePlans as any[]).map((plan: any) => ({
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
  }, [futurePlans]);

  const openInApp = () => {
    if (!userId) return;
    const appUrl = `realite://user/${userId}`;
    const webUrl = `https://realite.app/user/${userId}`;

    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.location.href = webUrl;
      }
    } else {
      Linking.openURL(appUrl).catch(() => {
        Linking.openURL(webUrl);
      });
    }
  };

  if (!linkInfo || !userProfile) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-gray-600 dark:text-gray-400">
          {!linkInfo ? "Link wird geladen..." : "Profil wird geladen..."}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100 dark:bg-black">
      <ScrollView
        className="flex-1"
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
          <Text className="text-[15px] text-gray-600 dark:text-gray-400 mb-6">
            {formattedPlans.length}{" "}
            {formattedPlans.length === 1 ? "Plan" : "Pläne"} geplant
          </Text>

          <Pressable
            onPress={openInApp}
            className="flex-row items-center justify-center py-3 px-6 rounded-xl bg-blue-500"
          >
            <Icon name="arrow.right.circle.fill" size={20} color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white ml-2">
              In App öffnen
            </Text>
          </Pressable>
        </View>

        {/* Plans Section */}
        {formattedPlans.length > 0 && (
          <View className="mt-4">
            <View className="bg-white dark:bg-zinc-900 px-6 py-4 border-b border-gray-200 dark:border-white/10">
              <Text className="text-[20px] font-bold text-black dark:text-white">
                Kommende Pläne
              </Text>
            </View>
            <View className="bg-white dark:bg-zinc-900 p-4">
              {formattedPlans.map((plan, index) => (
                <Pressable
                  key={plan.id}
                  onPress={() => {
                    const appUrl = `realite://plan/${plan.id}`;
                    const webUrl = `https://realite.app/plan/${plan.id}`;
                    if (Platform.OS === "web") {
                      if (typeof window !== "undefined") {
                        window.location.href = webUrl;
                      }
                    } else {
                      Linking.openURL(appUrl).catch(() => {
                        Linking.openURL(webUrl);
                      });
                    }
                  }}
                >
                  <PlanCard item={plan} index={index} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {formattedPlans.length === 0 && (
          <View className="bg-white dark:bg-zinc-900 px-6 py-12 items-center">
            <Text className="text-[15px] text-gray-500 dark:text-gray-400">
              Noch keine zukünftigen Pläne
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
