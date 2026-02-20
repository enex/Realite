"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Group = {
  id: string;
  name: string;
  description: string | null;
  hashtags: string[];
  visibility: "public" | "private";
  syncProvider: string | null;
  syncReference: string | null;
  syncEnabled: boolean;
  role: "owner" | "member";
  eventCount: number;
  contactCount: number;
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
    contactsStats: null
  },
  groups: [],
  suggestions: []
};

export function Dashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<DashboardPayload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const sortedSuggestions = useMemo(
    () => [...data.suggestions].sort((a, b) => b.score - a.score),
    [data.suggestions]
  );

  function parseHashtagList(value: string) {
    const list = value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    return list.length ? list : ["#alle"];
  }

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const payload = (await response.json()) as DashboardPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Dashboard konnte nicht geladen werden");
      }

      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

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
      await loadData();
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
      await loadData();
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

      await loadData();
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

      await loadData();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Eingeloggt als</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{userName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Kalenderstatus: {data.me.calendarConnected ? "Google Kalender verbunden" : "Nicht verbunden"}
            </p>
            {data.me.calendarScope ? (
              <p className="mt-1 break-all text-xs text-slate-500">Scope: {data.me.calendarScope}</p>
            ) : null}
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
          <div className="flex flex-wrap gap-2">
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
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Abmelden
            </a>
            <a
              href="/docs"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Docs
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
      {loading ? <p className="mt-6 text-slate-600">Lade Daten...</p> : null}

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
                {data.groups.map((group) => (
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

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Alle Gruppen</h2>
        <p className="mt-1 text-sm text-slate-600">Kompaktansicht. Klick auf eine Gruppe für Mitglieder, Invite und Bearbeitung.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.groups.length === 0 ? <p className="text-sm text-slate-500">Noch keine Gruppen angelegt.</p> : null}
          {data.groups.map((group) => (
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

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Proaktive Vorschläge</h2>
        <div className="mt-4 space-y-3">
          {sortedSuggestions.length === 0 ? <p className="text-sm text-slate-500">Noch keine Vorschläge.</p> : null}
          {sortedSuggestions.map((suggestion) => (
            <article key={suggestion.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{suggestion.title}</p>
                  <p className="text-xs text-slate-500">Score {suggestion.score.toFixed(2)} · Status {suggestion.status}</p>
                </div>
                <div className="flex gap-2">
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
              <p className="mt-2 text-sm text-slate-600">{suggestion.reason}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
