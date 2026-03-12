"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

type Comment = {
  id: string;
  eventId: string;
  userId: string;
  body: string;
  createdAt: string;
  authorName: string | null;
  authorEmail: string;
};

type EventCommentsProps = {
  eventId: string;
  /** Wenn true, dürfen Gäste Kommentare lesen; Schreiben erfordert Anmeldung (Form ausgeblendet, CTA angezeigt). */
  allowGuestView?: boolean;
  /** Bei allowGuestView: Pfad für callbackUrl nach der Anmeldung (z. B. /e/xyz). */
  signInCallbackPath?: string;
};

function formatCommentDate(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchEventComments(eventId: string): Promise<Comment[]> {
  const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/comments`);
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? "Kommentare konnten nicht geladen werden");
  }
  const data = (await res.json()) as { comments: Comment[] };
  return data.comments;
}

export function EventComments({
  eventId,
  allowGuestView = false,
  signInCallbackPath = "/",
}: EventCommentsProps) {
  const queryClient = useQueryClient();
  const {
    data: comments = [],
    isPending: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["events", eventId, "comments"],
    queryFn: () => fetchEventComments(eventId),
  });

  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = (await res.json()) as { comment?: Comment; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Kommentar konnte nicht gespeichert werden");
      }
      if (data.comment) {
        queryClient.setQueryData<Comment[]>(["events", eventId, "comments"], (prev) =>
          prev ? [...prev, data.comment!] : [data.comment!]
        );
      }
      setBody("");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Kommentare</h2>
      <p className="mt-1 text-sm text-slate-600">
        Alle mit Zugriff auf dieses Event können hier Fragen stellen, antworten und sich austauschen.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Kommentare werden geladen…</p>
      ) : queryError ? (
        <p className="mt-4 text-sm text-red-600">{queryError instanceof Error ? queryError.message : "Laden fehlgeschlagen"}</p>
      ) : (
        <ul className="mt-4 space-y-4" aria-label="Kommentare">
          {comments.length === 0 ? (
            <li className="text-sm text-slate-500">Noch keine Kommentare. Starte die Unterhaltung.</li>
          ) : (
            comments.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-800">
                    {c.authorName ?? c.authorEmail}
                  </span>
                  <time
                    dateTime={c.createdAt}
                    className="text-xs text-slate-500"
                  >
                    {formatCommentDate(c.createdAt)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-slate-700">
                  {c.body}
                </p>
              </li>
            ))
          )}
        </ul>
      )}

      {allowGuestView ? (
        <p className="mt-4 text-sm text-slate-600">
          <Link
            href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(signInCallbackPath)}`}
            className="font-medium text-teal-700 hover:text-teal-800"
          >
            Melde dich an
          </Link>
          , um zu kommentieren.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor="event-comment-body" className="sr-only">
            Neuer Kommentar
          </label>
          <textarea
            id="event-comment-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Frage stellen, antworten, mitreden…"
            rows={3}
            maxLength={2000}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            disabled={submitting}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              {body.length}/2000 Zeichen
            </span>
            <button
              type="submit"
              disabled={!body.trim() || submitting}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {submitting ? "Wird gesendet…" : "Kommentar senden"}
            </button>
          </div>
          {submitError ? (
            <p className="mt-2 text-sm text-red-600">{submitError}</p>
          ) : null}
        </form>
      )}
    </section>
  );
}
