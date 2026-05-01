"use client";

import { useMemo, useState } from "react";

import { normalizeSinglesHereSlug } from "@/src/lib/singles-here";

function toLocalInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function SinglesHereCreatePage() {
  const [name, setName] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState(() => toLocalInputValue(new Date()));
  const [endsAt, setEndsAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 3 * 60 * 60_000)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = useMemo(
    () => normalizeSinglesHereSlug(slugInput || name),
    [name, slugInput],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/singles/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          location,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        event?: { slug: string };
      };
      if (!response.ok || !payload.event) {
        throw new Error(payload.error ?? "Event konnte nicht erstellt werden.");
      }

      window.location.href = `/singles/${encodeURIComponent(payload.event.slug)}`;
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unbekannter Fehler",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-teal-700">Realite Experiment</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        Singles-hier Event anlegen
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Lege eine einfache Scan-Seite für ein konkretes Event an. Der Slug wird
        Teil der URL und muss eindeutig sein.
      </p>

      <form
        onSubmit={submit}
        className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-5"
      >
        <label className="grid gap-1 text-sm">
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-input px-3 py-2"
            required
            minLength={2}
            maxLength={80}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Slug</span>
          <input
            value={slugInput}
            onChange={(event) => setSlugInput(event.target.value)}
            placeholder={slug || "event-slug"}
            className="rounded-lg border border-input px-3 py-2"
            maxLength={80}
          />
          <span className="text-xs text-muted-foreground">
            URL: /singles/{slug || "event-slug"}
          </span>
        </label>
        <label className="grid gap-1 text-sm">
          <span>Ort</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="rounded-lg border border-input px-3 py-2"
            maxLength={160}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span>Start</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="rounded-lg border border-input px-3 py-2"
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Ende</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className="rounded-lg border border-input px-3 py-2"
              required
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy || !slug}
          className="w-fit rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Event erstellen
        </button>
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </form>
    </main>
  );
}
