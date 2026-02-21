"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/src/components/app-shell";
import { UserAvatar } from "@/src/components/user-avatar";
import { shortenUUID } from "@/src/lib/utils/short-uuid";

type Group = {
  id: string;
  name: string;
  isHidden: boolean;
};

type EventItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  groupName: string | null;
  tags: string[];
};

type Suggestion = {
  eventId: string;
  status: "pending" | "calendar_inserted" | "accepted" | "declined";
};

type DashboardPayload = {
  me: {
    email: string;
    name: string | null;
    image: string | null;
    calendarConnected: boolean;
    calendarScope: string | null;
  };
  sync: {
    warning: string | null;
    stats: {
      synced: number;
      scanned: number;
    } | null;
    contactsWarning: string | null;
    revalidating: boolean;
  };
  groups: Group[];
  events: EventItem[];
  suggestions: Suggestion[];
};

const emptyPayload: DashboardPayload = {
  me: {
    email: "",
    name: null,
    image: null,
    calendarConnected: false,
    calendarScope: null
  },
  sync: {
    warning: null,
    stats: null,
    contactsWarning: null,
    revalidating: false
  },
  groups: [],
  events: [],
  suggestions: []
};

export function Dashboard({
  userName,
  userEmail,
  userImage
}: {
  userName: string;
  userEmail: string;
  userImage: string | null;
}) {
  const [data, setData] = useState<DashboardPayload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    location: "",
    startsAt: "",
    endsAt: "",
    visibility: "public" as "public" | "group",
    groupId: "",
    tags: "#kontakte"
  });

  const visibleGroups = useMemo(() => data.groups.filter((group) => !group.isHidden), [data.groups]);
  const visibleEvents = useMemo(() => {
    const pendingSuggestionEventIds = new Set(
      data.suggestions
        .filter((suggestion) => suggestion.status === "pending" || suggestion.status === "calendar_inserted")
        .map((suggestion) => suggestion.eventId)
    );

    return data.events
      .filter((event) => !pendingSuggestionEventIds.has(event.id))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [data.events, data.suggestions]);

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
      const payload = (await response.json()) as DashboardPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Events konnten nicht geladen werden");
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
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadData({ silent: true });
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [data.sync.revalidating]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadData({ silent: true });
    }, 45_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  async function createEvent(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventForm,
          startsAt: new Date(eventForm.startsAt).toISOString(),
          endsAt: new Date(eventForm.endsAt).toISOString(),
          groupId: eventForm.groupId || null,
          tags: eventForm.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Event konnte nicht erstellt werden");
      }

      setEventForm({
        title: "",
        description: "",
        location: "",
        startsAt: "",
        endsAt: "",
        visibility: "public",
        groupId: "",
        tags: "#kontakte"
      });
      setShowEventForm(false);
      await loadData({ silent: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

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
                <p className="text-sm text-slate-500">Events</p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Meine Events</h1>
                <p className="text-xs text-slate-500">{profileEmail}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Kalenderstatus: {data.me.calendarConnected ? "Google Kalender verbunden" : "Nicht verbunden"}
                </p>
                {data.sync.stats ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Letzter Sync: {data.sync.stats.synced} übernommen aus {data.sync.stats.scanned} Kalender-Events.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-80">
              <button
                onClick={() => setShowEventForm((current) => !current)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {showEventForm ? "Event schließen" : "Neues Event"}
              </button>
              <a
                href="/groups"
                className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700"
              >
                Zu Gruppen
              </a>
              <a
                href="/suggestions"
                className="rounded-lg bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Zu Vorschlägen
              </a>
              <a
                href="/api/auth/signout?callbackUrl=/"
                className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700"
              >
                Abmelden
              </a>
            </div>
          </div>
          {data.me.calendarScope ? (
            <p className="mt-3 break-all text-xs text-slate-500">Scope: {data.me.calendarScope}</p>
          ) : null}
        </header>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {data.sync.warning ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Kalender-Sync Warnung: {data.sync.warning}
          </div>
        ) : null}
        {data.sync.contactsWarning ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Kontakte-Sync Warnung: {data.sync.contactsWarning}
          </div>
        ) : null}
        {data.sync.revalidating ? (
          <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
            Aktualisierung im Hintergrund läuft. Neue Kalender- und Kontaktdaten erscheinen automatisch.
          </div>
        ) : null}
        {loading && data.events.length === 0 ? <p className="mt-6 text-slate-600">Lade Daten...</p> : null}

        {showEventForm ? (
          <form onSubmit={createEvent} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Neues Event anlegen</h2>
            <div className="mt-4 grid gap-3">
              <input
                value={eventForm.title}
                onChange={(event) => setEventForm((state) => ({ ...state, title: event.target.value }))}
                placeholder="Titel"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="datetime-local"
                  value={eventForm.startsAt}
                  onChange={(event) => setEventForm((state) => ({ ...state, startsAt: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
                <input
                  type="datetime-local"
                  value={eventForm.endsAt}
                  onChange={(event) => setEventForm((state) => ({ ...state, endsAt: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <input
                value={eventForm.tags}
                onChange={(event) => setEventForm((state) => ({ ...state, tags: event.target.value }))}
                placeholder="#alle, #kontakte"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={eventForm.visibility}
                  onChange={(event) =>
                    setEventForm((state) => ({ ...state, visibility: event.target.value as "public" | "group" }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="public">Öffentlich</option>
                  <option value="group">Nur Gruppe</option>
                </select>
                <select
                  value={eventForm.groupId}
                  onChange={(event) => setEventForm((state) => ({ ...state, groupId: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Keine Gruppe</option>
                  {visibleGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Event speichern
            </button>
          </form>
        ) : null}

        <section id="events" className="mt-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Alle sichtbaren Events</h2>
          <p className="mt-1 text-sm text-slate-600">Deine öffentlichen und Gruppen-Events in zeitlicher Reihenfolge.</p>
          <div className="mt-4 space-y-2">
            {visibleEvents.length === 0 ? (
              <p className="text-sm text-slate-500">
                Noch keine Events vorhanden. Lege ein Event an oder öffne <a href="/groups" className="text-teal-700 underline">Gruppen</a>.
              </p>
            ) : null}
            {visibleEvents.map((event) => (
              <article key={event.id} className="rounded-md border border-slate-200 p-3">
                <a
                  href={`/e/${shortenUUID(event.id)}`}
                  className="break-words text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-teal-500"
                >
                  {event.title}
                </a>
                <p className="text-xs text-slate-500">
                  {new Date(event.startsAt).toLocaleString("de-DE")} - {new Date(event.endsAt).toLocaleTimeString("de-DE")} ·{" "}
                  {event.groupName ?? "ohne Gruppe"}
                </p>
                {event.tags.length ? <p className="mt-1 text-xs text-slate-600">{event.tags.join(" · ")}</p> : null}
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
