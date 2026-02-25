"use client";

import { List, Sparkle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/src/components/app-shell";
import { EventImage } from "@/src/components/event-image";
import { SmartMeetingsCard } from "@/src/components/smart-meetings-card";
import { toast, REVALIDATING_TOAST_ID } from "@/src/components/toaster";
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
  id: string;
  eventId: string;
  status: "pending" | "calendar_inserted" | "accepted" | "declined";
  title: string;
  startsAt: string;
  endsAt: string;
  tags?: string[];
  createdByName?: string | null;
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
  const [searchQuery, setSearchQuery] = useState("");

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

  /** Vorschläge (pending/calendar_inserted) + Events pro Tag – Fokus: Was geht? Wer ist dabei? */
  const pendingSuggestions = useMemo(
    () =>
      data.suggestions.filter(
        (s) => s.status === "pending" || s.status === "calendar_inserted"
      ) as (Suggestion & { title: string; startsAt: string; endsAt: string })[],
    [data.suggestions]
  );
  const pendingSuggestionEventIds = useMemo(
    () => new Set(pendingSuggestions.map((s) => s.eventId)),
    [pendingSuggestions]
  );
  type DayItem =
    | { type: "suggestion"; id: string; eventId: string; title: string; startsAt: string; endsAt: string; suggestionId: string; createdByName?: string | null }
    | { type: "event"; id: string; eventId: string; title: string; startsAt: string; endsAt: string; event: EventItem };
  const itemsByDay = useMemo(() => {
    const itemList: DayItem[] = [];
    for (const s of pendingSuggestions) {
      itemList.push({
        type: "suggestion",
        id: s.eventId,
        eventId: s.eventId,
        title: s.title,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        suggestionId: s.id,
        createdByName: s.createdByName
      });
    }
    for (const event of visibleEvents) {
      if (pendingSuggestionEventIds.has(event.id)) continue;
      itemList.push({
        type: "event",
        id: event.id,
        eventId: event.id,
        title: event.title.replace(/#[^\s]+/gi, "").trim(),
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        event
      });
    }
    itemList.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    const byDay = new Map<string, { dayLabel: string; date: Date; items: DayItem[] }>();
    for (const item of itemList) {
      const d = new Date(item.startsAt);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const existing = byDay.get(dayKey);
      const dayLabel = d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
      if (existing) {
        existing.items.push(item);
      } else {
        byDay.set(dayKey, { dayLabel, date: d, items: [item] });
      }
    }
    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dayKey, value]) => ({ dayKey, ...value }));
  }, [pendingSuggestions, pendingSuggestionEventIds, visibleEvents]);

  const filteredItemsByDay = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return itemsByDay;
    return itemsByDay
      .map((day) => ({
        ...day,
        items: day.items.filter((item) => item.title.toLowerCase().includes(q)),
      }))
      .filter((day) => day.items.length > 0);
  }, [itemsByDay, searchQuery]);

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
      toast.dismiss(REVALIDATING_TOAST_ID);
      return;
    }

    toast.loading("Aktualisierung im Hintergrund läuft. Neue Kalender- und Kontaktdaten erscheinen automatisch.", {
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

  const pendingCount = data.suggestions.filter((s) => s.status === "pending" || s.status === "calendar_inserted").length;
  const eventsWithoutAccepted = visibleEvents.filter((e) => (data.acceptedByEventId?.[e.id] ?? []).length === 0);

  return (
    <AppShell
      user={{
        name: profileName,
        email: profileEmail,
        image: profileImage
      }}
    >
      <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
        {/* Mobile: Events zuerst. Desktop: Hero + Kontext. */}
        <section
          className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900 px-4 py-4 text-white shadow-lg md:rounded-3xl md:px-6 md:py-7"
          aria-label="Was kannst du heute machen?"
        >
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_60%_0%,rgba(77,129,114,0.4),transparent)]" />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-white md:mt-1 md:text-2xl">
                Was geht heute?
              </h1>
              <p className="mt-1 hidden text-sm text-teal-100 md:block md:max-w-xl md:text-base">
                Coole Aktivitäten entdecken, bei was dabei sein oder selbst was starten.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/suggestions"
                className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-bold text-teal-900 shadow-md transition hover:bg-teal-50 active:bg-teal-100"
              >
                Vorschläge
                {pendingCount > 0 ? (
                  <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-teal-900">
                    {pendingCount}
                  </span>
                ) : null}
              </a>
              <button
                type="button"
                onClick={() => setShowEventForm((v) => !v)}
                className="inline-flex items-center justify-center rounded-xl border border-white/35 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                {showEventForm ? "Schließen" : "Event starten"}
              </button>
            </div>
          </div>
        </section>

        {/* Was geht? Nach Tag – Fokus auf Events, „Wer ist dabei“ klar */}
        <section className="mt-5 md:mt-6" aria-label="Was geht? Nach Tag">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 md:text-lg">Nach Tag</h2>
            <div className="flex items-center gap-1">
              <input
                type="search"
                placeholder="Suchen…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-24 rounded-full border border-slate-200 bg-slate-50/80 py-1.5 pl-3 pr-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-300 md:w-32"
                aria-label="Events und Vorschläge durchsuchen"
              />
              <a
                href="/suggestions"
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                title="Vorschläge"
              >
                {pendingCount > 0 ? (
                  <span className="relative inline-flex">
                    <Sparkle className="h-5 w-5 md:h-4 md:w-4" weight="duotone" />
                    <span className="absolute -right-1 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                      {pendingCount}
                    </span>
                  </span>
                ) : (
                  <Sparkle className="h-5 w-5 md:h-4 md:w-4" weight="regular" />
                )}
              </a>
              <a
                href="/events#events"
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                title="Alle Events"
              >
                <List className="h-5 w-5 md:h-4 md:w-4" weight="regular" />
              </a>
            </div>
          </div>
          {filteredItemsByDay.length === 0 && !loading ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
              {searchQuery.trim() ? (
                <>
                  <p className="text-sm font-medium text-slate-700">Keine Treffer für „{searchQuery.trim()}“</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-3 text-sm font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800"
                  >
                    Suche zurücksetzen
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">Noch nichts geplant?</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Schau unter <a href="/suggestions" className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800">Vorschläge</a> oder starte ein eigenes Event.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <a
                      href="/suggestions"
                      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                    >
                      Vorschläge
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowEventForm(true)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Event starten
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-8">
              {filteredItemsByDay.map(({ dayKey, dayLabel, date: dayDate, items }) => {
                const isToday = (() => {
                  const t = new Date();
                  return dayDate.getDate() === t.getDate() && dayDate.getMonth() === t.getMonth() && dayDate.getFullYear() === t.getFullYear();
                })();
                return (
                  <div key={dayKey}>
                    <h3 className="mb-3 text-base font-semibold text-slate-800">
                      {isToday ? "Heute" : dayLabel}
                      <span className="ml-2 text-sm font-normal text-slate-500">({items.length})</span>
                    </h3>
                    <ul className="space-y-3">
                      {items.map((item) => {
                        const accepted = data.acceptedByEventId?.[item.eventId] ?? [];
                        const isAccepted = acceptedEventIds.has(item.eventId);
                        if (item.type === "suggestion") {
                          return (
                            <li key={`suggestion-${item.suggestionId}`}>
                              <a
                                href={`/suggestions?suggestion=${item.suggestionId}`}
                                className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50"
                              >
                                <span className="inline-flex w-fit items-center rounded-md bg-amber-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                                  Vorschlag
                                </span>
                                <span className="font-medium text-slate-900">{item.title}</span>
                                <p className="text-xs text-slate-500">
                                  {new Date(item.startsAt).toLocaleString("de-DE", {
                                    weekday: "short",
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}{" "}
                                  –{" "}
                                  {new Date(item.endsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                                  {item.createdByName ? ` · von ${item.createdByName}` : ""}
                                </p>
                                <div className="mt-2 rounded-lg bg-white/60 py-2 pr-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/80">
                                    Wer ist dabei?
                                  </p>
                                  {accepted.length > 0 ? (
                                    <p className="mt-0.5 text-sm font-medium text-slate-800">
                                      {accepted.map((u) => u.name ?? u.email).join(", ")}
                                    </p>
                                  ) : (
                                    <p className="mt-0.5 text-sm text-slate-600">Noch niemand – du könntest der erste sein</p>
                                  )}
                                </div>
                              </a>
                            </li>
                          );
                        }
                        const coverUrl = item.event.placeImageUrl ?? item.event.linkPreviewImageUrl ?? null;
                        const borderColor = item.event.color ?? CATEGORY_COLORS[item.event.category ?? "default"];
                        return (
                          <li key={`event-${item.eventId}`}>
                            <a
                              href={`/e/${shortenUUID(item.eventId)}`}
                              className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal-200 hover:bg-teal-50/30"
                              style={{ borderLeftWidth: "4px", borderLeftColor: borderColor }}
                            >
                              {coverUrl ? (
                                <span className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-20 sm:w-28">
                                  <EventImage src={coverUrl} className="h-full w-full object-cover" />
                                </span>
                              ) : null}
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-slate-900">{item.title}</span>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {new Date(item.startsAt).toLocaleString("de-DE", {
                                    weekday: "short",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}{" "}
                                  –{" "}
                                  {new Date(item.endsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                                <div className="mt-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    Wer ist dabei?
                                  </p>
                                  {accepted.length > 0 ? (
                                    <p className="mt-0.5 text-sm font-medium text-slate-800">
                                      {accepted.map((u) => u.name ?? u.email).join(", ")}
                                    </p>
                                  ) : (
                                    <p className="mt-0.5 text-sm text-slate-500">Noch niemand zugesagt</p>
                                  )}
                                </div>
                              </div>
                              {isAccepted ? (
                                <span className="shrink-0 self-center rounded-full bg-teal-100 px-2 py-1 text-[11px] font-semibold text-teal-800">
                                  Du dabei
                                </span>
                              ) : null}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Nudge: Events ohne Zusagen – Leute einladen */}
        {eventsWithoutAccepted.length > 0 && !showEventForm ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 sm:gap-4">
            <p className="text-sm font-medium text-amber-900">
              <span className="font-semibold">{eventsWithoutAccepted.length}</span> Event{eventsWithoutAccepted.length === 1 ? "" : "s"} warten noch auf Zusagen.
            </p>
            <p className="text-xs text-amber-800">
              Teile den Event-Link mit deiner Gruppe oder schick Einladungen – so wird’s voll.
            </p>
            <a
              href="/groups"
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
            >
              Gruppen & Einladen
            </a>
          </div>
        ) : null}

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
          <h2 className="text-lg font-semibold text-slate-900">Was gibt’s? Deine Events & Aktivitäten</h2>
          <p className="mt-1 text-sm text-slate-600">
            Alle sichtbaren Erlebnisse und Termine – dabei sein, Leute einladen oder selbst was starten.
          </p>
          <div className="mt-4 space-y-6">
            {visibleEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-center">
                <p className="text-sm font-medium text-slate-700">Noch keine Events? Los geht’s.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Lege ein Event an oder tritt <a href="/groups" className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800">Gruppen</a> bei – dann siehst du gemeinsame Aktivitäten und kannst Leute einladen.
                </p>
                <button
                  type="button"
                  onClick={() => setShowEventForm(true)}
                  className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  Erstes Event anlegen
                </button>
              </div>
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
                        className="relative block h-20 w-24 shrink-0 bg-slate-100 sm:h-24 sm:w-28"
                      >
                        <EventImage
                          src={coverUrl}
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
