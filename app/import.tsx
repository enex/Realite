import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform, View } from "react-native";

import { Text } from "@/components/ui/text";

export default function ImportShareRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const didRedirectRef = useRef(false);

  useEffect(() => {
    if (didRedirectRef.current) return;
    didRedirectRef.current = true;

    const urlRaw = params?.url;
    const textRaw = params?.text;
    const sourceRaw = params?.source;
    const metaTitleRaw = params?.metaTitle;
    const metaDescriptionRaw = params?.metaDescription;

    const url = Array.isArray(urlRaw) ? urlRaw[0] : urlRaw;
    const text = Array.isArray(textRaw) ? textRaw[0] : textRaw;
    const source = Array.isArray(sourceRaw) ? sourceRaw[0] : sourceRaw;
    const metaTitle = Array.isArray(metaTitleRaw)
      ? metaTitleRaw[0]
      : metaTitleRaw;
    const metaDescription = Array.isArray(metaDescriptionRaw)
      ? metaDescriptionRaw[0]
      : metaDescriptionRaw;

    const query = new URLSearchParams();
    if (typeof url === "string" && url.trim()) query.set("url", url);
    if (typeof text === "string" && text.trim()) query.set("text", text);
    if (typeof source === "string" && source.trim())
      query.set("source", source);
    if (typeof metaTitle === "string" && metaTitle.trim())
      query.set("metaTitle", metaTitle);
    if (typeof metaDescription === "string" && metaDescription.trim())
      query.set("metaDescription", metaDescription);

    const path = `/(modals)/import-share?${query.toString()}`;
    if (Platform.OS !== "web") {
      router.replace("/(tabs)" as any);
      setTimeout(() => router.push(path as any), 0);
      return;
    }
    router.replace(path as any);
  }, [params, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-950 px-6">
      <Text className="text-zinc-900 dark:text-zinc-50 font-semibold text-base">
        Import wird vorbereitet…
      </Text>
    </View>
  );
}
