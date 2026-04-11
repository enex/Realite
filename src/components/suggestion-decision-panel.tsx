"use client";

import { useMemo, useState } from "react";

import {
  DECLINE_REASON_LABELS,
  DECLINE_REASON_VALUES,
  type DeclineReason
} from "@/src/lib/suggestion-feedback";
import { captureProductEvent } from "@/src/lib/posthog/capture";

type SuggestionDecisionPanelProps = {
  suggestionId: string;
  initialStatus: "pending" | "calendar_inserted" | "accepted" | "declined";
  initialReasons: DeclineReason[];
  initialNote: string | null;
  creatorName: string;
};

export function SuggestionDecisionPanel(props: SuggestionDecisionPanelProps) {
  const [status, setStatus] = useState(props.initialStatus);
  const [selectedReasons, setSelectedReasons] = useState<DeclineReason[]>(props.initialReasons);
  const [note, setNote] = useState(props.initialNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const showDeclineForm = status === "declined" || selectedReasons.length > 0;
  const sortedReasons = useMemo(() => [...DECLINE_REASON_VALUES], []);

  function getDeclineReasonLabel(reason: DeclineReason) {
    if (reason === "not_with_this_person") {
      return `Nicht mit ${props.creatorName}`;
    }

    return DECLINE_REASON_LABELS[reason];
  }

  function toggleReason(reason: DeclineReason) {
    setSelectedReasons((current) => {
      if (current.includes(reason)) {
        return current.filter((entry) => entry !== reason);
      }

      return [...current, reason];
    });
  }

  async function sendDecision(decision: "accepted" | "declined") {
    setBusy(true);
    setError(null);
    setSavedMessage(null);

    try {
      const response = await fetch(`/api/suggestions/${props.suggestionId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          decision,
          reasons: decision === "declined" ? selectedReasons : [],
          note: decision === "declined" ? note : null
        })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Entscheidung konnte nicht gespeichert werden");
      }

      if (decision === "accepted") {
        captureProductEvent("suggestion_accepted", {
          suggestion_id: props.suggestionId,
          source: "decision_panel"
        });
      }

      setStatus(decision);
      setSavedMessage(
        decision === "accepted"
          ? "Zusage gespeichert und für künftige Vorschläge berücksichtigt."
          : "Absagegründe gespeichert und für künftige Vorschläge berücksichtigt."
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-foreground">Möchtest du teilnehmen?</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Deine Antwort wird gespeichert und verbessert die nächsten Vorschläge.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => sendDecision("accepted")}
          disabled={busy}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Ja, ich nehme teil
        </button>
        <button
          type="button"
          onClick={() => {
            setStatus("declined");
            setSavedMessage(null);
          }}
          disabled={busy}
          className="rounded-lg border border-input px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
        >
          Nein
        </button>
      </div>

      {showDeclineForm ? (
        <div className="mt-5 rounded-xl border border-border bg-muted p-4">
          <p className="text-sm font-semibold text-foreground">Warum nicht? (Mehrfachauswahl möglich)</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {sortedReasons.map((reason) => (
              <label key={reason} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedReasons.includes(reason)}
                  onChange={() => toggleReason(reason)}
                  disabled={busy}
                />
                <span>{getDeclineReasonLabel(reason)}</span>
              </label>
            ))}
          </div>

          <label className="mt-4 block text-sm text-foreground" htmlFor="decline-note">
            Optional: Wenn folgendes anders wäre, dann ja
          </label>
          <textarea
            id="decline-note"
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 300))}
            placeholder="z. B. anderer Ort, spätere Uhrzeit, andere Gruppe"
            className="mt-2 min-h-24 w-full rounded-lg border border-input px-3 py-2 text-sm"
            disabled={busy}
          />

          <button
            type="button"
            onClick={() => sendDecision("declined")}
            disabled={busy}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Absage speichern
          </button>
        </div>
      ) : null}

      {savedMessage ? (
        <p className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700">{savedMessage}</p>
      ) : null}
      {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
