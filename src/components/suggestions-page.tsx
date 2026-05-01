"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/src/components/app-shell";
import { CalendarReconnectBanner } from "@/src/components/calendar-reconnect-banner";
import { toast, REVALIDATING_TOAST_ID } from "@/src/components/toaster";
import { getSuggestionNextAction, getSuggestionStatusMeta } from "@/src/lib/activity-patterns";
import type { CalendarConnectionState } from "@/src/lib/calendar-connection-state";
import { getPersonDisplayLabel } from "@/src/lib/person-display";
import { captureProductEvent } from "@/src/lib/posthog/capture";
import { DASHBOARD_QUERY_KEY, fetchDashboard } from "@/src/lib/dashboard-query";
import { useQueryErrorToast } from "@/src/lib/use-query-error-toast";
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
    calendarConnectionState: CalendarConnectionState;
  };
  sync: {
    warning: string | null;
    revalidating: boolean;
  };
  suggestions: Suggestion[];
  acceptedByEventId?: Record<string, AcceptedUser[]>;
};

const emptyPayload: SuggestionsPayload = {
  me: {
    email: "",
    name: null,
    image: null,
    calendarConnectionState: "not_connected"
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

  useQueryErrorToast(queryError);

  const [busy, setBusy] = useState(false);
  const [autoDecisionHandled, setAutoDecisionHandled] = useState(false);

  const actionableSuggestions = useMemo(
    () =>
      [...data.suggestions]
        .filter((suggestion) => suggestion.status === "pending" || suggestion.status === "calendar_inserted")
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() || b.score - a.score),
    [data.suggestions]
  );
  const historySuggestions = useMemo(
    () =>
      [...data.suggestions]
        .filter((suggestion) => suggestion.status === "accepted" || suggestion.status === "declined")
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()),
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
    toast.loading("Aktualisierung läuft…", {
      id: REVALIDATING_TOAST_ID,
      duration: Number.POSITIVE_INFINITY
    });
    return () => {
      toast.dismiss(REVALIDATING_TOAST_ID);
    };
  }, [data.sync.revalidating]);

  useEffect(() => {
    if (!selectedSuggestionId) return;
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
    try {
      const response = await fetch("/api/suggestions/run", { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Matching fehlgeschlagen");
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
      toast.success("Matching aktualisiert.");
    } catch (runError) {
      toast.error(runError instanceof Error ? runError.message : "Unbekannter Fehler");
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
    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Feedback konnte nicht gespeichert werden");
      if (decision === "accepted") {
        captureProductEvent("suggestion_accepted", { suggestion_id: suggestionId, source });
      }
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
      toast.success("Entscheidung gespeichert.");
    } catch (decisionError) {
      toast.error(decisionError instanceof Error ? decisionError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!selectedSuggestionId || !queryDecision || autoDecisionHandled || loading || busy) return;
    const suggestionExists = data.suggestions.some((suggestion) => suggestion.id === selectedSuggestionId);
    if (!suggestionExists) return;
    setAutoDecisionHandled(true);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("decision");
    const nextQuery = nextParams.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
    void decideSuggestion(selectedSuggestionId, queryDecision, "query_auto");
  }, [autoDecisionHandled, busy, data.suggestions, loading, queryDecision, searchParams, selectedSuggestionId]);

  return (
    <AppShell user={{ name: profileName, email: profileEmail, image: profileImage }}>
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-foreground">Vorschläge</h1>
          <button
            onClick={runSuggestions}
            disabled={busy}
            className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Matching aktualisieren
          </button>
        </div>

        <CalendarReconnectBanner calendarConnectionState={data.me.calendarConnectionState} />
        {loading && data.suggestions.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">Lade Vorschläge…</p> : null}

        {actionableSuggestions.length > 0 ? (
          <section className="mt-5 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {actionableSuggestions.length} offen
            </h2>
            {actionableSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                accepted={data.acceptedByEventId?.[suggestion.eventId] ?? []}
                isSelected={selectedSuggestionId === suggestion.id}
                onDecide={decideSuggestion}
                busy={busy}
              />
            ))}
          </section>
        ) : !loading ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-muted px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">Keine offenen Vorschläge</p>
            <p className="mt-1 text-sm text-muted-foreground">Starte ein neues Matching oder warte auf neue Aktivitäten.</p>
          </div>
        ) : null}

        {historySuggestions.length > 0 ? (
          <section className="mt-8 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Verlauf</h2>
            {historySuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                accepted={data.acceptedByEventId?.[suggestion.eventId] ?? []}
                isSelected={selectedSuggestionId === suggestion.id}
                onDecide={decideSuggestion}
                busy={busy}
              />
            ))}
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}

function SuggestionCard({
  suggestion,
  accepted,
  isSelected,
  onDecide,
  busy,
}: {
  suggestion: Suggestion;
  accepted: AcceptedUser[];
  isSelected: boolean;
  onDecide: (id: string, decision: "accepted" | "declined") => void;
  busy: boolean;
}) {
  const badge = getSuggestionStatusMeta(suggestion.status);
  const isActionable = suggestion.status === "pending" || suggestion.status === "calendar_inserted";
  const nextAction = getSuggestionNextAction(suggestion.status, isActionable ? "action" : "history");
  const start = new Date(suggestion.startsAt);
  const end = new Date(suggestion.endsAt);

  return (
    <article
      id={`suggestion-${suggestion.id}`}
      className={`rounded-xl border p-4 transition ${
        isSelected
          ? "border-teal-300 bg-teal-50 shadow-sm"
          : isActionable
            ? "border-amber-200 bg-card hover:border-amber-300"
            : suggestion.status === "accepted"
              ? "border-border bg-card"
              : "border-border bg-muted"
      }`}
      style={suggestion.color && !isSelected ? { borderLeftWidth: "4px", borderLeftColor: suggestion.color } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
              {badge.label}
            </span>
            {accepted.length > 0 ? (
              <span className="text-[11px] font-semibold text-teal-700">
                {accepted.length} {accepted.length === 1 ? "Zusage" : "Zusagen"}
              </span>
            ) : null}
          </div>
          <a
            href={`/e/${shortenUUID(suggestion.eventId)}`}
            className="mt-2 block font-medium text-foreground hover:text-teal-700"
          >
            {suggestion.title.replace(/#[^\s]+/gi, "").trim()}
          </a>
          <p className="mt-1 text-xs text-muted-foreground">
            {start.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
            {" · "}
            {start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            {" – "}
            {end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            {suggestion.createdByName ? ` · ${suggestion.createdByName}` : ""}
          </p>
          {accepted.length > 0 ? (
            <p className="mt-1 text-xs text-teal-700">
              Dabei:{" "}
              {accepted
                .slice(0, 3)
                .map((u) => getPersonDisplayLabel({ name: u.name, email: u.email, allowEmail: false }))
                .join(", ")}
              {accepted.length > 3 ? ` +${accepted.length - 3}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isActionable ? (
            <>
              <button
                onClick={() => onDecide(suggestion.id, "declined")}
                disabled={busy}
                className="rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-50"
              >
                Nein
              </button>
              <button
                onClick={() => onDecide(suggestion.id, "accepted")}
                disabled={busy}
                className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
              >
                Zusagen
              </button>
            </>
          ) : (
            <a
              href={`/s/${shortenUUID(suggestion.id)}`}
              className="rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
            >
              {nextAction.ctaLabel}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
