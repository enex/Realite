import orpc from "@/client/orpc";
import { PlansCarousel } from "@/components/plans-carousel";
import { Button } from "@/components/ui/button";
import Page from "@/components/ui/page";
import { Text } from "@/components/ui/text";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/*
This screen should answer the following questions:
- What are the next or current plans of the signed in user?
- What can I do today?
*/

export default function Index() {
  const result = useQuery(orpc.plan.overview.queryOptions());
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleAddPlan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/plan/new/ai");
  };

  return (
    <Page
      refreshControl={
        <RefreshControl
          refreshing={result.isFetching}
          onRefresh={result.refetch}
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: 16,
        paddingHorizontal: 0,
        paddingTop: insets.top + 16,
      }}
      rightButton={
        <Button
          onPress={handleAddPlan}
          icon={Plus}
          variant="default"
          size="icon"
        />
      }
    >
      <View className="px-4 flex gap-2">
        <Text variant="heading">Hi {result.data?.user?.name ?? "there"}</Text>
        <Text variant="subtitle">Was hast du vor?</Text>
      </View>
      <PlansCarousel plans={[]} />
      <View className="px-4">
        <Text>Next or current plan of the signed in user</Text>
      </View>
    </Page>
  );
}
