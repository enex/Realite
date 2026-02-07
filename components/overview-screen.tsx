import api from "@/client/orpc";
import { Avatar } from "@/components/avatar";
import { NativeFAB } from "@/components/native-fab";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useColor } from "@/hooks/use-color";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  type Plan,
  getSelectedLocationOption,
  getSelectedTimeOption,
} from "@/lib/core";
import { formatLocalDateTime, formatLocalTime } from "@/shared/utils/datetime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  CalendarClock,
  CalendarPlus2,
  Check,
  Compass,
  MapPin,
  Sparkles,
  XCircle,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import AppScreen, { AppScreenScrollableContent } from "./ui/app-screen";
import { Button } from "./ui/button";

type OverviewPlan = {
  id: string;
  title?: string | null;
  activity?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  location?: {
    title?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  similarOverlappingPlans?: { id: string; creatorId?: string | null }[];
};

type ExchangeSuggestion = {
  id: string;
  title?: string;
  fromUserId: string;
  fromUser?: { id: string; name: string; image?: string | null } | null;
  predictedPlan?: Plan;
  predictedCertainty?: number;
  predictedSpecificity?: number;
  predictedSpecificityNormalized?: number;
  readinessScore?: number;
  matchingMineCount?: number;
  isLikely?: boolean;
};

const DISMISS_REASONS = [
  { code: "no-time", label: "Keine Zeit", message: "Ich habe aktuell keine Zeit." },
  { code: "too-vague", label: "Zu unklar", message: "Der Vorschlag ist mir noch zu unklar." },
  { code: "too-far", label: "Zu weit weg", message: "Der Ort ist für mich zu weit weg." },
  {
    code: "not-interesting",
    label: "Nicht mein Ding",
    message: "Die Aktivität passt gerade nicht zu mir.",
  },
  { code: "later", label: "Später", message: "Später gerne, aktuell passt es nicht." },
] as const;

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatWindow(
  startInput: string | Date | null | undefined,
  endInput: string | Date | null | undefined,
): string {
  const start = toDate(startInput);
  const end = toDate(endInput);
  if (!start) return "Zeit noch offen";

  const startLabel = formatLocalDateTime(start, {
    includeTime: true,
    dateOptions: { weekday: "short", day: "2-digit", month: "short" },
  });

  if (!end) return startLabel;
  if (sameDay(start, end)) return `${startLabel} - ${formatLocalTime(end)}`;

  const endLabel = formatLocalDateTime(end, {
    includeTime: true,
    dateOptions: { weekday: "short", day: "2-digit", month: "short" },
  });
  return `${startLabel} -> ${endLabel}`;
}

function firstName(name: string | undefined | null): string {
  const value = String(name ?? "").trim();
  if (!value) return "jemandem";
  return value.split(/\s+/)[0] ?? value;
}

function getSuggestionTimeLabel(plan: Plan | undefined): string | null {
  if (!plan) return null;
  const selected = getSelectedTimeOption(plan);
  const start = selected?.start ?? plan.when?.start;
  const end = selected?.end ?? plan.when?.end;
  if (!start) return null;
  return formatWindow(start, end);
}

function getSuggestionLocationLabel(plan: Plan | undefined): string | null {
  if (!plan) return null;
  const selected = getSelectedLocationOption(plan);
  if (!selected) return null;
  return selected.name ?? selected.address ?? null;
}

function getSuggestionTitle(suggestion: ExchangeSuggestion): string {
  const fromPlan = suggestion.predictedPlan?.what?.title?.trim();
  if (fromPlan) return fromPlan;
  const fromActivity = suggestion.predictedPlan?.what?.activity?.trim();
  if (fromActivity) return fromActivity;
  const fromCategory = suggestion.predictedPlan?.what?.category?.trim();
  if (fromCategory) return fromCategory;
  const fallback = suggestion.title?.trim();
  if (fallback) return fallback;
  return "Gemeinsamer Plan";
}

function specificityLabel(specificity: number | undefined): string {
  const value = specificity ?? 0;
  if (value >= 10) return "sehr konkret";
  if (value >= 7) return "konkret";
  if (value >= 4) return "teilweise konkret";
  return "noch offen";
}

function buildSpecificPrompt(suggestion: ExchangeSuggestion): string {
  const title = getSuggestionTitle(suggestion);
  const partner = firstName(suggestion.fromUser?.name);
  const when = getSuggestionTimeLabel(suggestion.predictedPlan);
  const where = getSuggestionLocationLabel(suggestion.predictedPlan);

  const parts = [`Ich möchte mit ${partner} konkret planen: ${title}.`];
  if (when) parts.push(`Zeitvorschlag: ${when}.`);
  if (where) parts.push(`Ortvorschlag: ${where}.`);
  parts.push(
    "Bitte mache daraus einen konkreten Plan mit genauer Zeit, Ort und kurzer Beschreibung.",
  );

  return parts.join(" ");
}

function normalizeCertainty(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function isLikely(value: number | undefined): boolean {
  return normalizeCertainty(value) >= 0.65;
}

function MetricPill({
  label,
  value,
  dark,
}: {
  label: string;
  value: string;
  dark: boolean;
}) {
  return (
    <View
      style={[
        styles.metricPill,
        { backgroundColor: dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.75)" },
      ]}
    >
      <Text
        style={{
          fontSize: 12,
          opacity: 0.75,
          color: dark ? "#F8FAFC" : "#111827",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: dark ? "#FFFFFF" : "#0F172A",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function OverviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textMuted = useColor("textMuted");

  const overview = useQuery(api.plan.overview.queryOptions());

  const [dismissOpenForId, setDismissOpenForId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const respondExchange = useMutation(
    api.plan.exchangeRespond.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: api.plan.overview.key(),
        } as any);
      },
      onError: (error) => {
        console.error(error);
        Alert.alert("Fehler", error.message);
      },
    }),
  );

  const plans = useMemo(() => {
    const raw = overview.data?.plans;
    if (!Array.isArray(raw)) return [] as OverviewPlan[];
    return raw as OverviewPlan[];
  }, [overview.data?.plans]);

  const suggestions = useMemo(() => {
    const raw = overview.data?.planSuggestions;
    if (!Array.isArray(raw)) return [] as ExchangeSuggestion[];

    return (raw as ExchangeSuggestion[])
      .slice()
      .sort((a, b) => (b.readinessScore ?? 0) - (a.readinessScore ?? 0));
  }, [overview.data?.planSuggestions]);

  const upcomingPlans = useMemo(() => {
    const now = new Date();
    return plans
      .filter((plan) => {
        const start = toDate(plan.startDate);
        if (!start) return false;
        return start.getTime() >= now.getTime();
      })
      .sort((a, b) => {
        const aDate = toDate(a.startDate);
        const bDate = toDate(b.startDate);
        if (!aDate || !bDate) return 0;
        return aDate.getTime() - bDate.getTime();
      });
  }, [plans]);

  const likelySuggestions = useMemo(
    () => suggestions.filter((s) => s.isLikely ?? isLikely(s.predictedCertainty)),
    [suggestions],
  );
  const suggestionsForLanding = likelySuggestions.length > 0 ? likelySuggestions : suggestions;

  const thisWeekPlanCount = useMemo(() => {
    const now = new Date();
    const inSevenDays = now.getTime() + 7 * 24 * 60 * 60 * 1000;
    return upcomingPlans.filter((plan) => {
      const start = toDate(plan.startDate);
      if (!start) return false;
      return start.getTime() <= inSevenDays;
    }).length;
  }, [upcomingPlans]);

  const nextPlan = (overview.data?.nextPlan as OverviewPlan | null) ?? upcomingPlans[0] ?? null;

  const quickActionsText =
    suggestions.length > 0
      ? "Wir haben konkrete Vorschläge für dich vorbereitet."
      : "Erstelle einen Plan und wir finden passende Menschen dazu.";

  const openPlan = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/plan/${id}` as any);
  };

  const createPlan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/plan/new/ai" as any);
  };

  const openExplore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/explore" as any);
  };

  const respond = (
    suggestionId: string,
    status: "accepted" | "declined",
    message?: string,
  ) => {
    setRespondingId(suggestionId);
    respondExchange.mutate(
      {
        id: suggestionId,
        status,
        message,
      },
      {
        onSettled: () => {
          setRespondingId((current) => (current === suggestionId ? null : current));
        },
      } as any,
    );
  };

  const acceptSuggestion = (suggestion: ExchangeSuggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    respond(suggestion.id, "accepted", "Klingt gut, ich bin dabei.");
  };

  const dismissSuggestion = (
    suggestion: ExchangeSuggestion,
    reason: (typeof DISMISS_REASONS)[number],
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissOpenForId(null);
    respond(suggestion.id, "declined", `[${reason.code}] ${reason.message}`);
  };

  const makeSpecific = (suggestion: ExchangeSuggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(
      {
        pathname: "/plan/new/ai",
        params: {
          initialText: buildSpecificPrompt(suggestion),
        },
      } as any,
    );
  };

  return (
    <AppScreen>
      <AppScreenScrollableContent
        noHorizontalPadding
        withTopInset={false}
        refreshControl={
          <RefreshControl refreshing={overview.isFetching} onRefresh={overview.refetch} />
        }
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.container}>
          <View style={styles.heroWrapper}>
            <LinearGradient
              colors={
                isDark
                  ? ["#0B1220", "#1E293B", "#064E3B"]
                  : ["#EEF4FF", "#E6F7FF", "#E9FBEF"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <Text style={[styles.heroKicker, { color: isDark ? "#D1FAE5" : "#0F766E" }]}>STARTSEITE</Text>
              <Text style={[styles.heroTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Heute konkret planen</Text>
              <Text style={[styles.heroSubtitle, { color: isDark ? "#DBEAFE" : "#1F2937" }]}>Hi {overview.data?.user?.name ?? "du"}. {quickActionsText}</Text>

              <View style={styles.metricRow}>
                <MetricPill label="Diese Woche" value={String(thisWeekPlanCount)} dark={isDark} />
                <MetricPill label="Nicht verpassen" value={String(likelySuggestions.length)} dark={isDark} />
              </View>

              <View style={styles.heroActions}>
                <Button style={{ flex: 1 }} onPress={createPlan} icon={CalendarPlus2}>
                  Plan erstellen
                </Button>
                <Button style={{ flex: 1 }} onPress={openExplore} variant="outline" icon={Compass}>
                  Entdecken
                </Button>
              </View>
            </LinearGradient>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>Als Nächstes</CardTitle>
              {nextPlan ? (
                <>
                  <Text style={{ color: textMuted }}>
                    {formatWindow(nextPlan.startDate, nextPlan.endDate)}
                  </Text>
                  <Text style={styles.nextPlanTitle}>{nextPlan.title || "Plan ohne Titel"}</Text>
                  {(nextPlan.location?.title || nextPlan.location?.address) && (
                    <View style={styles.metaRow}>
                      <MapPin size={14} color={textMuted} />
                      <Text style={{ color: textMuted }}>
                        {nextPlan.location?.title ?? nextPlan.location?.address}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={{ color: textMuted }}>
                  Noch kein nächster Plan. Starte jetzt einen konkreten Vorschlag.
                </Text>
              )}
            </CardHeader>
            <CardFooter>
              {nextPlan ? (
                <Button variant="outline" onPress={() => openPlan(nextPlan.id)} icon={CalendarClock}>
                  Plan öffnen
                </Button>
              ) : (
                <Button onPress={createPlan} icon={Sparkles}>
                  Ersten Plan erstellen
                </Button>
              )}
            </CardFooter>
          </Card>

          <View style={styles.sectionHeaderRow}>
            <Text variant="subtitle">Nicht verpassen</Text>
            <Text style={{ color: textMuted }}>
              {likelySuggestions.length > 0
                ? `${likelySuggestions.length} Vorschläge mit hoher Wahrscheinlichkeit`
                : "Keine dringenden Vorschläge"}
            </Text>
          </View>

          {suggestionsForLanding.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Noch keine Vorschläge</CardTitle>
                <Text style={{ color: textMuted }}>
                  Sobald jemand einen passenden Plan teilt, kannst du hier direkt zusagen,
                  konkretisieren oder mit Grund ablehnen.
                </Text>
              </CardHeader>
            </Card>
          ) : (
            suggestionsForLanding.map((suggestion) => {
              const certainty = normalizeCertainty(suggestion.predictedCertainty);
              const certaintyPercent = Math.round(certainty * 100);
              const title = getSuggestionTitle(suggestion);
              const whenLabel = getSuggestionTimeLabel(suggestion.predictedPlan);
              const whereLabel = getSuggestionLocationLabel(suggestion.predictedPlan);
              const specificLabel = specificityLabel(suggestion.predictedSpecificity);
              const fromUser = suggestion.fromUser;
              const busy = respondingId === suggestion.id;
              const reasonVisible = dismissOpenForId === suggestion.id;

              return (
                <Card key={suggestion.id}>
                  <CardHeader>
                    <View style={styles.rowBetween}>
                      <View style={styles.creatorRow}>
                        <Avatar
                          name={fromUser?.name || "Kontakt"}
                          image={fromUser?.image || undefined}
                          size={34}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.creatorLabel}>
                            {fromUser?.name ? `Von ${fromUser.name}` : "Vorschlag aus deinem Netzwerk"}
                          </Text>
                          <Text style={{ color: textMuted, fontSize: 12 }}>
                            {suggestion.matchingMineCount
                              ? `${suggestion.matchingMineCount} deiner Pläne passen dazu`
                              : "Neu für dich"}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.certaintyBadge,
                          {
                            backgroundColor:
                              certainty >= 0.75
                                ? isDark
                                  ? "rgba(16,185,129,0.25)"
                                  : "rgba(16,185,129,0.14)"
                                : isDark
                                  ? "rgba(59,130,246,0.25)"
                                  : "rgba(59,130,246,0.14)",
                          },
                        ]}
                      >
                        <Text style={styles.certaintyBadgeText}>{certaintyPercent}%</Text>
                      </View>
                    </View>

                    <CardTitle style={{ marginTop: 8 }}>{title}</CardTitle>

                    <View style={styles.detailsWrap}>
                      {whenLabel ? (
                        <View style={styles.metaRow}>
                          <CalendarClock size={14} color={textMuted} />
                          <Text style={{ color: textMuted }}>{whenLabel}</Text>
                        </View>
                      ) : null}

                      {whereLabel ? (
                        <View style={styles.metaRow}>
                          <MapPin size={14} color={textMuted} />
                          <Text style={{ color: textMuted }}>{whereLabel}</Text>
                        </View>
                      ) : null}

                      <Text style={{ color: textMuted }}>Spezifität: {specificLabel}</Text>
                    </View>
                  </CardHeader>

                  <CardFooter style={styles.cardActions}>
                    <View style={styles.actionRow}>
                      <Button
                        style={{ flex: 1 }}
                        onPress={() => makeSpecific(suggestion)}
                        icon={Sparkles}
                        disabled={busy}
                      >
                        Konkretisieren
                      </Button>
                      <Button
                        style={{ flex: 1 }}
                        onPress={() => acceptSuggestion(suggestion)}
                        icon={Check}
                        variant="outline"
                        disabled={busy}
                      >
                        Bin dabei
                      </Button>
                    </View>

                    <Button
                      variant="ghost"
                      onPress={() =>
                        setDismissOpenForId((current) =>
                          current === suggestion.id ? null : suggestion.id,
                        )
                      }
                      icon={XCircle}
                      disabled={busy}
                    >
                      Nicht passend
                    </Button>

                    {reasonVisible ? (
                      <View style={styles.reasonWrap}>
                        {DISMISS_REASONS.map((reason) => (
                          <Button
                            key={`${suggestion.id}-${reason.code}`}
                            size="sm"
                            variant="outline"
                            onPress={() => dismissSuggestion(suggestion, reason)}
                            disabled={busy}
                            style={styles.reasonButton}
                          >
                            {reason.label}
                          </Button>
                        ))}
                      </View>
                    ) : null}
                  </CardFooter>
                </Card>
              );
            })
          )}

          <View style={styles.sectionHeaderRow}>
            <Text variant="subtitle">Demnächst</Text>
            <Text style={{ color: textMuted }}>
              {upcomingPlans.length > 0
                ? `${upcomingPlans.length} geplante Aktivitäten`
                : "Noch nichts im Kalender"}
            </Text>
          </View>

          <Card>
            <CardHeader>
              {upcomingPlans.length === 0 ? (
                <Text style={{ color: textMuted }}>
                  Wenn du jetzt planst, zeigen wir dir hier alles, was du sicher machst und
                  was du sonst verpassen würdest.
                </Text>
              ) : (
                <View style={styles.upcomingList}>
                  {upcomingPlans.slice(0, 5).map((plan) => {
                    const overlapCount = plan.similarOverlappingPlans?.length ?? 0;
                    return (
                      <Pressable
                        key={plan.id}
                        onPress={() => openPlan(plan.id)}
                        style={styles.upcomingItem}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.upcomingTitle}>{plan.title || "Plan ohne Titel"}</Text>
                          <Text style={{ color: textMuted, marginTop: 2 }}>
                            {formatWindow(plan.startDate, plan.endDate)}
                          </Text>
                          {(plan.location?.title || plan.location?.address) && (
                            <Text style={{ color: textMuted, marginTop: 2 }}>
                              {plan.location?.title ?? plan.location?.address}
                            </Text>
                          )}
                        </View>
                        <View style={styles.upcomingSide}>
                          {overlapCount > 0 ? (
                            <Text style={styles.overlapLabel}>{overlapCount} parallel</Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </CardHeader>
          </Card>
        </View>
      </AppScreenScrollableContent>
      <NativeFAB onPress={createPlan} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingTop: 8,
    paddingBottom: 130,
  },
  container: {
    paddingHorizontal: 16,
    gap: 14,
  },
  heroWrapper: {
    borderRadius: 24,
    overflow: "hidden",
  },
  heroGradient: {
    padding: 20,
  },
  heroKicker: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    marginTop: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  metricPill: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  creatorLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  certaintyBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  certaintyBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  detailsWrap: {
    marginTop: 8,
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardActions: {
    marginTop: 8,
    flexDirection: "column",
    gap: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  reasonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reasonButton: {
    height: 36,
    paddingHorizontal: 12,
  },
  nextPlanTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 6,
  },
  upcomingList: {
    gap: 8,
  },
  upcomingItem: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  upcomingSide: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  overlapLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0EA5E9",
  },
});
