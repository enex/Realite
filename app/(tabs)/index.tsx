import orpc from "@/client/orpc";
import { Button } from "@/components/ui/button";
import Page from "@/components/ui/page";
import { Text } from "@/components/ui/text";
import { useQuery } from "@tanstack/react-query";
import { GlassContainer, GlassView } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { Image, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
      rightButton={
        <Button
          onPress={handleAddPlan}
          icon={Plus}
          variant="default"
          size="icon"
        />
      }
    >
      <Text variant="heading">Hi {result.data?.user?.name ?? "there"}</Text>
      <Text variant="subtitle">Was hast du vor?</Text>

      <Text>Next or current plan of the signed in user</Text>
      <GlassContainerDemo />
    </Page>
  );
}

function GlassContainerDemo() {
  return (
    <View style={styles.container}>
      <Image
        style={styles.backgroundImage}
        source={{
          uri: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop",
        }}
      />
      <GlassContainer spacing={10} style={styles.containerStyle}>
        <GlassView style={styles.glass1} isInteractive />
        <GlassView style={styles.glass2} />
        <GlassView style={styles.glass3} />
      </GlassContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  containerStyle: {
    position: "absolute",
    top: 200,
    left: 50,
    width: 250,
    height: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  glass1: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  glass2: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  glass3: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
