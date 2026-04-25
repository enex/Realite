"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/src/components/app-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { GooglePlacesAutocomplete } from "@/src/components/google-places-autocomplete";
import { CalendarReconnectBanner } from "@/src/components/calendar-reconnect-banner";
import { EventImage } from "@/src/components/event-image";
import { SmartMeetingsCard } from "@/src/components/smart-meetings-card";
import { toast, REVALIDATING_TOAST_ID } from "@/src/components/toaster";
import type { EventJoinMode } from "@/src/lib/event-join-modes";
import {
  getDefaultEventPresenceVisibleUntil,
  getEventPresenceAudienceRuleCopy,
} from "@/src/lib/event-presence";
import { getEventPatternMeta } from "@/src/lib/activity-patterns";
import { getPersonDisplayLabel } from "@/src/lib/person-display";
import { captureProductEvent } from "@/src/lib/posthog/capture";
import { useRealiteFeatureFlag } from "@/src/lib/posthog/feature-flags";
import { shortenUUID } from "@/src/lib/utils/short-uuid";
import type { CalendarConnectionState } from "@/src/lib/calendar-connection-state";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  EVENT_CATEGORY_VALUES,
  type EventCategory,
  inferEventCategory,
} from "@/src/lib/event-categories";
import {
  getEventVisibilityMeta,
  type EventCreationVisibility,
  type EventVisibility,
} from "@/src/lib/event-visibility";
import { titleContainsDateTag } from "@/src/lib/dating";
import { DASHBOARD_QUERY_KEY, fetchDashboard as fetchDashboardApi } from "@/src/lib/dashboard-query";
import { getEventsViewMessaging } from "@/src/lib/calendar-messaging";

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
  visibility: EventVisibility;
  joinMode: EventJoinMode;
  allowOnSiteVisibility: boolean;
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
    approvalCandidates: Array<{ email: string; label: string }>;
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
    calendarConnectionState: CalendarConnectionState;
    calendarScope: string | null;
  };
  sync: {
    warning: string | null;
    stats: { synced: number; scanned: number } | null;
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
  weeklyShare: {
    token: string;
    weekStartsOn: string;
    openIntentions: string[];
    shouldPrompt: boolean;
    sharedAt: string | null;
    dismissedAt: string | null;
    visitCount: number;
    knownVisitors: Array<{
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      firstVisitedAt: string;
      lastVisitedAt: string;
    }>;
    pendingReferrals: Array<{
      id: string;
      userId: string;
      name: string | null;
      email: string;
      image: string | null;
      createdAt: string;
    }>;
  };
  acceptedByEventId?: Record<string, AcceptedUser[]>;
};

type QuickShareMode = "here_now" | "going";
type QuickShareAudience = EventCreationVisibility;

async function fetchDashboard(): Promise<DashboardPayload> {
  return fetchDashboardApi() as Promise<DashboardPayload>;
}

function titleContainsFriendsPlusTag(title: string) {
  return /(^|\s)#freunde\+(\b|$)/iu.test(title);
}

const emptyPayload: DashboardPayload = {
  me: {
    id: "",
    email: "",
    name: null,
    image: null,
    calendarConnected: false,
    calendarConnectionState: "not_connected",
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
  dating: { enabled: false, unlocked: false, missingRequirements: [] },
  groups: [],
  events: [],
  suggestions: [],
  smartMeetings: [],
  weeklyShare: {
    token: "",
    weekStartsOn: "",
    openIntentions: [],
    shouldPrompt: false,
    sharedAt: null,
    dismissedAt: null,
    visitCount: 0,
    knownVisitors: [],
    pendingReferrals: []
  }
};

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
    refetchInterval: (query) => query.state.data?.sync?.revalidating ? 2_500 : 45_000,
  });
  const data = queryData ?? emptyPayload;

  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quickShareError, setQuickShareError] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [quickShareOpen, setQuickShareOpen] = useState(false);
  const [quickShareForm, setQuickShareForm] = useState({
    activity: "",
    location: "",
    durationMinutes: 120,
    mode: "here_now" as QuickShareMode,
    audience: "friends" as QuickShareAudience,
    groupId: "",
  });

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    location: "",
    startsAt: "",
    endsAt: "",
    visibility: "public" as EventCreationVisibility,
    joinMode: "direct" as EventJoinMode,
    allowOnSiteVisibility: false,
    groupId: "",
    color: "" as string,
    category: "default" as EventCategory,
  });

  const visibleGroups = useMemo(() => data.groups.filter((g) => !g.isHidden), [data.groups]);
  const isEventsView = view === "events";
  const smartMeetingsEnabled = useRealiteFeatureFlag("smart-meetings", true);

  const acceptedEventIds = useMemo(
    () => new Set(data.suggestions.filter((s) => s.status === "accepted").map((s) => s.eventId)),
    [data.suggestions]
  );

  const pendingSuggestions = useMemo(
    () =>
      [...data.suggestions]
        .filter((s) => s.status === "pending" || s.status === "calendar_inserted")
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [data.suggestions]
  );

  const visibleEvents = useMemo(() => {
    const pendingEventIds = new Set(pendingSuggestions.map((s) => s.eventId));
    return data.events
      .filter((e) => !pendingEventIds.has(e.id))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [data.events, pendingSuggestions]);

  const nowFeedEvents = useMemo(
    () => visibleEvents.filter((e) => {
      if (e.createdBy !== data.me.id) return true;
      return (data.acceptedByEventId?.[e.id]?.length ?? 0) > 0 || acceptedEventIds.has(e.id);
    }),
    [acceptedEventIds, data.acceptedByEventId, data.me.id, visibleEvents]
  );

  const acceptedEvents = useMemo(
    () => visibleEvents.filter((e) => acceptedEventIds.has(e.id)),
    [acceptedEventIds, visibleEvents]
  );
  const ownEvents = useMemo(
    () => visibleEvents.filter((e) => !acceptedEventIds.has(e.id) && e.createdBy === data.me.id),
    [acceptedEventIds, data.me.id, visibleEvents]
  );
  const contextEvents = useMemo(
    () => visibleEvents.filter((e) => !acceptedEventIds.has(e.id) && e.createdBy !== data.me.id),
    [acceptedEventIds, data.me.id, visibleEvents]
  );

  const profileName = data.me.name ?? userName;
  const profileEmail = data.me.email || userEmail;
  const profileImage = data.me.image ?? userImage;
  const pendingCount = pendingSuggestions.length;
  const eventsViewMessaging = getEventsViewMessaging(data.me.calendarConnected);

  const eventFormHasDateTag = titleContainsDateTag(eventForm.title);
  const eventFormHasFriendsPlusTag = titleContainsFriendsPlusTag(eventForm.title);
  const eventFormEffectiveVisibility = eventFormHasDateTag
    ? "smart_date"
    : eventFormHasFriendsPlusTag
      ? "friends_of_friends"
      : eventForm.visibility;
  const eventFormSelectedGroupName = visibleGroups.find((g) => g.id === eventForm.groupId)?.name ?? null;
  const eventFormPresenceAudienceRule = getEventPresenceAudienceRuleCopy({
    visibility: eventFormEffectiveVisibility,
    groupName: eventFormSelectedGroupName,
  });

  useEffect(() => {
    if (!showEventForm) return;
    const suggested = inferEventCategory({ title: eventForm.title, description: eventForm.description, tags: [] });
    setEventForm((s) => ({ ...s, category: suggested }));
  }, [showEventForm, eventForm.title, eventForm.description]);

  useEffect(() => {
    if (!showEventForm) return;
    if (!eventFormHasDateTag || eventForm.joinMode === "interest") return;
    setEventForm((s) => ({ ...s, joinMode: "interest" }));
  }, [showEventForm, eventForm.joinMode, eventFormHasDateTag]);

  useEffect(() => {
    if (!showEventForm) return;
    if (eventFormHasDateTag || eventForm.joinMode !== "interest") return;
    setEventForm((s) => ({ ...s, joinMode: "direct" }));
  }, [showEventForm, eventFormHasDateTag, eventForm.joinMode]);

  useEffect(() => {
    if (!data.sync.revalidating) {
      toast.dismiss(REVALIDATING_TOAST_ID);
      return;
    }
    toast.loading("Aktualisierung läuft…", { id: REVALIDATING_TOAST_ID, duration: Number.POSITIVE_INFINITY });
    return () => { toast.dismiss(REVALIDATING_TOAST_ID); };
  }, [data.sync.revalidating]);

  async function createEvent(event: React.FormEvent) {
    event.preventDefault();
    if (eventForm.visibility === "group" && !eventForm.groupId) {
      setSubmitError("Bitte wähle eine Gruppe aus.");
      return;
    }
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
          tags: [],
          color: eventForm.color?.trim() || null,
          location: eventForm.location.trim() || undefined,
        })
      });
      const payload = (await response.json()) as { error?: string; event?: { id: string; visibility: EventVisibility; joinMode: EventJoinMode; allowOnSiteVisibility: boolean; groupId: string | null; tags?: string[]; startsAt: string; endsAt: string } };
      if (!response.ok) throw new Error(payload.error ?? "Event konnte nicht erstellt werden");
      if (payload.event) {
        captureProductEvent("event_created", {
          event_id: payload.event.id,
          visibility: payload.event.visibility,
          join_mode: payload.event.joinMode,
          allow_on_site_visibility: payload.event.allowOnSiteVisibility,
          has_group: Boolean(payload.event.groupId),
          tag_count: payload.event.tags?.length ?? 0
        });
      }
      setEventForm({ title: "", description: "", location: "", startsAt: "", endsAt: "", visibility: "public", joinMode: "direct", allowOnSiteVisibility: false, groupId: "", color: "", category: "default" });
      setShowEventForm(false);
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function createQuickShare(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setQuickShareError(null);

    const now = new Date();
    const endsAt = new Date(now.getTime() + quickShareForm.durationMinutes * 60_000);

    if (quickShareForm.audience === "group" && !quickShareForm.groupId) {
      setQuickShareError("Bitte wähle eine Gruppe.");
      setBusy(false);
      return;
    }

    try {
      const createResponse = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickShareForm.activity.trim(),
          location: quickShareForm.location.trim(),
          startsAt: now.toISOString(),
          endsAt: endsAt.toISOString(),
          visibility: quickShareForm.audience,
          joinMode: "direct",
          allowOnSiteVisibility: true,
          groupId: quickShareForm.audience === "group" ? quickShareForm.groupId : null,
          tags: [],
          color: null,
          category: "default",
        }),
      });
      const createPayload = (await createResponse.json()) as { error?: string; event?: { id: string; visibility: EventVisibility } };
      if (!createResponse.ok || !createPayload.event) throw new Error(createPayload.error ?? "Konnte nicht erstellt werden");

      if (quickShareForm.mode === "here_now") {
        const visibleUntil = getDefaultEventPresenceVisibleUntil(endsAt, now);
        if (visibleUntil) {
          const presenceResponse = await fetch(`/api/events/${createPayload.event.id}/presence`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "checked_in", visibleUntilIso: visibleUntil.toISOString() }),
          });
          const presencePayload = (await presenceResponse.json()) as { error?: string };
          if (!presenceResponse.ok) throw new Error(presencePayload.error ?? "Vor-Ort-Status fehlgeschlagen");
        }
      }

      captureProductEvent("event_created", {
        event_id: createPayload.event.id,
        visibility: createPayload.event.visibility,
        join_mode: "direct",
        allow_on_site_visibility: true,
        has_group: quickShareForm.audience === "group",
        tag_count: 0,
        creation_surface: "now_quick_share",
        quick_share_mode: quickShareForm.mode,
      });

      setQuickShareForm({ activity: "", location: "", durationMinutes: 120, mode: quickShareForm.mode, audience: quickShareForm.audience, groupId: "" });
      setQuickShareOpen(false);
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    } catch (err) {
      setQuickShareError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function markWeeklyShare(action: "shared") {
    if (!data.weeklyShare.token) return;
    await fetch("/api/weekly-share/current", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: data.weeklyShare.token, action }),
    });
    await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
  }

  async function shareWeeklyStatus() {
    const sharePath = `/w/${encodeURIComponent(data.weeklyShare.token)}`;
    const shareUrl = `${window.location.origin}${sharePath}`;
    const shareData = {
      title: "Meine Vorhaben diese Woche",
      text: "Ich teile meine Vorhaben diese Woche auf Realite. Schau rein, wenn du mitmachen willst.",
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData) !== false) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link kopiert. Du kannst ihn jetzt in deinem Status teilen.");
      }
      await markWeeklyShare("shared");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Teilen ist fehlgeschlagen. Der Link wurde nicht veröffentlicht.");
    }
  }

  async function acknowledgeWeeklyShareReferrals() {
    await fetch("/api/weekly-share/referrals/ack", { method: "POST" });
    await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
  }

  return (
    <AppShell user={{ name: profileName, email: profileEmail, image: profileImage }}>
      <main className="mx-auto w-full max-w-3xl px-4 py-4 sm:py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-foreground">
            {isEventsView ? "Events" : "Was geht?"}
          </h1>
          <div className="flex items-center gap-2">
            {!isEventsView && pendingCount > 0 ? (
              <a
                href="/suggestions"
                className="relative inline-flex items-center rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200 dark:bg-amber-950/55 dark:text-amber-100 dark:ring-1 dark:ring-amber-500/30 dark:hover:bg-amber-950/75"
              >
                <Sparkle className="mr-1 h-3.5 w-3.5" weight="duotone" />
                {pendingCount} Vorschläge
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => setShowEventForm((v) => !v)}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Erstellen
            </button>
          </div>
        </div>

        {/* Warnings */}
        {(queryError || (submitError && !showEventForm)) ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/45 dark:text-red-100">
            {submitError && !showEventForm ? submitError : queryError instanceof Error ? queryError.message : String(queryError)}
          </div>
        ) : null}
        <CalendarReconnectBanner calendarConnectionState={data.me.calendarConnectionState} />
        {data.sync.warning ? <SyncWarning>{data.sync.warning}</SyncWarning> : null}
        {data.sync.contactsWarning ? <SyncWarning>{data.sync.contactsWarning}</SyncWarning> : null}
        {data.sync.smartWarning ? <SyncWarning>{data.sync.smartWarning}</SyncWarning> : null}

        <WeeklyShareCard
          weeklyShare={data.weeklyShare}
          onShare={shareWeeklyStatus}
          onAcknowledgeReferrals={acknowledgeWeeklyShareReferrals}
        />

        {/* Quick Share (nur /now) */}
        {!isEventsView ? (
          <Dialog open={quickShareOpen} onOpenChange={(open) => { setQuickShareOpen(open); if (!open) setQuickShareError(null); }}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-left transition hover:border-teal-300 dark:border-primary/45 dark:bg-primary/20 dark:hover:border-primary/65"
              >
                <div>
                  <p className="text-sm font-semibold text-teal-950 dark:text-foreground">Kurz sagen, wo du bist</p>
                  <p className="text-xs text-teal-800/90 dark:text-muted-foreground">Aktivität schnell teilen</p>
                </div>
                <span className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Teilen</span>
              </button>
            </DialogTrigger>
            <DialogContent showCloseButton className="gap-0 p-0">
              <div className="shrink-0 border-b border-border px-4 pb-4 pt-3 pr-14 md:rounded-t-2xl md:px-6 md:pb-5 md:pt-6">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" aria-hidden />
                <DialogTitle>Hier &amp; jetzt teilen</DialogTitle>
                <DialogDescription className="mt-1 text-sm">
                  Erstellt eine Aktivität im gewählten Kreis.
                </DialogDescription>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-5">
                <QuickShareForm
                  form={quickShareForm}
                  groups={visibleGroups}
                  busy={busy}
                  error={quickShareError}
                  onChange={(updates) => setQuickShareForm((s) => ({ ...s, ...updates }))}
                  onSubmit={createQuickShare}
                />
              </div>
            </DialogContent>
          </Dialog>
        ) : null}

        {loading && data.events.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">Lade…</p> : null}

        {/* /now Feed */}
        {!isEventsView ? (
          <NowFeed
            events={nowFeedEvents}
            pendingSuggestions={pendingSuggestions}
            acceptedByEventId={data.acceptedByEventId}
            acceptedEventIds={acceptedEventIds}
            myId={data.me.id}
          />
        ) : null}

        {/* /events Sections */}
        {isEventsView ? (
          <EventsSections
            acceptedEvents={acceptedEvents}
            ownEvents={ownEvents}
            contextEvents={contextEvents}
            acceptedByEventId={data.acceptedByEventId}
            acceptedEventIds={acceptedEventIds}
            myId={data.me.id}
            emptyTitle={eventsViewMessaging.emptyTitle}
            emptyDescription={eventsViewMessaging.emptyDescription}
            onShowCreate={() => setShowEventForm(true)}
          />
        ) : null}

        {/* Smart Meetings (nur /events) */}
        {smartMeetingsEnabled && isEventsView ? (
          <SmartMeetingsCard
            groups={visibleGroups}
            smartMeetings={data.smartMeetings}
            pendingSuggestionCount={pendingCount}
            onCreated={() => queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY })}
            onError={(message) => setSubmitError(message)}
          />
        ) : null}

        {/* Event Creation Dialog */}
        <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
          <DialogContent showCloseButton className="gap-0 p-0">
            <div className="shrink-0 border-b border-border px-4 pb-4 pt-3 pr-14 md:rounded-t-2xl md:px-6 md:pb-5 md:pt-6">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" aria-hidden />
              <DialogTitle>Neues Event</DialogTitle>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-5">
              {submitError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/45 dark:text-red-100">{submitError}</div>
              ) : null}
              <EventForm
                form={eventForm}
                groups={visibleGroups}
                busy={busy}
                effectiveVisibility={eventFormEffectiveVisibility}
                presenceRule={eventFormPresenceAudienceRule}
                hasDateTag={eventFormHasDateTag}
                onChange={(updates) => setEventForm((s) => ({ ...s, ...updates }))}
                onSubmit={createEvent}
              />
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </AppShell>
  );
}

/* ─── Subcomponents ─── */

function SyncWarning({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/35 dark:bg-amber-950/40 dark:text-amber-100">
      {children}
    </div>
  );
}

function WeeklyShareCard({
  weeklyShare,
  onShare,
  onAcknowledgeReferrals,
}: {
  weeklyShare: DashboardPayload["weeklyShare"];
  onShare: () => void;
  onAcknowledgeReferrals: () => void;
}) {
  const hasStats = weeklyShare.visitCount > 0 || weeklyShare.knownVisitors.length > 0;
  const hasReferrals = weeklyShare.pendingReferrals.length > 0;

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-stone-50 to-teal-50 p-4 text-sm shadow-sm dark:border-orange-500/30 dark:from-orange-950/35 dark:via-card dark:to-teal-950/35">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-200">
            Wochenstatus
          </p>
          <h2 className="mt-1 text-base font-bold text-foreground">
            Teile deine Vorhaben einmal diese Woche
          </h2>
          <p className="mt-1 max-w-xl text-muted-foreground">
            Realite erstellt dafür einen eindeutigen Link mit schöner Vorschau. Du entscheidest im Systemdialog, ob du ihn
            z. B. in WhatsApp Status teilst.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onShare}
            className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Jetzt teilen
          </button>
        </div>
      </div>

      {hasStats ? (
        <div className="mt-3 rounded-xl bg-white/65 p-3 dark:bg-black/15">
          <p className="font-semibold text-foreground">{weeklyShare.visitCount} Aufruf(e) diese Woche</p>
          {weeklyShare.knownVisitors.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Bekannte Besucher:{" "}
              {weeklyShare.knownVisitors
                .map((visitor) => getPersonDisplayLabel({ name: visitor.name, email: visitor.email, allowEmail: false }))
                .join(", ")}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Wer nicht angemeldet ist, wird nur als Aufruf gezählt.
            </p>
          )}
        </div>
      ) : null}

      {hasReferrals ? (
        <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-3 dark:border-teal-500/30 dark:bg-teal-950/30">
          <p className="font-semibold text-teal-950 dark:text-teal-50">
            Neuer Kontakt über deinen Status-Link
          </p>
          <p className="mt-1 text-xs text-teal-800 dark:text-teal-100/80">
            {weeklyShare.pendingReferrals
              .map((referral) => getPersonDisplayLabel({ name: referral.name, email: referral.email, allowEmail: false }))
              .join(", ")}{" "}
            wurde in deinen Kontakten sichtbar.
          </p>
          <button
            type="button"
            onClick={onAcknowledgeReferrals}
            className="mt-2 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Gesehen
          </button>
        </div>
      ) : null}
    </section>
  );
}

function QuickShareForm({
  form,
  groups,
  busy,
  error,
  onChange,
  onSubmit,
}: {
  form: { activity: string; location: string; durationMinutes: number; mode: QuickShareMode; audience: QuickShareAudience; groupId: string };
  groups: Group[];
  busy: boolean;
  error: string | null;
  onChange: (updates: Partial<typeof form>) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const audienceMeta = getEventVisibilityMeta(form.audience);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex gap-2">
        {(["here_now", "going"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange({ mode })}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              form.mode === mode ? "border-teal-300 bg-teal-600 text-white" : "border-input bg-card text-foreground"
            }`}
          >
            {mode === "here_now" ? "Bin gerade hier" : "Gehe hin"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={form.activity}
          onChange={(e) => onChange({ activity: e.target.value })}
          placeholder={form.mode === "here_now" ? "z. B. beim Stadtfest" : "z. B. gehe zum Stadtfest"}
          className="w-full rounded-lg border border-input px-3 py-2 text-sm"
          required
        />
        <GooglePlacesAutocomplete
          value={form.location}
          onChange={(location) => onChange({ location })}
          placeholder="Wo?"
          disabled={busy}
          className="w-full rounded-lg border border-input px-3 py-2 text-sm dark:border-white/20"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Wer sieht das?</p>
          <div className="flex flex-wrap gap-1.5">
            {(["friends", "friends_of_friends", "group", "public"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ audience: opt, groupId: opt === "group" ? form.groupId : "" })}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                  form.audience === opt ? "border-teal-300 bg-teal-100 text-teal-900" : "border-input text-foreground"
                }`}
              >
                {getEventVisibilityMeta(opt).shortLabel}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{audienceMeta.description}</p>
          {form.audience === "group" ? (
            <select
              value={form.groupId}
              onChange={(e) => onChange({ groupId: e.target.value })}
              className="mt-2 w-full rounded-lg border border-input px-3 py-2 text-sm"
              required
            >
              <option value="">Gruppe wählen</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          ) : null}
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground">Noch etwa</label>
          <select
            value={String(form.durationMinutes)}
            onChange={(e) => onChange({ durationMinutes: Number(e.target.value) })}
            className="mt-1.5 w-full rounded-lg border border-input px-3 py-2 text-sm"
          >
            <option value="30">30 Min</option>
            <option value="60">1 Stunde</option>
            <option value="120">2 Stunden</option>
            <option value="180">3 Stunden</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
      >
        Teilen
      </button>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </form>
  );
}

function EventForm({
  form,
  groups,
  busy,
  effectiveVisibility,
  presenceRule,
  hasDateTag,
  onChange,
  onSubmit,
}: {
  form: { title: string; description: string; location: string; startsAt: string; endsAt: string; visibility: EventCreationVisibility; joinMode: EventJoinMode; allowOnSiteVisibility: boolean; groupId: string; color: string; category: EventCategory };
  groups: Group[];
  busy: boolean;
  effectiveVisibility: EventVisibility;
  presenceRule: { description: string };
  hasDateTag: boolean;
  onChange: (updates: Partial<typeof form>) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const audienceValue = form.visibility === "group" ? "group" : form.visibility;

  return (
    <form onSubmit={onSubmit} className="space-y-3 pb-1">
      <input
        value={form.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Titel"
        className="w-full rounded-lg border border-input px-3 py-2 text-sm"
        required
      />
      <div className="space-y-1">
        <label htmlFor="event-form-location" className="block text-xs font-medium text-muted-foreground">
          Ort
        </label>
        <GooglePlacesAutocomplete
          id="event-form-location"
          value={form.location}
          onChange={(location) => onChange({ location })}
          placeholder="Adresse oder Treffpunkt suchen …"
          disabled={busy}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="datetime-local"
          value={form.startsAt}
          onChange={(e) => onChange({ startsAt: e.target.value })}
          className="w-full rounded-lg border border-input px-3 py-2 text-sm"
          required
        />
        <input
          type="datetime-local"
          value={form.endsAt}
          onChange={(e) => onChange({ endsAt: e.target.value })}
          className="w-full rounded-lg border border-input px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-medium text-muted-foreground">Wer soll das sehen?</label>
        <select
          value={audienceValue}
          onChange={(e) => {
            const v = e.target.value as EventCreationVisibility | "group";
            if (v === "group") {
              onChange({ visibility: "group" });
            } else {
              onChange({ visibility: v, groupId: "" });
            }
          }}
          className="w-full rounded-lg border border-input px-3 py-2 text-sm"
        >
          <option value="public">{getEventVisibilityMeta("public").label}</option>
          <option value="friends">{getEventVisibilityMeta("friends").label}</option>
          <option value="friends_of_friends">{getEventVisibilityMeta("friends_of_friends").label}</option>
          <option value="group">{getEventVisibilityMeta("group").label}</option>
        </select>
        {form.visibility === "group" ? (
          <select
            value={form.groupId}
            onChange={(e) => onChange({ groupId: e.target.value })}
            className="w-full rounded-lg border border-input px-3 py-2 text-sm"
            required
          >
            <option value="">Gruppe wählen…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {hasDateTag ? (
        <p className="text-xs text-muted-foreground">Dating-Event: Teilnahme über „Interesse zeigen“ (automatisch).</p>
      ) : (
        <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.joinMode === "request"}
            onChange={(e) => onChange({ joinMode: e.target.checked ? "request" : "direct" })}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-teal-700"
          />
          <span>Beitritt nur nach Freigabe (statt direkt zusagen)</span>
        </label>
      )}
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={form.allowOnSiteVisibility}
          onChange={(e) => onChange({ allowOnSiteVisibility: e.target.checked })}
          className="h-4 w-4 rounded border-input text-teal-700"
        />
        Vor-Ort-Sichtbarkeit erlauben
      </label>
      <div>
        <select
          value={form.category}
          onChange={(e) => onChange({ category: e.target.value as EventCategory })}
          className="w-full rounded-lg border border-input px-3 py-2 text-sm"
        >
          {EVENT_CATEGORY_VALUES.map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">
        Sichtbarkeit: {getEventVisibilityMeta(effectiveVisibility).label}
        {form.allowOnSiteVisibility ? ` · Vor Ort: ${presenceRule.description}` : ""}
      </p>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        Event speichern
      </button>
    </form>
  );
}

function NowFeed({
  events,
  pendingSuggestions,
  acceptedByEventId,
  acceptedEventIds,
  myId,
}: {
  events: EventItem[];
  pendingSuggestions: Suggestion[];
  acceptedByEventId?: Record<string, AcceptedUser[]>;
  acceptedEventIds: Set<string>;
  myId: string;
}) {
  if (pendingSuggestions.length === 0 && events.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border bg-muted px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">Gerade nichts los</p>
        <p className="mt-1 text-sm text-muted-foreground">Erstelle eine Aktivität oder warte auf neue Events.</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {pendingSuggestions.length > 0 ? (
        <a
          href="/suggestions"
          className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 transition hover:border-amber-300 dark:border-amber-500/40 dark:bg-amber-950/45 dark:hover:border-amber-500/60"
        >
          <div>
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
              {pendingSuggestions.length} {pendingSuggestions.length === 1 ? "Vorschlag wartet" : "Vorschläge warten"}
            </p>
            <p className="text-xs text-amber-900/90 dark:text-amber-200/95">Erst reagieren, dann weiter entdecken</p>
          </div>
          <span className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white dark:bg-amber-500">
            Reagieren
          </span>
        </a>
      ) : null}

      {events.map((event) => {
        const accepted = acceptedByEventId?.[event.id] ?? [];
        const isAccepted = acceptedEventIds.has(event.id);
        const isOwn = event.createdBy === myId;
        const pattern = getEventPatternMeta({ isOwnEvent: isOwn, isAccepted });
        const coverUrl = event.placeImageUrl ?? event.linkPreviewImageUrl ?? null;
        const borderColor = event.color ?? CATEGORY_COLORS[event.category ?? "default"];

        return (
          <a
            key={event.id}
            href={`/e/${shortenUUID(event.id)}`}
            className="flex gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-teal-200 hover:shadow-sm dark:hover:border-primary/45"
            style={{ borderLeftWidth: "4px", borderLeftColor: borderColor }}
          >
            {coverUrl ? (
              <span className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                <EventImage src={coverUrl} className="h-full w-full object-cover" />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${pattern.badgeClassName}`}>
                  {pattern.label}
                </span>
                {accepted.length > 0 ? (
                  <span className="text-[11px] font-semibold text-teal-700 dark:text-primary">{accepted.length} dabei</span>
                ) : null}
              </div>
              <p className="mt-1 font-medium text-foreground">{event.title.replace(/#[^\s]+/gi, "").trim()}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(event.startsAt).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
                {" · "}
                {new Date(event.startsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                {" – "}
                {new Date(event.endsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              </p>
              {accepted.length > 0 ? (
                <p className="mt-1 text-xs text-teal-700 dark:text-primary">
                  {accepted.slice(0, 3).map((u) => getPersonDisplayLabel({ name: u.name, email: u.email, allowEmail: false })).join(", ")}
                  {accepted.length > 3 ? ` +${accepted.length - 3}` : ""}
                </p>
              ) : null}
            </div>
          </a>
        );
      })}
    </div>
  );
}

function EventsSections({
  acceptedEvents,
  ownEvents,
  contextEvents,
  acceptedByEventId,
  acceptedEventIds,
  myId,
  emptyTitle,
  emptyDescription,
  onShowCreate,
}: {
  acceptedEvents: EventItem[];
  ownEvents: EventItem[];
  contextEvents: EventItem[];
  acceptedByEventId?: Record<string, AcceptedUser[]>;
  acceptedEventIds: Set<string>;
  myId: string;
  emptyTitle: string;
  emptyDescription: string;
  onShowCreate: () => void;
}) {
  const allEmpty = acceptedEvents.length === 0 && ownEvents.length === 0 && contextEvents.length === 0;
  const sections = [
    { title: "Zugesagt", events: acceptedEvents, empty: "Noch keine Zusagen." },
    { title: "Eigene", events: ownEvents, empty: "Keine eigenen Events." },
    { title: "Kalenderkontext", events: contextEvents, empty: "Keine weiteren Termine." },
  ];

  if (allEmpty) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border bg-muted px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
        <button
          type="button"
          onClick={onShowCreate}
          className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Erstes Event anlegen
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-6">
      {sections.map((section) => (
        <section key={section.title}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">{section.title}</h2>
            <span className="text-xs text-muted-foreground">{section.events.length}</span>
          </div>
          {section.events.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-border bg-muted px-3 py-3 text-sm text-muted-foreground">
              {section.empty}
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {section.events.map((event) => {
                const accepted = acceptedByEventId?.[event.id] ?? [];
                const isAccepted = acceptedEventIds.has(event.id);
                const isOwn = event.createdBy === myId;
                const pattern = getEventPatternMeta({ isOwnEvent: isOwn, isAccepted });
                const coverUrl = event.placeImageUrl ?? event.linkPreviewImageUrl ?? null;
                const borderColor = event.color ?? CATEGORY_COLORS[event.category ?? "default"];

                return (
                  <a
                    key={event.id}
                    href={`/e/${shortenUUID(event.id)}`}
                    className="flex gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-teal-200 hover:shadow-sm dark:hover:border-primary/45"
                    style={{ borderLeftWidth: "4px", borderLeftColor: borderColor }}
                  >
                    {coverUrl ? (
                      <span className="h-14 w-18 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <EventImage src={coverUrl} className="h-full w-full object-cover" />
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${pattern.badgeClassName}`}>
                          {pattern.label}
                        </span>
                        {accepted.length > 0 ? (
                          <span className="text-[11px] font-semibold text-teal-700">{accepted.length} dabei</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-medium text-foreground">{event.title.replace(/#[^\s]+/gi, "").trim()}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(event.startsAt).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
                        {" · "}
                        {new Date(event.startsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(event.endsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        {event.tags.length > 0 ? ` · ${event.tags.join(", ")}` : ""}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
