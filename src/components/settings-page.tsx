"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/src/components/app-shell";
import { UserAvatar } from "@/src/components/user-avatar";

type WritableCalendar = {
  id: string;
  summary: string;
  primary: boolean;
};

type ReadableCalendar = {
  id: string;
  summary: string;
  primary: boolean;
};

type SettingsPayload = {
  settings: {
    autoInsertSuggestions: boolean;
    suggestionCalendarId: string;
    suggestionDeliveryMode: "calendar_copy" | "source_invite";
    shareEmailInSourceInvites: boolean;
    matchingCalendarIds: string[];
  };
  calendars: WritableCalendar[];
  readableCalendars: ReadableCalendar[];
  calendarConnected: boolean;
  error?: string;
};

const emptySettings: SettingsPayload = {
  settings: {
    autoInsertSuggestions: true,
    suggestionCalendarId: "primary",
    suggestionDeliveryMode: "calendar_copy",
    shareEmailInSourceInvites: true,
    matchingCalendarIds: []
  },
  calendars: [],
  readableCalendars: [],
  calendarConnected: false
};

export function SettingsPage({
  userName,
  userEmail,
  userImage
}: {
  userName: string;
  userEmail: string;
  userImage: string | null;
}) {
  const [data, setData] = useState<SettingsPayload>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    autoInsertSuggestions: true,
    suggestionCalendarId: "primary",
    suggestionDeliveryMode: "calendar_copy" as "calendar_copy" | "source_invite",
    shareEmailInSourceInvites: true,
    matchingCalendarIds: [] as string[]
  });

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const payload = (await response.json()) as SettingsPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "Einstellungen konnten nicht geladen werden");
      }

      setData(payload);
      setSettingsForm({
        autoInsertSuggestions: payload.settings.autoInsertSuggestions,
        suggestionCalendarId: payload.settings.suggestionCalendarId,
        suggestionDeliveryMode: payload.settings.suggestionDeliveryMode,
        shareEmailInSourceInvites: payload.settings.shareEmailInSourceInvites,
        matchingCalendarIds: payload.settings.matchingCalendarIds
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm)
      });
      const payload = (await response.json()) as SettingsPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "Einstellungen konnten nicht gespeichert werden");
      }

      setData((current) => ({
        ...current,
        ...payload
      }));
      setSettingsForm({
        autoInsertSuggestions: payload.settings.autoInsertSuggestions,
        suggestionCalendarId: payload.settings.suggestionCalendarId,
        suggestionDeliveryMode: payload.settings.suggestionDeliveryMode,
        shareEmailInSourceInvites: payload.settings.shareEmailInSourceInvites,
        matchingCalendarIds: payload.settings.matchingCalendarIds
      });
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  function toggleMatchingCalendar(calendarId: string) {
    setSettingsForm((state) => {
      const exists = state.matchingCalendarIds.includes(calendarId);
      return {
        ...state,
        matchingCalendarIds: exists
          ? state.matchingCalendarIds.filter((id) => id !== calendarId)
          : [...state.matchingCalendarIds, calendarId]
      };
    });
  }

  return (
    <AppShell
      user={{
        name: userName,
        email: userEmail,
        image: userImage
      }}
    >
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <UserAvatar name={userName} email={userEmail} image={userImage} size="lg" />
              <div>
                <p className="text-sm text-slate-500">Profil & Einstellungen</p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{userName}</h1>
                <p className="text-xs text-slate-500">{userEmail}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Steuere hier, wie Realite potenzielle Events zustellt: als Kalenderkopie oder als Source-Einladung.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/events" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                Zu Events
              </a>
              <a
                href="/api/auth/signout?callbackUrl=/"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Abmelden
              </a>
            </div>
          </div>
        </header>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {loading ? <p className="mt-6 text-slate-600">Lade Einstellungen...</p> : null}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {!data.calendarConnected ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Google Kalender ist aktuell nicht verbunden.
          </p>
        ) : null}

        <form onSubmit={saveSettings} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={settingsForm.autoInsertSuggestions}
              onChange={(event) =>
                setSettingsForm((state) => ({ ...state, autoInsertSuggestions: event.target.checked }))
              }
              disabled={busy}
            />
            <span className="text-sm text-slate-700">Potenzielle Events automatisch in meinen Kalender eintragen</span>
          </label>

          <select
            value={settingsForm.suggestionDeliveryMode}
            onChange={(event) =>
              setSettingsForm((state) => ({
                ...state,
                suggestionDeliveryMode: event.target.value as "calendar_copy" | "source_invite"
              }))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            disabled={!data.calendarConnected || busy}
          >
            <option value="calendar_copy">Kalenderkopie (wie bisher)</option>
            <option value="source_invite">Einladung vom Source-Event (Google RSVP)</option>
          </select>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={settingsForm.shareEmailInSourceInvites}
              onChange={(event) =>
                setSettingsForm((state) => ({ ...state, shareEmailInSourceInvites: event.target.checked }))
              }
              disabled={busy || settingsForm.suggestionDeliveryMode !== "source_invite"}
            />
            <span className="text-sm text-slate-700">Meine E-Mail bei Source-Einladungen sichtbar machen</span>
          </label>

          {settingsForm.suggestionDeliveryMode === "source_invite" && !settingsForm.shareEmailInSourceInvites ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 sm:col-span-2">
              Ohne sichtbare E-Mail kann Google RSVP nicht als echte Einladung abgebildet werden. Realite nutzt dann
              automatisch die Kalenderkopie als Fallback.
            </p>
          ) : null}

          <select
            value={settingsForm.suggestionCalendarId}
            onChange={(event) =>
              setSettingsForm((state) => ({
                ...state,
                suggestionCalendarId: event.target.value
              }))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={!data.calendarConnected || data.calendars.length === 0 || busy}
          >
            {data.calendars.length === 0 ? <option value="primary">Primary</option> : null}
            {data.calendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.primary ? `${calendar.summary} (Primary)` : calendar.summary}
              </option>
            ))}
          </select>

          <div className="rounded-lg border border-slate-200 p-3 text-sm sm:col-span-2">
            <p className="font-medium text-slate-800">Kalender für Matching und Event-Fund</p>
            <p className="mt-1 text-xs text-slate-600">
              Nur diese Kalender werden für Verfügbarkeit und #alle-Sync des aktuellen Nutzers verwendet.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setSettingsForm((state) => ({
                    ...state,
                    matchingCalendarIds: data.readableCalendars.map((calendar) => calendar.id)
                  }))
                }
                disabled={busy || !data.calendarConnected}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
              >
                Alle
              </button>
              <button
                type="button"
                onClick={() =>
                  setSettingsForm((state) => ({
                    ...state,
                    matchingCalendarIds: []
                  }))
                }
                disabled={busy || !data.calendarConnected}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
              >
                Zurücksetzen (alle)
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {data.readableCalendars.map((calendar) => (
                <label key={calendar.id} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1">
                  <input
                    type="checkbox"
                    checked={settingsForm.matchingCalendarIds.includes(calendar.id)}
                    onChange={() => toggleMatchingCalendar(calendar.id)}
                    disabled={busy || !data.calendarConnected}
                  />
                  <span className="text-xs text-slate-700">
                    {calendar.primary ? `${calendar.summary} (Primary)` : calendar.summary}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !data.calendarConnected}
            className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Einstellungen speichern
          </button>
        </form>
      </section>
    </main>
    </AppShell>
  );
}
