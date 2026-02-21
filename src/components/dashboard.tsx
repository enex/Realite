"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/src/components/app-shell";
import { UserAvatar } from "@/src/components/user-avatar";
import { shortenUUID } from "@/src/lib/utils/short-uuid";

type GroupContact = {
  groupId: string;
  email: string;
  name: string | null;
  image: string | null;
  isRegistered: boolean;
  source: string;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  hashtags: string[];
  visibility: "public" | "private";
  syncProvider: string | null;
  syncReference: string | null;
  syncEnabled: boolean;
  isHidden: boolean;
  role: "owner" | "member";
  eventCount: number;
  contactCount: number;
  contacts: GroupContact[];
  createdAt: string;
};

type Suggestion = {
  id: string;
  eventId: string;
  status: "pending" | "calendar_inserted" | "accepted" | "declined";
  score: number;
  reason: string;
  calendarEventId: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  tags: string[];
  createdByName: string | null;
  createdByEmail: string;
  decisionReasons?: string[];
  decisionNote?: string | null;
};

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
    contactsStats: {
      syncedGroups: number;
      syncedMembers: number;
      scannedContacts: number;
    } | null;
    revalidating: boolean;
    lastTriggeredAt: string | null;
    lastCompletedAt: string | null;
  };
  groups: Group[];
  suggestions: Suggestion[];
};

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
    contactsStats: null,
    revalidating: false,
    lastTriggeredAt: null,
    lastCompletedAt: null
  },
  groups: [],
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
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardPayload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoDecisionHandled, setAutoDecisionHandled] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    hashtags: "#alle",
    visibility: "private" as "public" | "private"
  });

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
  const visibleGroups = useMemo(() => data.groups.filter((group) => !group.isHidden), [data.groups]);
  const hiddenGroups = useMemo(() => data.groups.filter((group) => group.isHidden), [data.groups]);
  const selectedSuggestionId = searchParams.get("suggestion");
  const decisionFromQuery = searchParams.get("decision");
  const queryDecision = decisionFromQuery === "accepted" || decisionFromQuery === "declined" ? decisionFromQuery : null;
  const profileName = data.me.name ?? userName;
  const profileEmail = data.me.email || userEmail;
  const profileImage = data.me.image ?? userImage;

  function parseHashtagList(value: string) {
    const list = value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    return list.length ? list : ["#alle"];
  }

  async function loadData(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const dashboardResponse = await fetch("/api/dashboard", { cache: "no-store" });
      const payload = (await dashboardResponse.json()) as DashboardPayload & { error?: string };

      if (!dashboardResponse.ok) {
        throw new Error(payload.error ?? "Dashboard konnte nicht geladen werden");
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

  async function createGroup(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupForm.name,
          description: groupForm.description,
          visibility: groupForm.visibility,
          hashtags: parseHashtagList(groupForm.hashtags)
        })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Gruppe konnte nicht erstellt werden");
      }

      setGroupForm({ name: "", description: "", hashtags: "#alle", visibility: "private" });
      setShowGroupForm(false);
      await loadData({ silent: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

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

  async function decideSuggestion(suggestionId: string, decision: "accepted" | "declined") {
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

    void decideSuggestion(selectedSuggestionId, queryDecision);
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
                <p className="text-sm text-slate-500">Eingeloggt als</p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{profileName}</h1>
                <p className="text-xs text-slate-500">{profileEmail}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Kalenderstatus: {data.me.calendarConnected ? "Google Kalender verbunden" : "Nicht verbunden"}
                </p>
                {data.sync.stats ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Letzter Sync: {data.sync.stats.synced} übernommen aus {data.sync.stats.scanned} Kalender-Events.
                  </p>
                ) : null}
                {data.sync.contactsStats ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Kontakte-Sync: {data.sync.contactsStats.syncedGroups} Gruppen, {data.sync.contactsStats.syncedMembers}{" "}
                    Nutzer aus {data.sync.contactsStats.scannedContacts} Kontakten abgeglichen.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-80">
              <button
                onClick={() => setShowGroupForm((current) => !current)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {showGroupForm ? "Gruppe schließen" : "Neue Gruppe"}
              </button>
              <button
                onClick={() => setShowEventForm((current) => !current)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {showEventForm ? "Event schließen" : "Neues Event"}
              </button>
              <button
                onClick={runSuggestions}
                disabled={busy}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Matching starten
              </button>
              <a
                href="/api/auth/signout?callbackUrl=/"
                className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700"
              >
                Abmelden
              </a>
            </div>
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
        {data.sync.revalidating ? (
          <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
            Aktualisierung im Hintergrund läuft. Neue Kalender- und Kontaktdaten erscheinen automatisch.
          </div>
        ) : null}
        {loading && data.groups.length === 0 && data.suggestions.length === 0 ? (
          <p className="mt-6 text-slate-600">Lade Daten...</p>
        ) : null}

        {showGroupForm ? (
          <form onSubmit={createGroup} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Neue Gruppe anlegen</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={groupForm.name}
                onChange={(event) => setGroupForm((state) => ({ ...state, name: event.target.value }))}
                placeholder="Gruppenname"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                value={groupForm.hashtags}
                onChange={(event) => setGroupForm((state) => ({ ...state, hashtags: event.target.value }))}
                placeholder="#alle, #kontakte"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={groupForm.description}
                onChange={(event) => setGroupForm((state) => ({ ...state, description: event.target.value }))}
                placeholder="Beschreibung"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
              />
              <select
                value={groupForm.visibility}
                onChange={(event) =>
                  setGroupForm((state) => ({ ...state, visibility: event.target.value as "public" | "private" }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="private">Privat</option>
                <option value="public">Öffentlich</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Gruppe erstellen
            </button>
          </form>
        ) : null}

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

        <section id="gruppen" className="mt-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Alle Gruppen</h2>
          <p className="mt-1 text-sm text-slate-600">Kompaktansicht. Klick auf eine Gruppe für Mitglieder, Invite und Bearbeitung.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleGroups.length === 0 ? <p className="text-sm text-slate-500">Noch keine sichtbaren Gruppen angelegt.</p> : null}
            {visibleGroups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="rounded-lg border border-slate-200 p-4 transition hover:border-teal-300 hover:bg-teal-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-base font-semibold text-slate-900">{group.name}</p>
                  {group.syncProvider === "google_contacts" && group.syncEnabled ? (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700">Sync</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">{group.visibility === "public" ? "öffentlich" : "privat"}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex -space-x-2">
                    {group.contacts.slice(0, 3).map((contact) => (
                      <UserAvatar
                        key={`${group.id}:${contact.email}`}
                        name={contact.name}
                        email={contact.email}
                        image={contact.image}
                        size="xs"
                        className="ring-2 ring-white"
                      />
                    ))}
                    {group.contactCount > 3 ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 ring-2 ring-white">
                        +{group.contactCount - 3}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-500">{group.contactCount} Kontakte</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-slate-100 px-2 py-2">
                    <p className="text-[11px] text-slate-500">Events</p>
                    <p className="text-sm font-semibold text-slate-800">{group.eventCount}</p>
                  </div>
                  <div className="rounded-md bg-slate-100 px-2 py-2">
                    <p className="text-[11px] text-slate-500">Kontakte</p>
                    <p className="text-sm font-semibold text-slate-800">{group.contactCount}</p>
                  </div>
                  <div className="rounded-md bg-slate-100 px-2 py-2">
                    <p className="text-[11px] text-slate-500">Tags</p>
                    <p className="text-sm font-semibold text-slate-800">{group.hashtags.length}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {hiddenGroups.length ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Versteckte Sync-Gruppen</h2>
            <p className="mt-1 text-sm text-slate-600">Diese Gruppen sind ausgeblendet und können in der Detailseite wieder eingeblendet werden.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {hiddenGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="rounded-lg border border-slate-200 p-4 transition hover:border-amber-300 hover:bg-amber-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-base font-semibold text-slate-900">{group.name}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Versteckt</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{group.contactCount} Kontakte · {group.eventCount} Events</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section id="vorschlaege" className="mt-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Proaktive Vorschläge</h2>
          <div className="mt-4 space-y-3">
            {suggestionsByDay.length === 0 ? <p className="text-sm text-slate-500">Noch keine Vorschläge.</p> : null}
            {suggestionsByDay.map((dayGroup) => (
              <div key={dayGroup.dayKey} className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{dayGroup.dayLabel}</h3>
                {dayGroup.items.map((suggestion) => (
                  <article
                    key={suggestion.id}
                    id={`suggestion-${suggestion.id}`}
                    className={`rounded-lg border p-3 ${selectedSuggestionId === suggestion.id ? "border-teal-400 bg-teal-50" : "border-slate-200"
                      }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <a
                          href={`/e/${shortenUUID(suggestion.eventId)}`}
                          className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-teal-500"
                        >
                          {suggestion.title}
                        </a>
                        <p className="text-xs text-slate-500">
                          {new Date(suggestion.startsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {new Date(suggestion.endsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} · von{" "}
                          {suggestion.createdByName ?? suggestion.createdByEmail}
                        </p>
                        <p className="text-xs text-slate-500">
                          Score {suggestion.score.toFixed(2)} · Status {suggestion.status}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/s/${shortenUUID(suggestion.id)}`}
                          className="rounded-md border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-700"
                        >
                          Antworten
                        </a>
                        <button
                          onClick={() => decideSuggestion(suggestion.id, "accepted")}
                          disabled={busy}
                          className="rounded-md bg-teal-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Zusagen
                        </button>
                        <button
                          onClick={() => decideSuggestion(suggestion.id, "declined")}
                          disabled={busy}
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                        >
                          Absagen
                        </button>
                      </div>
                    </div>
                    {suggestion.tags.length ? (
                      <p className="mt-1 text-xs text-slate-600">{suggestion.tags.join(" · ")}</p>
                    ) : null}
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
