"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type WritableCalendar = {
  id: string;
  summary: string;
  primary: boolean;
};

type SettingsPayload = {
  settings: {
    autoInsertSuggestions: boolean;
    suggestionCalendarId: string;
  };
  calendars: WritableCalendar[];
  calendarConnected: boolean;
  error?: string;
};

const emptySettings: SettingsPayload = {
  settings: {
    autoInsertSuggestions: true,
    suggestionCalendarId: "primary"
  },
  calendars: [],
  calendarConnected: false
};

export function SettingsPage({ userName }: { userName: string }) {
  const [data, setData] = useState<SettingsPayload>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    autoInsertSuggestions: true,
    suggestionCalendarId: "primary"
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
        suggestionCalendarId: payload.settings.suggestionCalendarId
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
        suggestionCalendarId: payload.settings.suggestionCalendarId
      });
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Nutzereinstellungen</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{userName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Steuere hier, ob Realite potenzielle Events automatisch in deinen Kalender einträgt.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              Zur Übersicht
            </Link>
            <a
              href="/api/auth/signout?callbackUrl=/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Abmelden
            </a>
            <a href="/docs" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              Docs
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
  );
}
