"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getPersonDisplayLabel } from "@/src/lib/person-display";
import { buildLoginPath } from "@/src/lib/provider-adapters";

type Comment = {
  id: string;
  eventId: string;
  userId: string;
  body: string;
  createdAt: string;
  authorName: string | null;
  authorEmail: string;
};

type TimelineEntry =
  | {
    kind: "system";
    id: string;
    createdAt: string;
    creatorLabel: string;
  }
  | {
    kind: "comment";
    comment: Comment;
  };

type EventCommentsProps = {
  eventId: string;
  /** Wenn true, dürfen Gäste Kommentare lesen; Schreiben erfordert Anmeldung (Form ausgeblendet, CTA angezeigt). */
  allowGuestView?: boolean;
  /** Bei allowGuestView: Pfad für callbackUrl nach der Anmeldung (z. B. /e/xyz). */
  signInCallbackPath?: string;
  /** Für Verlauf: Erstellungszeitpunkt des Events (ISO). */
  eventCreatedAtIso?: string | null;
  /** Für Verlauf: Anzeigename der Organisator:in. */
  eventCreatorLabel?: string | null;
};

function formatTimelineTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTimelineEntries(
  comments: Comment[],
  seed: { createdAtIso: string; creatorLabel: string } | null,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  if (seed) {
    entries.push({
      kind: "system",
      id: "event-created",
      createdAt: seed.createdAtIso,
      creatorLabel: seed.creatorLabel,
    });
  }
  for (const c of comments) {
    entries.push({ kind: "comment", comment: c });
  }
  entries.sort(
    (a, b) =>
      new Date(a.kind === "comment" ? a.comment.createdAt : a.createdAt).getTime() -
      new Date(b.kind === "comment" ? b.comment.createdAt : b.createdAt).getTime(),
  );
  return entries;
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

const authorHighlightClassName = "font-semibold text-teal-600";

export function EventComments({
  eventId,
  allowGuestView = false,
  signInCallbackPath = "/",
  eventCreatedAtIso,
  eventCreatorLabel,
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

  const timelineSeed = useMemo(() => {
    if (!eventCreatedAtIso?.trim()) return null;
    const label = eventCreatorLabel?.trim() || "Organisator:in";
    return { createdAtIso: eventCreatedAtIso.trim(), creatorLabel: label };
  }, [eventCreatedAtIso, eventCreatorLabel]);

  const timeline = useMemo(
    () => buildTimelineEntries(comments, timelineSeed),
    [comments, timelineSeed],
  );

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
          prev ? [...prev, data.comment!] : [data.comment!],
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
    <section className="mt-6 border-t border-border pt-5 dark:border-white/10">
      <div
        className="max-h-[min(50vh,22rem)] min-h-[4rem] space-y-3 overflow-y-auto"
        aria-label="Verlauf"
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Wird geladen…</p>
        ) : queryError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {queryError instanceof Error ? queryError.message : "Laden fehlgeschlagen"}
          </p>
        ) : timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Nachrichten.</p>
        ) : (
          timeline.map((entry) => {
            if (entry.kind === "system") {
              return (
                <div
                  key={entry.id}
                  className="flex gap-3 border-l-2 border-teal-500/50 py-0.5 pl-3 dark:border-teal-500/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{formatTimelineTime(entry.createdAt)}</p>
                    <p className="mt-1 text-sm text-foreground">
                      Event angelegt ·{" "}
                      <span className={authorHighlightClassName}>{entry.creatorLabel}</span>
                    </p>
                  </div>
                </div>
              );
            }
            const c = entry.comment;
            const author = getPersonDisplayLabel({
              name: c.authorName,
              email: c.authorEmail,
            });
            return (
              <div key={c.id} className="flex justify-start">
                <div className="max-w-[min(100%,28rem)] rounded-2xl rounded-tl-md bg-muted px-3 py-2 shadow-sm ring-1 ring-border/60 dark:bg-card/10 dark:ring-white/10">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <span className={`text-xs ${authorHighlightClassName}`}>{author}</span>
                    <time dateTime={c.createdAt} className="text-[11px] text-muted-foreground">
                      {formatTimelineTime(c.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm text-foreground">
                    {c.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4">
        {allowGuestView ? (
          <p className="text-sm text-muted-foreground">
            <a
              href={buildLoginPath(signInCallbackPath)}
              className="font-medium text-teal-600 hover:text-teal-700"
            >
              Melde dich an
            </a>
            , um zu schreiben.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <label htmlFor="event-comment-body" className="sr-only">
              Nachricht
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id="event-comment-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Nachricht schreiben …"
                rows={1}
                maxLength={2000}
                className="w-full min-w-0 flex-1 resize-y rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/40 dark:border-white/12 dark:bg-card/5"
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={!body.trim() || submitting}
                className="inline-flex h-[44px] shrink-0 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {submitting ? "…" : "Senden"}
              </button>
            </div>
            {submitError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  );
}
