import orpc from "@/client/orpc";
import { PlansCarousel } from "@/components/plans-carousel";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Page from "@/components/ui/page";
import { Text } from "@/components/ui/text";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import React, { useMemo } from "react";
import { Alert, RefreshControl, View } from "react-native";
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
  const queryClient = useQueryClient();

  const sendIntentRequest = useMutation(
    orpc.intent.sendRequest.mutationOptions({
      onSuccess: () => {
        Alert.alert("Gesendet", "Deine Anfrage wurde gesendet.");
      },
      onError: (error) => {
        console.error(error);
        Alert.alert("Fehler", error.message);
      },
    })
  );

  const respondIntentRequest = useMutation(
    orpc.intent.respondRequest.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.plan.overview.key(),
        } as any);
      },
      onError: (error) => {
        console.error(error);
        Alert.alert("Fehler", error.message);
      },
    })
  );

  const nextPlan = result.data?.nextPlan as any;
  const intentRequests = (result.data?.intentRequests ?? []) as any[];

  const nextPlanLabel = useMemo(() => {
    if (!nextPlan?.startDate) return "";
    const d = new Date(nextPlan.startDate);
    return d.toLocaleString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [nextPlan?.startDate]);

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

      <View className="px-4 mt-4 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Entdecken</CardTitle>
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              Finde Pläne & Ideen in deiner Nähe – oder erstelle selbst einen.
            </Text>
          </CardHeader>
          <CardFooter>
            <Button variant="default" onPress={handleAddPlan}>
              Plan erstellen
            </Button>
            <View style={{ flex: 1 }} />
            <Button
              variant="outline"
              onPress={() => router.push("/explore" as any)}
            >
              Entdecken
            </Button>
          </CardFooter>
        </Card>

        {nextPlan ? (
          <Card>
            <CardHeader>
              <CardTitle>Nächster Plan</CardTitle>
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                {nextPlanLabel}
                {nextPlan?.title ? ` · ${nextPlan.title}` : ""}
              </Text>
              {nextPlan?.location?.title ? (
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  {nextPlan.location.title}
                </Text>
              ) : null}
            </CardHeader>
            <CardFooter>
              <Button
                variant="outline"
                onPress={() => router.push(`/plan/${nextPlan.id}` as any)}
              >
                Öffnen
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {intentRequests.length > 0 ? (
          <>
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              Anfragen
            </Text>
            {intentRequests.map((r) => (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle>{r.title}</CardTitle>
                  <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                    {r.fromUser?.name ? `Von ${r.fromUser.name}` : "Neue Anfrage"}
                    {r.message ? ` · ${r.message}` : ""}
                  </Text>
                </CardHeader>
                <CardFooter>
                  <Button
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      respondIntentRequest.mutate({
                        requestId: r.id,
                        status: "accepted",
                      });
                      router.push(
                        {
                          pathname: "/plan/new/ai",
                          params: {
                            initialText: `Ich würde gerne ${r.title.toLowerCase()}. Wer ist dabei?`,
                          },
                        } as any
                      );
                    }}
                    variant="default"
                  >
                    Plan daraus
                  </Button>
                  <Button
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      respondIntentRequest.mutate({
                        requestId: r.id,
                        status: "counter",
                        message: "Ich schlage etwas anderes vor.",
                      });
                      router.push(
                        {
                          pathname: "/plan/new/ai",
                          params: {
                            initialText:
                              "Gegenvorschlag: Ich hätte Lust auf ...",
                          },
                        } as any
                      );
                    }}
                    variant="outline"
                  >
                    Gegenvorschlag
                  </Button>
                  <Button
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      respondIntentRequest.mutate({
                        requestId: r.id,
                        status: "declined",
                      });
                    }}
                    variant="ghost"
                  >
                    Ablehnen
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </>
        ) : null}

        {(result.data?.intentSuggestions?.length ?? 0) > 0 ? (
          <>
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              Vorschläge aus passenden Intentionen
            </Text>
            {result.data!.intentSuggestions.map((s) => (
              <Card key={`${s.activity}-${s.title}`}>
                <CardHeader>
                  <CardTitle>{s.title}</CardTitle>
                  <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                    {s.matchCount}{" "}
                    {s.matchCount === 1 ? "Person passt" : "Personen passen"}{" "}
                    dazu
                  </Text>
                </CardHeader>
                <CardFooter>
                  <Button
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(
                        {
                          pathname: "/plan/new/ai",
                          params: { initialText: s.initialText },
                        } as any
                      );
                    }}
                    variant="default"
                  >
                    Plan daraus machen
                  </Button>
                  {s.users?.[0]?.id ? (
                    <Button
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        sendIntentRequest.mutate({
                          toUserId: s.users[0].id,
                          activity: s.activity,
                          title: s.title,
                          message: "Hast du Lust, das zusammen zu machen?",
                        });
                      }}
                      variant="outline"
                    >
                      Anfragen
                    </Button>
                  ) : null}
                </CardFooter>
              </Card>
            ))}
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Mehr passende Vorschläge</CardTitle>
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                Hinterlege ein paar Intentionen, dann matchen wir dich direkt
                mit anderen.
              </Text>
            </CardHeader>
            <CardFooter>
              <Button
                variant="outline"
                onPress={() => router.push("/settings/intents" as any)}
              >
                Intentionen einstellen
              </Button>
            </CardFooter>
          </Card>
        )}
      </View>

      <View className="mt-6">
        <PlansCarousel plans={[]} />
      </View>
    </Page>
  );
}
