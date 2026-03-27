"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/src/components/app-shell";
import { FlowCard } from "@/src/components/flow-card";
import { toast, REVALIDATING_TOAST_ID } from "@/src/components/toaster";
import { UserAvatar } from "@/src/components/user-avatar";
import { getSuggestionNextAction, getSuggestionStatusMeta } from "@/src/lib/activity-patterns";
import { getCardSurfaceMeta } from "@/src/lib/card-system";
import { getPersonDisplayLabel } from "@/src/lib/person-display";
import { captureProductEvent } from "@/src/lib/posthog/capture";
import { DASHBOARD_QUERY_KEY, fetchDashboard } from "@/src/lib/dashboard-query";
import {
  getPageIntentMeta,
  pageLeadClassName,
  pageMetaClassName,
  pageShellClassName,
  pageTitleClassName,
  sectionBodyClassName,
  sectionTitleClassName,
  statLabelClassName,
  statValueClassName,
} from "@/src/lib/page-hierarchy";
import { shortenUUID } from "@/src/lib/utils/short-uuid";

type Suggestion = {
  id: string;
  eventId: string;
  status: "pending" | "calendar_inserted" | "accepted" | "declined";
  calendarEventId: string | null;
  score: number;
  reason: string;
  title: string;
  startsAt: string;
  endsAt: string;
  tags: string[];
  createdBy: string;
  createdByName: string | null;
  createdByEmail: string;
  color: string | null;
};

type AcceptedUser = { name: string | null; email: string };

type SuggestionsPayload = {
  me: {
    email: string;
    name: string | null;
    image: string | null;
  };
  sync: {
    warning: string | null;
    revalidating: boolean;
  };
  suggestions: Suggestion[];
  acceptedByEventId?: Record<string, AcceptedUser[]>;
};

type SuggestionDayGroup = {
  dayKey: string;
  dayLabel: string;
  items: Suggestion[];
};

const emptyPayload: SuggestionsPayload = {
  me: {
    email: "",
    name: null,
    image: null
  },
  sync: {
    warning: null,
    revalidating: false
  },
  suggestions: []
};

export function SuggestionsPage({
  userName,
  userEmail,
  userImage
}: {
  userName: string;
  userEmail: string;
  userImage: string | null;
}) {
  const suggestionCard = getCardSurfaceMeta("suggestion");
  const activityCard = getCardSurfaceMeta("activity");
  const reactionPage = getPageIntentMeta("react");
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {
    data: queryData,
    isPending: loading,
    error: queryError
  } = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: () => fetchDashboard() as Promise<SuggestionsPayload>,
    refetchInterval: (query) => (query.state.data?.sync?.revalidating ? 2_500 : 45_000)
  });
  const data = queryData ?? emptyPayload;

  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autoDecisionHandled, setAutoDecisionHandled] = useState(false);

  const actionableSuggestions = useMemo(
    () =>
      [...data.suggestions]
        .filter((suggestion) => suggestion.status === "pending" || suggestion.status === "calendar_inserted")
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() || b.score - a.score),
    [data.suggestions]
  );
  const historySuggestionsByDay = useMemo(
    () =>
      groupSuggestionsByDay(
        data.suggestions.filter((suggestion) => suggestion.status === "accepted" || suggestion.status === "declined")
      ),
    [data.suggestions]
  );
  const acceptedCount = useMemo(
    () => data.suggestions.filter((suggestion) => suggestion.status === "accepted").length,
    [data.suggestions]
  );
  const declinedCount = useMemo(
    () => data.suggestions.filter((suggestion) => suggestion.status === "declined").length,
    [data.suggestions]
  );

  const selectedSuggestionId = searchParams.get("suggestion");
  const decisionFromQuery = searchParams.get("decision");
  const queryDecision = decisionFromQuery === "accepted" || decisionFromQuery === "declined" ? decisionFromQuery : null;

  const profileName = data.me.name ?? userName;
  const profileEmail = data.me.email || userEmail;
  const profileImage = data.me.image ?? userImage;

  useEffect(() => {
    if (!data.sync.revalidating) {
      toast.dismiss(REVALIDATING_TOAST_ID);
      return;
    }
    toast.loading("Aktualisierung im Hintergrund läuft. Neue Vorschläge erscheinen automatisch.", {
      id: REVALIDATING_TOAST_ID,
      duration: Number.POSITIVE_INFINITY
    });
    return () => {
      toast.dismiss(REVALIDATING_TOAST_ID);
    };
  }, [data.sync.revalidating]);

  useEffect(() => {
    if (!selectedSuggestionId) {
      return;
    }

    const element = document.getElementById(`suggestion-${selectedSuggestionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedSuggestionId, data.suggestions]);

  useEffect(() => {
    setAutoDecisionHandled(false);
  }, [selectedSuggestionId, queryDecision]);

  async function runSuggestions() {
    setBusy(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/suggestions/run", { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Matching fehlgeschlagen");
      }

      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    } catch (runError) {
      setSubmitError(runError instanceof Error ? runError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function decideSuggestion(
    suggestionId: string,
    decision: "accepted" | "declined",
    source: "suggestions_page" | "query_auto" = "suggestions_page"
  ) {
    setBusy(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Feedback konnte nicht gespeichert werden");
      }

      if (decision === "accepted") {
        captureProductEvent("suggestion_accepted", {
          suggestion_id: suggestionId,
          source
        });
      }

      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    } catch (decisionError) {
      setSubmitError(decisionError instanceof Error ? decisionError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!selectedSuggestionId || !queryDecision || autoDecisionHandled || loading || busy) {
      return;
    }

    const suggestionExists = data.suggestions.some((suggestion) => suggestion.id === selectedSuggestionId);
    if (!suggestionExists) {
      return;
    }

    setAutoDecisionHandled(true);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("decision");
    const nextQuery = nextParams.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextUrl);

    void decideSuggestion(selectedSuggestionId, queryDecision, "query_auto");
  }, [autoDecisionHandled, busy, data.suggestions, loading, queryDecision, searchParams, selectedSuggestionId]);

  return (
    <AppShell
      user={{
        name: profileName,
        email: profileEmail,
        image: profileImage
      }}
    >
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className={pageShellClassName}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <UserAvatar name={profileName} email={profileEmail} image={profileImage} size="lg" />
              <div>
                <p className={reactionPage.eyebrowClassName}>Reagieren</p>
                <h1 className={pageTitleClassName}>Reagiere auf passende Aktivitäten</h1>
                <p className={pageMetaClassName}>{profileEmail}</p>
                <p className={pageLeadClassName}>
                  Offene Vorschläge stehen oben. Bereits entschiedene Vorschläge bleiben darunter als Verlauf sichtbar.
                </p>
              </div>
            </div>
            <button
              onClick={runSuggestions}
              disabled={busy}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Matching aktualisieren
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryCard
              tone="amber"
              label="Handlungsbedarf"
              value={actionableSuggestions.length}
              description={
                actionableSuggestions.length > 0
                  ? "Diese Vorschläge warten auf deine Entscheidung."
                  : "Gerade wartet nichts auf dich."
              }
            />
            <SummaryCard
              tone="teal"
              label="Zugesagt"
              value={acceptedCount}
              description={acceptedCount > 0 ? "Diese Aktivitäten hast du bestätigt." : "Noch keine zugesagten Vorschläge."}
            />
            <SummaryCard
              tone="slate"
              label="Abgelehnt"
              value={declinedCount}
              description={declinedCount > 0 ? "Diese Vorschläge hast du bewusst aussortiert." : "Noch nichts abgelehnt."}
            />
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className={reactionPage.eyebrowClassName}>Reaktionsfluss getrennt halten</p>
              <h2 className={sectionTitleClassName}>Hier entscheidest du. Planung und Discovery bleiben bewusst separat.</h2>
              <p className={sectionBodyClassName}>
                Vorschläge sind deine Handlungs-Queue für bewusste Zu- und Absagen. Sie sollen nicht mit spontanen Aktivitäten,
                deinem Sozialkalender oder Gruppenverwaltung vermischt werden.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white px-3 py-3">
                <p className={statLabelClassName}>Offen</p>
                <p className={statValueClassName}>{actionableSuggestions.length}</p>
              </div>
              <div className="rounded-xl bg-white px-3 py-3">
                <p className={statLabelClassName}>Zugesagt</p>
                <p className={statValueClassName}>{acceptedCount}</p>
              </div>
              <div className="rounded-xl bg-white px-3 py-3">
                <p className={statLabelClassName}>Abgelehnt</p>
                <p className={statValueClassName}>{declinedCount}</p>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <FlowCard
              href="/now"
              intent="discover"
              eyebrow="Weiter in Jetzt"
              title="Offene Aktivitäten prüfen"
              description="Dort schaust du auf sichtbares Momentum, spontane Einstiege und die nächste relevante Aktivität."
            />
            <FlowCard
              href="/events"
              intent="manage"
              eyebrow="Weiter in Events"
              title="Planung getrennt verwalten"
              description="Nutze Events für bestätigte Aktivitäten, eigenen Kalenderkontext und Smart Treffen statt für offene Entscheidungen."
            />
            <FlowCard
              href="/groups"
              intent="manage"
              eyebrow="Weiter in Gruppen"
              title="Freigabekreise vorbereiten"
              description="Dort pflegst du Kontakte, Kreise und Sichtbarkeit, die spätere Vorschläge relevanter machen."
            />
          </div>
        </section>

        {queryError || submitError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError ?? (queryError instanceof Error ? queryError.message : String(queryError))}
          </div>
        ) : null}
        {data.sync.warning ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Kalender-Sync Warnung: {data.sync.warning}
          </div>
        ) : null}
        {loading && data.suggestions.length === 0 ? <p className="mt-6 text-slate-600">Lade Vorschläge...</p> : null}

        <section id="vorschlaege" className="mt-8 scroll-mt-24 space-y-6">
          <div className={suggestionCard.sectionClassName}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${suggestionCard.eyebrowClassName}`}>Handlungs-Queue</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Offene Vorschläge zuerst</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Diese Vorschläge brauchen eine Entscheidung, bevor sie in deinem Verlauf landen.
                </p>
              </div>
              <p className={`text-sm font-medium ${suggestionCard.accentTextClassName}`}>
                {actionableSuggestions.length === 0
                  ? "Kein offener Vorschlag"
                  : `${actionableSuggestions.length} offene${actionableSuggestions.length === 1 ? "r Vorschlag" : " Vorschläge"}`}
              </p>
            </div>

            {actionableSuggestions.length === 0 ? (
              <div className={`mt-4 space-y-4 text-sm text-slate-600 ${suggestionCard.mutedInsetClassName}`}>
                <p>
                  Im Moment gibt es nichts zu entscheiden. Wenn du trotzdem weitermachen willst, trenne bewusst zwischen
                  Entdecken, eigener Planung und neuem Matching.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <FlowCard
                    href="/now"
                    intent="discover"
                    eyebrow="Weiter in Jetzt"
                    title="Offene Aktivitäten prüfen"
                    description="Dort siehst du, was gerade sichtbar ist, Momentum hat oder direkt einen Einstieg erlaubt."
                  />
                  <FlowCard
                    href="/events"
                    intent="manage"
                    eyebrow="Weiter in Events"
                    title="Eigene Planung prüfen"
                    description="Nutze Events für bestätigte Aktivitäten, deine Planung und Smart Treffen statt für offene Reaktionen."
                  />
                  <FlowCard
                    intent="react"
                    eyebrow="Neues Matching"
                    title="Neue Vorschläge anstoßen"
                    description="Starte den Matching-Lauf neu, wenn du frische Empfehlungen für freie Zeitfenster brauchst."
                    onClick={runSuggestions}
                    disabled={busy}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {actionableSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    acceptedByEventId={data.acceptedByEventId}
                    isSelected={selectedSuggestionId === suggestion.id}
                    variant="action"
                  />
                ))}
              </div>
            )}
          </div>

          <div className={activityCard.sectionClassName}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${activityCard.eyebrowClassName}`}>Verlauf</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Bereits entschiedene Vorschläge</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Hier siehst du, was du schon bestätigt oder bewusst abgelehnt hast.
                </p>
              </div>
              <p className="text-sm text-slate-500">{acceptedCount + declinedCount} Entscheidungen gesamt</p>
            </div>
            <div className="mt-4 space-y-3">
              {historySuggestionsByDay.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Sobald du auf Vorschläge reagierst, erscheint dein Verlauf hier. Bis dahin bleibt diese Ansicht bewusst auf
                  aktuelle Reaktionen statt auf Verwaltung fokussiert.
                </div>
              ) : null}
              {historySuggestionsByDay.map((dayGroup) => (
                <div key={dayGroup.dayKey} className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{dayGroup.dayLabel}</h3>
                  {dayGroup.items.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      acceptedByEventId={data.acceptedByEventId}
                      isSelected={selectedSuggestionId === suggestion.id}
                      variant="history"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function groupSuggestionsByDay(suggestions: Suggestion[]): SuggestionDayGroup[] {
  const sorted = [...suggestions].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() || b.score - a.score
  );
  const grouped = new Map<string, { dayLabel: string; items: Suggestion[] }>();

  for (const suggestion of sorted) {
    const startsAt = new Date(suggestion.startsAt);
    const dayKey = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, "0")}-${String(
      startsAt.getDate()
    ).padStart(2, "0")}`;
    const existing = grouped.get(dayKey);

    if (existing) {
      existing.items.push(suggestion);
      continue;
    }

    grouped.set(dayKey, {
      dayLabel: startsAt.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long"
      }),
      items: [suggestion]
    });
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dayKey, value]) => ({
      dayKey,
      dayLabel: value.dayLabel,
      items: value.items
    }));
}

function SummaryCard({
  label,
  value,
  description,
  tone
}: {
  label: string;
  value: number;
  description: string;
  tone: "amber" | "teal" | "slate";
}) {
  const toneClasses = {
    amber: getCardSurfaceMeta("suggestion").statClassName,
    teal: getCardSurfaceMeta("activity").statClassName,
    slate: getCardSurfaceMeta("smart_meeting").statClassName
  }[tone];

  return (
    <div className={toneClasses}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm opacity-80">{description}</p>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  acceptedByEventId,
  isSelected,
  variant
}: {
  suggestion: Suggestion;
  acceptedByEventId?: Record<string, AcceptedUser[]>;
  isSelected: boolean;
  variant: "action" | "history";
}) {
  const suggestionCard = getCardSurfaceMeta("suggestion");
  const activityCard = getCardSurfaceMeta("activity");
  const accepted = acceptedByEventId?.[suggestion.eventId] ?? [];
  const badge = getSuggestionStatusMeta(suggestion.status);
  const timing = getSuggestionTiming(suggestion.startsAt, suggestion.endsAt);
  const nextAction = getSuggestionNextAction(suggestion.status, variant);
  const cardClasses =
    variant === "action"
      ? isSelected
        ? suggestionCard.selectedItemClassName
        : suggestionCard.itemClassName
      : isSelected
        ? activityCard.selectedItemClassName
        : suggestion.status === "accepted"
          ? activityCard.itemClassName
          : getCardSurfaceMeta("smart_meeting").itemClassName;
  const statusTextClass =
    suggestion.status === "accepted"
      ? "text-teal-700"
      : suggestion.status === "declined"
        ? "text-slate-600"
        : "text-amber-700";

  return (
    <article
      id={`suggestion-${suggestion.id}`}
      className={cardClasses}
      style={suggestion.color && !isSelected ? { borderLeftWidth: "4px", borderLeftColor: suggestion.color } : undefined}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${badge.className}`}>
            {badge.label}
          </span>
          <div className="mt-2">
            <a
              href={`/e/${shortenUUID(suggestion.eventId)}`}
              className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-teal-500"
            >
              {suggestion.title.replace(/#[^\s]+/gi, "").trim()}
            </a>
            <p className="mt-1 text-xs text-slate-500">
              {new Date(suggestion.startsAt).toLocaleDateString("de-DE", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit"
              })}{" "}
              · {new Date(suggestion.startsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} -{" "}
              {new Date(suggestion.endsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} · von{" "}
              <a href={`/u/${shortenUUID(suggestion.createdBy)}`} className="font-medium text-teal-700 hover:text-teal-800">
                {suggestion.createdByName ?? suggestion.createdByEmail}
              </a>
            </p>
            <p className={`mt-1 text-xs font-medium ${statusTextClass}`}>
              {badge.description} · Score {suggestion.score.toFixed(2)}
            </p>
            {accepted.length > 0 ? (
              <p className="mt-1 text-xs text-teal-700">
                Zugesagt:{" "}
                {accepted
                  .map((u) =>
                    getPersonDisplayLabel({
                      name: u.name,
                      email: u.email,
                      allowEmail: false,
                    }),
                  )
                  .join(", ")}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {suggestion.calendarEventId ? (
            <a
              href={`/api/suggestions/${encodeURIComponent(suggestion.id)}/calendar-link`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Im Kalender bearbeiten
            </a>
          ) : null}
          <a
            href={`/s/${shortenUUID(suggestion.id)}`}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${
              variant === "action"
                ? "border border-teal-200 bg-teal-700 text-white hover:bg-teal-800"
                : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            {nextAction.ctaLabel}
          </a>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SuggestionInfoBlock
          label="Wann"
          value={timing.primary}
          detail={timing.secondary}
          tone={variant === "action" ? "suggestion" : "smart_meeting"}
        />
        <SuggestionInfoBlock
          label={variant === "action" ? "Warum passend" : "Entscheidungsgrundlage"}
          value={getReasonHeadline(suggestion.reason)}
          detail={suggestion.reason}
          tone="activity"
        />
        <SuggestionInfoBlock
          label="Nächste Aktion"
          value={nextAction.label}
          detail={nextAction.detail}
          tone={variant === "action" ? "suggestion" : "smart_meeting"}
        />
      </div>
    </article>
  );
}

function SuggestionInfoBlock({
  label,
  value,
  detail,
  tone
}: {
  label: string;
  value: string;
  detail: string;
  tone: "activity" | "suggestion" | "smart_meeting";
}) {
  const toneClasses = getCardSurfaceMeta(tone).insetClassName;

  return (
    <div className={toneClasses}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

function getReasonHeadline(reason: string) {
  const trimmed = reason.trim();
  const firstSentence = trimmed.split(/[.!?](?:\s|$)/, 1)[0]?.trim() ?? "";

  if (!firstSentence) {
    return "Passender Vorschlag";
  }

  return firstSentence.length > 72 ? `${firstSentence.slice(0, 69).trimEnd()}...` : firstSentence;
}

function getSuggestionTiming(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfSuggestionDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const dayDiff = Math.round((startOfSuggestionDay.getTime() - startOfToday.getTime()) / 86_400_000);

  const dayLabel =
    dayDiff === 0
      ? "Heute"
      : dayDiff === 1
        ? "Morgen"
        : start.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit"
          });

  return {
    primary: `${dayLabel}, ${start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`,
    secondary: `bis ${end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`
  };
}
