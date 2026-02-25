"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/src/components/app-shell";
import { toast, REVALIDATING_TOAST_ID } from "@/src/components/toaster";
import { UserAvatar } from "@/src/components/user-avatar";
import { captureProductEvent } from "@/src/lib/posthog/capture";
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
  const searchParams = useSearchParams();
  const [data, setData] = useState<SuggestionsPayload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoDecisionHandled, setAutoDecisionHandled] = useState(false);

  const suggestionsByDay = useMemo(() => {
    const sorted = [...data.suggestions].sort(
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
  }, [data.suggestions]);

  const selectedSuggestionId = searchParams.get("suggestion");
  const decisionFromQuery = searchParams.get("decision");
  const queryDecision = decisionFromQuery === "accepted" || decisionFromQuery === "declined" ? decisionFromQuery : null;

  const profileName = data.me.name ?? userName;
  const profileEmail = data.me.email || userEmail;
  const profileImage = data.me.image ?? userImage;

  async function loadData(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const payload = (await response.json()) as SuggestionsPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Vorschläge konnten nicht geladen werden");
      }

      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unbekannter Fehler");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!data.sync.revalidating) {
      toast.dismiss(REVALIDATING_TOAST_ID);
      return;
    }

    toast.loading("Aktualisierung im Hintergrund läuft. Neue Vorschläge erscheinen automatisch.", {
      id: REVALIDATING_TOAST_ID,
      duration: Number.POSITIVE_INFINITY,
    });

    const intervalId = window.setInterval(() => {
      void loadData({ silent: true });
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
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
    setError(null);

    try {
      const response = await fetch("/api/suggestions/run", { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Matching fehlgeschlagen");
      }

      await loadData({ silent: true });
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unbekannter Fehler");
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
    setError(null);

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

      await loadData({ silent: true });
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Unbekannter Fehler");
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
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <UserAvatar name={profileName} email={profileEmail} image={profileImage} size="lg" />
              <div>
                <p className="text-sm text-slate-500">Vorschläge</p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Meine Vorschläge</h1>
                <p className="mt-0.5 text-sm text-slate-600">Aktivitäten, die zu dir passen – sag zu oder lehne ab.</p>
                <p className="text-xs text-slate-500">{profileEmail}</p>
              </div>
            </div>
            <button
              onClick={runSuggestions}
              disabled={busy}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Matching starten
            </button>
          </div>
        </header>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {data.sync.warning ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Kalender-Sync Warnung: {data.sync.warning}
          </div>
        ) : null}
        {loading && data.suggestions.length === 0 ? <p className="mt-6 text-slate-600">Lade Vorschläge...</p> : null}

        <section id="vorschlaege" className="mt-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Vorschläge</h2>
          <div className="mt-4 space-y-3">
            {suggestionsByDay.length === 0 ? <p className="text-sm text-slate-500">Noch keine Vorschläge.</p> : null}
            {suggestionsByDay.map((dayGroup) => (
              <div key={dayGroup.dayKey} className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{dayGroup.dayLabel}</h3>
                {dayGroup.items.map((suggestion) => (
                  <article
                    key={suggestion.id}
                    id={`suggestion-${suggestion.id}`}
                    className={`rounded-lg border p-3 ${selectedSuggestionId === suggestion.id ? "border-teal-400 bg-teal-50" : "border-slate-200"}`}
                    style={
                      suggestion.color && selectedSuggestionId !== suggestion.id
                        ? { borderLeftWidth: "4px", borderLeftColor: suggestion.color }
                        : undefined
                    }
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <a
                          href={`/e/${shortenUUID(suggestion.eventId)}`}
                          className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-teal-500"
                        >
                          {suggestion.title.replace(/#[^\s]+/gi, "").trim()}
                        </a>
                        <p className="text-xs text-slate-500">
                          {new Date(suggestion.startsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {new Date(suggestion.endsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} · von{" "}
                          <a href={`/u/${shortenUUID(suggestion.createdBy)}`} className="font-medium text-teal-700 hover:text-teal-800">
                            {suggestion.createdByName ?? suggestion.createdByEmail}
                          </a>
                        </p>
                        <p className="text-xs text-slate-500">Score {suggestion.score.toFixed(2)} · Status {suggestion.status}</p>
                        {suggestion.status === "accepted" && (
                          <p className="mt-1 text-xs font-medium text-teal-700">Du hast zugesagt.</p>
                        )}
                        {(() => {
                          const accepted = data.acceptedByEventId?.[suggestion.eventId] ?? [];
                          return accepted.length > 0 ? (
                            <p className="mt-1 text-xs text-teal-700">
                              Zugesagt: {accepted.map((u) => u.name ?? u.email).join(", ")}
                            </p>
                          ) : null;
                        })()}
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
                          className="rounded-md border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-700"
                        >
                          Antworten
                        </a>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{suggestion.reason}</p>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
