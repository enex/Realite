"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/src/components/app-shell";
import { SmartMeetingsCard } from "@/src/components/smart-meetings-card";
import { UserAvatar } from "@/src/components/user-avatar";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  EVENT_CATEGORY_VALUES,
  type EventCategory,
  inferEventCategory,
} from "@/src/lib/event-categories";
import { captureProductEvent } from "@/src/lib/posthog/capture";
import { useRealiteFeatureFlag } from "@/src/lib/posthog/feature-flags";
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
  visibility: "public" | "group" | "smart_date";
  color: string | null;
  category: EventCategory;
  placeImageUrl: string | null;
  linkPreviewImageUrl: string | null;
};

type Suggestion = {
  eventId: string;
  status: "pending" | "calendar_inserted" | "accepted" | "declined";
};

type SmartMeeting = {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  status: "active" | "secured" | "exhausted" | "paused";
  tags: string[];
  description?: string | null;
  location?: string | null;
  durationMinutes?: number;
  slotIntervalMinutes?: number;
  minAcceptedParticipants: number;
  responseWindowHours: number;
  maxAttempts: number;
  searchWindowStart: string;
  searchWindowEnd: string;
  updatedAt: string;
  latestRun: {
    id: string;
    attempt: number;
    startsAt: string;
    endsAt: string;
    responseDeadlineAt: string;
    status: "pending" | "secured" | "expired" | "cancelled";
    participantCount: number;
    acceptedCount: number;
    declinedCount: number;
    pendingCount: number;
    statusReason: string | null;
  } | null;
};

type AcceptedUser = { name: string | null; email: string };

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
    smartWarning: string | null;
    smartStats: {
      checked: number;
      secured: number;
      expired: number;
      rescheduled: number;
      exhausted: number;
    } | null;
    revalidating: boolean;
  };
  dating: {
    enabled: boolean;
    unlocked: boolean;
    missingRequirements: string[];
  };
  groups: Group[];
  events: EventItem[];
  suggestions: Suggestion[];
  smartMeetings: SmartMeeting[];
  acceptedByEventId?: Record<string, AcceptedUser[]>;
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
    smartWarning: null,
    smartStats: null,
    revalidating: false
  },
  dating: {
    enabled: false,
    unlocked: false,
    missingRequirements: []
  },
  groups: [],
  events: [],
  suggestions: [],
  smartMeetings: []
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
    tags: "#kontakte",
    color: "" as string,
    category: "default" as EventCategory,
  });

  const visibleGroups = useMemo(() => data.groups.filter((group) => !group.isHidden), [data.groups]);
  const acceptedEventIds = useMemo(
    () =>
      new Set(
        data.suggestions
          .filter((s) => s.status === "accepted")
          .map((s) => s.eventId)
      ),
    [data.suggestions]
  );
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

  /** Events nach Kategorie gruppiert (Reihenfolge wie Google Kalender: Kategorien mit Farben). */
  const eventsByCategory = useMemo(() => {
    const map = new Map<EventCategory, typeof visibleEvents>();
    for (const cat of EVENT_CATEGORY_VALUES) {
      map.set(cat, []);
    }
    for (const event of visibleEvents) {
      const cat = event.category ?? "default";
      const list = map.get(cat) ?? map.get("default")!;
      list.push(event);
    }
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [visibleEvents]);

  const profileName = data.me.name ?? userName;
  const profileEmail = data.me.email || userEmail;
  const profileImage = data.me.image ?? userImage;
  const smartMeetingsEnabled = useRealiteFeatureFlag("smart-meetings", true);
  const datingModeEnabled = useRealiteFeatureFlag("dating-mode", false);

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

  // Kategorie aus Titel, Tags und Beschreibung vorschlagen (nutzer kann sie im Formular anpassen)
  useEffect(() => {
    if (!showEventForm) return;
    const tags = eventForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const suggested = inferEventCategory({
      title: eventForm.title,
      description: eventForm.description,
      tags,
    });
    setEventForm((state) => ({ ...state, category: suggested }));
  }, [showEventForm, eventForm.title, eventForm.tags, eventForm.description]);

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
            .filter(Boolean),
          color: eventForm.color && eventForm.color.trim() ? eventForm.color.trim() : null,
          category: eventForm.category,
        })
      });

      const payload = (await response.json()) as {
        error?: string;
        event?: {
          id: string;
          visibility: "public" | "group";
          groupId: string | null;
          tags: string[];
          startsAt: string;
          endsAt: string;
        };
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Event konnte nicht erstellt werden");
      }

      if (payload.event) {
        captureProductEvent("event_created", {
          event_id: payload.event.id,
          visibility: payload.event.visibility,
          has_group: Boolean(payload.event.groupId),
          tag_count: payload.event.tags.length
        });
      }

      setEventForm({
        title: "",
        description: "",
        location: "",
        startsAt: "",
        endsAt: "",
        visibility: "public",
        groupId: "",
        tags: "#kontakte",
        color: "",
        category: "default",
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
            <button
              onClick={() => setShowEventForm((current) => !current)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {showEventForm ? "Event schließen" : "Neues Event"}
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
        {data.sync.contactsWarning ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Kontakte-Sync Warnung: {data.sync.contactsWarning}
          </div>
        ) : null}
        {data.sync.smartWarning ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Smart-Treffen-Warnung: {data.sync.smartWarning}
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
                placeholder={datingModeEnabled ? "#alle, #kontakte, #date" : "#alle, #kontakte"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {datingModeEnabled ? (
                <p className="text-xs text-slate-500">
                  Für `#date` brauchst du ein freigeschaltetes Dating-Profil in den Profileinstellungen. `#date` kann nicht mit
                  `#alle` oder `#kontakte` kombiniert werden.
                </p>
              ) : null}
              <p className="text-xs text-slate-500">
                Smart-Treffen-Shortcut im Titel: `!min=3 !frist=24h !fenster=24h` (setzt Mindestzusagen, Frist und Suchfenster).
              </p>
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
              <div>
                <label htmlFor="event-category" className="mb-1 block text-xs font-medium text-slate-600">
                  Kategorie (für Kalenderansicht)
                </label>
                <select
                  id="event-category"
                  value={eventForm.category}
                  onChange={(event) =>
                    setEventForm((state) => ({ ...state, category: event.target.value as EventCategory }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {EVENT_CATEGORY_VALUES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Wird aus Titel und Tags erkannt; du kannst sie hier anpassen.
                </p>
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

        {smartMeetingsEnabled ? (
          <SmartMeetingsCard
            groups={visibleGroups}
            smartMeetings={data.smartMeetings}
            onCreated={async () => {
              await loadData({ silent: true });
            }}
            onError={(message) => setError(message)}
          />
        ) : null}

        <section id="events" className="mt-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Alle sichtbaren Events</h2>
          <p className="mt-1 text-sm text-slate-600">Deine Events nach Kategorie, in zeitlicher Reihenfolge.</p>
          <div className="mt-4 space-y-6">
            {visibleEvents.length === 0 ? (
              <p className="text-sm text-slate-500">
                Noch keine Events vorhanden. Lege ein Event an oder öffne <a href="/groups" className="text-teal-700 underline">Gruppen</a>.
              </p>
            ) : null}
            {eventsByCategory.map(([category, events]) => (
              <div key={category}>
                <div
                  className="mb-2 flex items-center gap-2 border-b border-slate-200 pb-1.5"
                  style={{ borderBottomColor: CATEGORY_COLORS[category] }}
                >
                  <span
                    className="inline-block h-3 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[category] }}
                    aria-hidden
                  />
                  <h3 className="text-sm font-semibold text-slate-700">{CATEGORY_LABELS[category]}</h3>
                  <span className="text-xs text-slate-500">({events.length})</span>
                </div>
                <div className="space-y-2">
                  {events.map((event) => {
                    const accepted = data.acceptedByEventId?.[event.id] ?? [];
                    const coverUrl = event.placeImageUrl ?? event.linkPreviewImageUrl ?? null;
                    const borderColor = event.color ?? CATEGORY_COLORS[event.category ?? "default"];
                    return (
                      <article
                        key={event.id}
                        className="overflow-hidden rounded-md border border-slate-200"
                        style={{ borderLeftWidth: "4px", borderLeftColor: borderColor }}
                      >
                        <div className="flex">
                          {coverUrl ? (
                            <a
                              href={`/e/${shortenUUID(event.id)}`}
                              className="relative h-20 w-24 shrink-0 bg-slate-100 sm:h-24 sm:w-28"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={coverUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </a>
                          ) : null}
                          <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2 p-3">
                            <div>
                              <a
                                href={`/e/${shortenUUID(event.id)}`}
                                className="break-words text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-teal-500"
                              >
                                {event.title.replace(/#[^\s]+/gi, "").trim()}
                              </a>
                              <p className="text-xs text-slate-500">
                                {new Date(event.startsAt).toLocaleString("de-DE")} - {new Date(event.endsAt).toLocaleTimeString("de-DE")} ·{" "}
                                {event.tags.join(" · ")}
                              </p>
                              {accepted.length > 0 && (
                                <p className="mt-1 text-xs text-teal-700">
                                  Zugesagt: {accepted.map((u) => u.name ?? u.email).join(", ")}
                                </p>
                              )}
                            </div>
                            {acceptedEventIds.has(event.id) && (
                              <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                                Du hast zugesagt
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
