"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { List, Sparkle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/src/components/app-shell";
import { EventImage } from "@/src/components/event-image";
import { SmartMeetingsCard } from "@/src/components/smart-meetings-card";
import { toast, REVALIDATING_TOAST_ID } from "@/src/components/toaster";
import { EVENT_JOIN_MODE_VALUES, getEventJoinModeMeta, type EventJoinMode } from "@/src/lib/event-join-modes";
import { getEventPatternMeta } from "@/src/lib/activity-patterns";
import { DASHBOARD_QUERY_KEY, fetchDashboard as fetchDashboardApi } from "@/src/lib/dashboard-query";
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
  joinMode: EventJoinMode;
  color: string | null;
  category: EventCategory;
  placeImageUrl: string | null;
  linkPreviewImageUrl: string | null;
  createdBy: string;
  sourceProvider: string | null;
};

type Suggestion = {
  id: string;
  eventId: string;
  status: "pending" | "calendar_inserted" | "accepted" | "declined";
  title: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  score: number;
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
    status: "awaiting_approval" | "pending" | "secured" | "expired" | "cancelled";
    invitedEmails: string[];
    approvalCandidates: Array<{
      email: string;
      label: string;
    }>;
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
    id: string;
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

async function fetchDashboard(): Promise<DashboardPayload> {
  return fetchDashboardApi() as Promise<DashboardPayload>;
}

const emptyPayload: DashboardPayload = {
  me: {
    id: "",
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

function getAcceptedDisplayNames(accepted: AcceptedUser[], limit = 3) {
  return accepted.slice(0, limit).map((user) => user.name ?? user.email);
}

function getAcceptedCountLabel(count: number) {
  if (count === 1) {
    return "1 Zusage";
  }

  return `${count} Zusagen`;
}

function getDashboardSuggestionTiming(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  return `${start.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  })} · ${start.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  })} - ${end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
}

function getDashboardReasonHeadline(reason: string) {
  const trimmed = reason.trim();
  const firstSentence = trimmed.split(/[.!?](?:\s|$)/, 1)[0]?.trim() ?? "";

  if (!firstSentence) {
    return "Passender Vorschlag";
  }

  return firstSentence.length > 72 ? `${firstSentence.slice(0, 69).trimEnd()}...` : firstSentence;
}

export function Dashboard({
  view = "now",
  userName,
  userEmail,
  userImage
}: {
  view?: "now" | "events";
  userName: string;
  userEmail: string;
  userImage: string | null;
}) {
  const queryClient = useQueryClient();
  const {
    data: queryData,
    isPending: loading,
    error: queryError,
  } = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboard,
    refetchInterval: (query) =>
      query.state.data?.sync?.revalidating ? 2_500 : 45_000,
  });
  const data = queryData ?? emptyPayload;

  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    location: "",
    startsAt: "",
    endsAt: "",
    visibility: "public" as "public" | "group",
    joinMode: "direct" as EventJoinMode,
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
    return Array.from(map.entries())
      .map(([category, events]) => [
        category,
        [...events].sort((a, b) => {
          const acceptedDiff =
            (data.acceptedByEventId?.[b.id]?.length ?? 0) - (data.acceptedByEventId?.[a.id]?.length ?? 0);
          if (acceptedDiff !== 0) {
            return acceptedDiff;
          }

          return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
        }),
      ] as const)
      .filter(([, list]) => list.length > 0);
  }, [data.acceptedByEventId, visibleEvents]);

  type DayItem = { id: string; eventId: string; title: string; startsAt: string; endsAt: string; event: EventItem };

  /** Vorschläge mit Handlungsbedarf stehen in Jetzt explizit vor dem offenen Feed. */
  const pendingSuggestions = useMemo(
    () =>
      [...data.suggestions]
        .filter((s) => s.status === "pending" || s.status === "calendar_inserted")
        .sort((a, b) => {
          const acceptedDiff =
            (data.acceptedByEventId?.[b.eventId]?.length ?? 0) - (data.acceptedByEventId?.[a.eventId]?.length ?? 0);
          if (acceptedDiff !== 0) {
            return acceptedDiff;
          }

          return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
        }) as (Suggestion & { title: string; startsAt: string; endsAt: string })[],
    [data.acceptedByEventId, data.suggestions]
  );
  const nowFeedEvents = useMemo(
    () =>
      visibleEvents.filter((event) => {
        const acceptedCount = data.acceptedByEventId?.[event.id]?.length ?? 0;
        const isOwnEvent = event.createdBy === data.me.id;

        if (!isOwnEvent) {
          return true;
        }

        return acceptedCount > 0 || acceptedEventIds.has(event.id);
      }),
    [acceptedEventIds, data.acceptedByEventId, data.me.id, visibleEvents]
  );
  const itemsByDay = useMemo(() => {
    const itemList: DayItem[] = [];
    for (const event of nowFeedEvents) {
      itemList.push({
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
  }, [nowFeedEvents]);

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
    if (!showEventForm) return;
    const hasDateTag = eventForm.tags.toLowerCase().includes("#date");
    if (!hasDateTag || eventForm.joinMode === "interest") {
      return;
    }
    setEventForm((state) => ({ ...state, joinMode: "interest" }));
  }, [showEventForm, eventForm.joinMode, eventForm.tags]);

  useEffect(() => {
    if (!data.sync.revalidating) {
      toast.dismiss(REVALIDATING_TOAST_ID);
      return;
    }
    toast.loading("Aktualisierung im Hintergrund läuft. Neue Kalender- und Kontaktdaten erscheinen automatisch.", {
      id: REVALIDATING_TOAST_ID,
      duration: Number.POSITIVE_INFINITY,
    });
    return () => {
      toast.dismiss(REVALIDATING_TOAST_ID);
    };
  }, [data.sync.revalidating]);

  async function createEvent(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventForm,
          startsAt: new Date(eventForm.startsAt).toISOString(),
          endsAt: new Date(eventForm.endsAt).toISOString(),
          groupId: eventForm.groupId || null,
          joinMode: eventForm.joinMode,
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
          visibility: "public" | "group" | "smart_date";
          joinMode: EventJoinMode;
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
          join_mode: payload.event.joinMode,
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
        joinMode: "direct",
        groupId: "",
        tags: "#kontakte",
        color: "",
        category: "default",
      });
      setShowEventForm(false);
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  const pendingCount = data.suggestions.filter((s) => s.status === "pending" || s.status === "calendar_inserted").length;
  const eventsWithoutAccepted = visibleEvents.filter((e) => (data.acceptedByEventId?.[e.id] ?? []).length === 0);
  const isEventsView = view === "events";
  const acceptedEvents = useMemo(
    () => visibleEvents.filter((event) => acceptedEventIds.has(event.id)),
    [acceptedEventIds, visibleEvents]
  );
  const ownPlannedEvents = useMemo(
    () => visibleEvents.filter((event) => !acceptedEventIds.has(event.id) && event.createdBy === data.me.id),
    [acceptedEventIds, data.me.id, visibleEvents]
  );
  const hiddenOwnPlanningEvents = useMemo(
    () => ownPlannedEvents.filter((event) => (data.acceptedByEventId?.[event.id] ?? []).length === 0),
    [data.acceptedByEventId, ownPlannedEvents]
  );
  const calendarContextEvents = useMemo(
    () =>
      visibleEvents.filter((event) => !acceptedEventIds.has(event.id) && event.createdBy !== data.me.id),
    [acceptedEventIds, data.me.id, visibleEvents]
  );
  const eventSections = useMemo(
    () => [
      {
        id: "confirmed",
        title: "Zugesagt & bestätigt",
        description: "Aktivitäten, bei denen du schon dabei bist oder die bereits klar zugesagt sind.",
        empty: "Sobald du auf Vorschläge reagierst oder Zusagen reinkommen, erscheinen sie hier.",
        events: acceptedEvents
      },
      {
        id: "owned",
        title: "Deine Planung",
        description: "Eigene Events, die du angelegt hast und aktiv verwaltest oder teilst.",
        empty: "Eigene neue Aktivitäten landen nach dem Erstellen in diesem Bereich.",
        events: ownPlannedEvents
      },
      {
        id: "context",
        title: "Kalenderkontext",
        description: "Weitere sichtbare Termine aus deinem Sozialkalender, die dir gerade Kontext geben.",
        empty: "Wenn weitere sichtbare Termine vorhanden sind, tauchen sie hier auf.",
        events: calendarContextEvents
      }
    ],
    [acceptedEvents, calendarContextEvents, ownPlannedEvents]
  );
  const eventPreviewSections = useMemo(
    () =>
      eventSections.map((section) => ({
        ...section,
        previewEvent: section.events[0] ?? null
      })),
    [eventSections]
  );
  const smartMeetingsCount = data.smartMeetings.length;
  const smartMeetingsNeedingApproval = data.smartMeetings.filter(
    (meeting) => meeting.latestRun?.status === "awaiting_approval"
  ).length;
  const nextJoinableEvent = useMemo(
    () =>
      visibleEvents.find(
        (event) => event.createdBy !== data.me.id && !acceptedEventIds.has(event.id)
      ) ?? null,
    [acceptedEventIds, data.me.id, visibleEvents]
  );
  const joinCtaHref = nextJoinableEvent ? `/e/${shortenUUID(nextJoinableEvent.id)}` : "/events#events";
  const joinCtaLabel = nextJoinableEvent ? "Mitmachen" : "Events ansehen";
  const joinCtaHint = nextJoinableEvent ? "eine sichtbare Aktivität öffnen" : "sichtbare Aktivitäten öffnen";
  const suggestionCtaLabel = pendingCount > 0 ? "Reagieren" : "Vorschläge prüfen";

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
          aria-label={isEventsView ? "Deine Event-Ansicht" : "Was kannst du heute machen?"}
        >
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_60%_0%,rgba(77,129,114,0.4),transparent)]" />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-100">
                {isEventsView ? "Verwalten" : "Entdecken"}
              </p>
              <h1 className="text-lg font-bold tracking-tight text-white md:mt-1 md:text-2xl">
                {isEventsView ? "Deine Events & Aktivitäten" : "Was geht heute?"}
              </h1>
              <p className="mt-1 hidden text-sm text-teal-100 md:block md:max-w-xl md:text-base">
                {isEventsView
                  ? "Das ist deine persönliche Kalender- und Sozialkalender-Ansicht: planen, verwalten, zusagen und teilen."
                  : "Coole Aktivitäten entdecken, bei was dabei sein oder selbst was starten."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isEventsView ? (
                <a
                  href="/now"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-bold text-teal-900 shadow-md transition hover:bg-teal-50 active:bg-teal-100"
                >
                  Zur Jetzt-Ansicht
                </a>
              ) : (
                <>
                  <a
                    href="/suggestions"
                    className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-bold text-teal-900 shadow-md transition hover:bg-teal-50 active:bg-teal-100"
                  >
                    {suggestionCtaLabel}
                    {pendingCount > 0 ? (
                      <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-teal-900">
                        {pendingCount}
                      </span>
                    ) : null}
                  </a>
                  <a
                    href={joinCtaHref}
                    className="inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    {joinCtaLabel}
                  </a>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowEventForm((v) => !v)}
                className="inline-flex items-center justify-center rounded-xl border border-white/35 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                {showEventForm ? "Schließen" : "Erstellen"}
              </button>
            </div>
          </div>
          {!isEventsView ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-teal-50">
              <span className="rounded-full bg-white/10 px-3 py-1">
                1. Reagieren
                <span className="ml-1 text-teal-100">wenn etwas offen ist</span>
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                2. Mitmachen
                <span className="ml-1 text-teal-100">{joinCtaHint}</span>
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                3. Erstellen
                <span className="ml-1 text-teal-100">wenn noch nichts passt</span>
              </span>
            </div>
          ) : null}
        </section>

        {isEventsView ? (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:mt-6 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Einordnung</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">Events ist deine persönliche Verwaltungsansicht</h2>
            <p className="mt-2 text-sm text-slate-600">
              Hier sammelst du alle sichtbaren Termine, Zusagen und eigenen Aktivitäten. Für schnelle Reaktionen und spontane Optionen ist
              die <a href="/now" className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800">Jetzt-Ansicht</a> gedacht.
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Bereiche in Events</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href="#events"
                    className="inline-flex items-center rounded-full border border-teal-200 bg-white px-3 py-1.5 text-sm font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50"
                  >
                    Sozialkalender
                  </a>
                  <a
                    href="#smart-meetings"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    Smart Treffen
                  </a>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Erst kommen zugesagte, eigene und kontextuelle Aktivitäten. Smart Treffen bleiben darunter als eigener Planungsbereich.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Smart Treffen</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {smartMeetingsCount === 0
                    ? "Kein aktives Smart Treffen"
                    : `${smartMeetingsCount} Smart ${smartMeetingsCount === 1 ? "Treffen" : "Treffen"} im Planungsbereich`}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {smartMeetingsNeedingApproval > 0
                    ? `${smartMeetingsNeedingApproval} ${smartMeetingsNeedingApproval === 1 ? "Lauf braucht" : "Läufe brauchen"} gerade deine Freigabe für Kalendereinladungen.`
                    : "Hier planst du Gruppen-Termine, ohne die Hauptnavigation stärker aufzublähen."}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {!isEventsView ? (
          <section className="mt-5 md:mt-6" aria-label="Was geht? Nach Tag">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 md:text-lg">Offene Aktivitäten nach Tag</h2>
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
          <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Reagieren zuerst</p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">Vorschläge mit Handlungsbedarf</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Entscheide zuerst über offene Vorschläge. Danach ist der Feed nur noch für sichtbare Aktivitäten zum Mitmachen da.
                </p>
              </div>
              <p className="text-sm font-medium text-amber-800">
                {pendingSuggestions.length === 0
                  ? "Gerade nichts offen"
                  : `${pendingSuggestions.length} offene${pendingSuggestions.length === 1 ? "r Vorschlag" : " Vorschläge"}`}
              </p>
            </div>
            {pendingSuggestions.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-white/80 p-4 text-sm text-slate-600">
                Im Moment wartet keine Entscheidung auf dich. Nutze den Feed darunter für offene Aktivitäten oder starte neues Matching.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {pendingSuggestions.map((suggestion) => {
                  const accepted = data.acceptedByEventId?.[suggestion.eventId] ?? [];
                  const acceptedNames = getAcceptedDisplayNames(accepted);
                  const remainingAccepted = accepted.length - acceptedNames.length;

                  return (
                    <a
                      key={suggestion.id}
                      href={`/suggestions?suggestion=${suggestion.id}`}
                      className="rounded-xl border border-amber-200 bg-white p-4 transition hover:border-amber-300 hover:bg-amber-50/70"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                          Jetzt reagieren
                        </span>
                        {accepted.length > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800">
                            {getAcceptedCountLabel(accepted.length)}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-slate-900">
                        {suggestion.title.replace(/#[^\s]+/gi, "").trim()}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">{getDashboardSuggestionTiming(suggestion.startsAt, suggestion.endsAt)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {suggestion.createdByName ? `Von ${suggestion.createdByName}` : "Passender Vorschlag"} · Score{" "}
                        {suggestion.score.toFixed(2)}
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">Warum jetzt?</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{getDashboardReasonHeadline(suggestion.reason)}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{suggestion.reason}</p>
                        </div>
                        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-800">Wer ist dabei?</p>
                          {accepted.length > 0 ? (
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {acceptedNames.join(", ")}
                              {remainingAccepted > 0 ? ` +${remainingAccepted}` : ""}
                            </p>
                          ) : (
                            <p className="mt-2 text-sm font-medium text-slate-900">Noch niemand zugesagt</p>
                          )}
                          <p className="mt-1 text-xs text-slate-600">
                            {accepted.length > 0 ? "Schon Momentum vorhanden." : "Du könntest die erste Zusage sein."}
                          </p>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          {hiddenOwnPlanningEvents.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Deine Planung bleibt in Events</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    {hiddenOwnPlanningEvents.length === 1
                      ? "1 eigenes Event ohne Zusagen wurde aus Jetzt herausgenommen"
                      : `${hiddenOwnPlanningEvents.length} eigene Events ohne Zusagen wurden aus Jetzt herausgenommen`}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    So bleibt der Feed auf offene Aktivitäten zum Reagieren und Mitmachen fokussiert. Deine eigene Planung findest du gesammelt in{" "}
                    <a href="/events#events" className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800">
                      Events
                    </a>.
                  </p>
                </div>
                <a
                  href="/events#events"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Planung öffnen
                </a>
              </div>
            </div>
          ) : null}
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
                    Reagiere zuerst auf <a href="/suggestions" className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800">Vorschläge</a>, schau dann nach offenen Aktivitäten oder starte selbst etwas.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <a
                      href="/suggestions"
                      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                    >
                      {suggestionCtaLabel}
                    </a>
                    <a
                      href={joinCtaHref}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {joinCtaLabel}
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowEventForm(true)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Erstellen
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
                        const acceptedNames = getAcceptedDisplayNames(accepted);
                        const remainingAccepted = accepted.length - acceptedNames.length;
                        const isAccepted = acceptedEventIds.has(item.eventId);
                        const isOwnEvent = item.event.createdBy === data.me.id;
                        const eventPattern = getEventPatternMeta({ isOwnEvent, isAccepted });
                        const coverUrl = item.event.placeImageUrl ?? item.event.linkPreviewImageUrl ?? null;
                        const borderColor = item.event.color ?? CATEGORY_COLORS[item.event.category ?? "default"];
                        const joinModeMeta = getEventJoinModeMeta(item.event.joinMode);
                        return (
                          <li key={`event-${item.eventId}`}>
                            <a
                              href={`/e/${shortenUUID(item.eventId)}`}
                              className={`flex gap-3 rounded-xl border p-4 text-left transition hover:border-teal-200 ${
                                accepted.length > 0
                                  ? "border-teal-200 bg-teal-50/60 hover:bg-teal-50"
                                  : "border-slate-200 bg-white hover:bg-teal-50/30"
                              }`}
                              style={{ borderLeftWidth: "4px", borderLeftColor: borderColor }}
                            >
                              {coverUrl ? (
                                <span className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-20 sm:w-28">
                                  <EventImage src={coverUrl} className="h-full w-full object-cover" />
                                </span>
                              ) : null}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${eventPattern.badgeClassName}`}
                                  >
                                    {eventPattern.label}
                                  </span>
                                  {accepted.length > 0 ? (
                                    <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-semibold text-teal-800">
                                      {getAcceptedCountLabel(accepted.length)}
                                    </span>
                                  ) : null}
                                </div>
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
                                <p className="mt-1 text-xs font-medium text-slate-600">Mitmachen: {joinModeMeta.shortLabel}</p>
                                <div className="mt-2 rounded-lg bg-white/80 px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    Wer ist dabei?
                                  </p>
                                  {accepted.length > 0 ? (
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-medium text-slate-800">
                                        {acceptedNames.join(", ")}
                                        {remainingAccepted > 0 ? ` +${remainingAccepted}` : ""}
                                      </p>
                                      <span className="text-xs font-medium text-teal-700">
                                        Schon Leute dabei
                                      </span>
                                    </div>
                                  ) : (
                                    <p className="mt-0.5 text-sm text-slate-500">Noch niemand zugesagt</p>
                                  )}
                                </div>
                                <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                                  <span>{eventPattern.actionLabel}</span>
                                  <span aria-hidden>→</span>
                                </div>
                              </div>
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
        ) : null}

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

        {(queryError || submitError) ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError ?? (queryError instanceof Error ? queryError.message : String(queryError))}
          </div>
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
              <div className="grid gap-3 sm:grid-cols-3">
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
                  value={eventForm.joinMode}
                  onChange={(event) =>
                    setEventForm((state) => ({ ...state, joinMode: event.target.value as EventJoinMode }))
                  }
                  disabled={eventForm.tags.toLowerCase().includes("#date")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {EVENT_JOIN_MODE_VALUES.map((mode) => {
                    const meta = getEventJoinModeMeta(mode);
                    return (
                      <option key={mode} value={mode}>
                        {meta.label}
                      </option>
                    );
                  })}
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
              <p className="text-xs text-slate-500">
                Join-Modus: <span className="font-medium text-slate-700">{getEventJoinModeMeta(eventForm.joinMode).label}</span> ·{" "}
                {eventForm.tags.toLowerCase().includes("#date")
                  ? "Bei #date nutzt Realite aus Privatsphäre-Gründen automatisch zuerst Interesse zeigen."
                  : getEventJoinModeMeta(eventForm.joinMode).description}
              </p>
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

        {isEventsView ? (
          <section id="events" className="mt-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Events als Sozialkalender</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Hier trennst du bestätigte Aktivitäten, eigene Planung und übrigen Kalenderkontext sauber voneinander.
                </p>
              </div>
              <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Zugesagt</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{acceptedEvents.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Eigen</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{ownPlannedEvents.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Kontext</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{calendarContextEvents.length}</p>
                </div>
              </div>
            </div>
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
              {eventSections.map((section) => {
                const sectionEventsByCategory = eventsByCategory
                  .map(([category, events]) => [category, events.filter((event) => section.events.some((candidate) => candidate.id === event.id))] as const)
                  .filter(([, events]) => events.length > 0);

                return (
                  <section key={section.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{section.description}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {section.events.length === 0 ? "Leer" : `${section.events.length} Termine`}
                      </span>
                    </div>

                    {section.events.length === 0 ? (
                      <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                        {section.empty}
                      </p>
                    ) : (
                      <div className="mt-4 space-y-5">
                        {sectionEventsByCategory.map(([category, events]) => (
                          <div key={`${section.id}-${category}`}>
                            <div
                              className="mb-2 flex items-center gap-2 border-b border-slate-200 pb-1.5"
                              style={{ borderBottomColor: CATEGORY_COLORS[category] }}
                            >
                              <span
                                className="inline-block h-3 w-1 shrink-0 rounded-full"
                                style={{ backgroundColor: CATEGORY_COLORS[category] }}
                                aria-hidden
                              />
                              <h4 className="text-sm font-semibold text-slate-700">{CATEGORY_LABELS[category]}</h4>
                              <span className="text-xs text-slate-500">({events.length})</span>
                            </div>
                            <div className="space-y-2">
                              {events.map((event) => {
                                const accepted = data.acceptedByEventId?.[event.id] ?? [];
                                const acceptedNames = getAcceptedDisplayNames(accepted);
                                const remainingAccepted = accepted.length - acceptedNames.length;
                                const coverUrl = event.placeImageUrl ?? event.linkPreviewImageUrl ?? null;
                                const borderColor = event.color ?? CATEGORY_COLORS[event.category ?? "default"];
                                const isOwnEvent = event.createdBy === data.me.id;
                                const isAccepted = acceptedEventIds.has(event.id);
                                const eventPattern = getEventPatternMeta({ isOwnEvent, isAccepted });
                                const joinModeMeta = getEventJoinModeMeta(event.joinMode);
                                const contextLabel =
                                  section.id === "context" && event.sourceProvider
                                    ? "Aus deinem Kalenderkontext"
                                    : isOwnEvent
                                      ? "Von dir angelegt"
                                      : null;

                                return (
                                  <article
                                    key={event.id}
                                    className={`overflow-hidden rounded-md border ${
                                      accepted.length > 0 ? "border-teal-200 bg-teal-50/40" : "border-slate-200 bg-white"
                                    }`}
                                    style={{ borderLeftWidth: "4px", borderLeftColor: borderColor }}
                                  >
                                    <div className="flex">
                                      {coverUrl ? (
                                        <a
                                          href={`/e/${shortenUUID(event.id)}`}
                                          className="relative block h-20 w-24 shrink-0 bg-slate-100 sm:h-24 sm:w-28"
                                        >
                                          <EventImage src={coverUrl} className="h-full w-full object-cover" />
                                        </a>
                                      ) : null}
                                      <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2 p-3">
                                        <div>
                                          <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <span
                                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${eventPattern.badgeClassName}`}
                                            >
                                              {eventPattern.label}
                                            </span>
                                            {accepted.length > 0 ? (
                                              <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-semibold text-teal-800">
                                                {getAcceptedCountLabel(accepted.length)}
                                              </span>
                                            ) : null}
                                            {contextLabel ? (
                                              <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                                {contextLabel}
                                              </span>
                                            ) : null}
                                          </div>
                                          <a
                                            href={`/e/${shortenUUID(event.id)}`}
                                            className="break-words text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-teal-500"
                                          >
                                            {event.title.replace(/#[^\s]+/gi, "").trim()}
                                          </a>
                                          <p className="text-xs text-slate-500">
                                            {new Date(event.startsAt).toLocaleString("de-DE")} -{" "}
                                            {new Date(event.endsAt).toLocaleTimeString("de-DE")}
                                            {event.tags.length > 0 ? ` · ${event.tags.join(" · ")}` : ""}
                                          </p>
                                          <p className="mt-1 text-xs font-medium text-slate-600">Mitmachen: {joinModeMeta.shortLabel}</p>
                                          <div className="mt-2 rounded-lg bg-white/80 px-3 py-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                              Wer ist dabei?
                                            </p>
                                            {accepted.length > 0 ? (
                                              <p className="mt-1 text-xs font-medium text-teal-800">
                                                {acceptedNames.join(", ")}
                                                {remainingAccepted > 0 ? ` +${remainingAccepted}` : ""}
                                              </p>
                                            ) : (
                                              <p className="mt-1 text-xs text-slate-500">Noch niemand zugesagt</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" aria-label="Events-Vorschau">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Verwalten separat</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Sozialkalender nur als Vorschau</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                  In <span className="font-medium text-slate-900">Jetzt</span> bleibt der Fokus auf Reagieren und Mitmachen. Deine
                  ausführliche Kalenderstruktur mit Planung, Zusagen und Kontext öffnest du gesammelt in{" "}
                  <a href="/events#events" className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800">
                    Events
                  </a>.
                </p>
              </div>
              <a
                href="/events#events"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Vollen Sozialkalender öffnen
              </a>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {eventPreviewSections.map((section) => {
                const previewEvent = section.previewEvent;
                const accepted = previewEvent ? data.acceptedByEventId?.[previewEvent.id] ?? [] : [];

                return (
                  <article key={section.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{section.description}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {section.events.length}
                      </span>
                    </div>
                    {previewEvent ? (
                      <a
                        href={`/e/${shortenUUID(previewEvent.id)}`}
                        className="mt-4 block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-teal-200 hover:bg-teal-50/40"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {previewEvent.title.replace(/#[^\s]+/gi, "").trim()}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(previewEvent.startsAt).toLocaleString("de-DE", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                        <p className="mt-2 text-xs font-medium text-slate-600">
                          {accepted.length > 0 ? `${getAcceptedCountLabel(accepted.length)} · Momentum sichtbar` : "Noch keine Zusagen"}
                        </p>
                      </a>
                    ) : (
                      <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                        {section.empty}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {smartMeetingsEnabled && isEventsView ? (
          <SmartMeetingsCard
            groups={visibleGroups}
            smartMeetings={data.smartMeetings}
            onCreated={() => queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY })}
            onError={(message) => setSubmitError(message)}
          />
        ) : null}
      </main>
    </AppShell>
  );
}
