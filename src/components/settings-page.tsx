"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/src/components/app-shell";
import { UserAvatar } from "@/src/components/user-avatar";
import { AccountDeleteCard } from "@/src/components/settings/account-delete-card";
import { DatingSettingsCard } from "@/src/components/settings/dating-settings-card";
import { SuggestionLearningCard } from "@/src/components/settings/suggestion-learning-card";
import { SuggestionSettingsCard, type SuggestionSettingsForm } from "@/src/components/settings/suggestion-settings-card";
import { useDatingSettings } from "@/src/components/settings/use-dating-settings";

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
  settings: SuggestionSettingsForm;
  criteria: {
    positiveCriteria: Array<{ key: string; label: string; weight: number; votes: number }>;
    negativeCriteria: Array<{ key: string; label: string; weight: number; votes: number }>;
    blockedPeople: Array<{ id: string; label: string }>;
    blockedActivityTags: string[];
  };
  suggestionStats: {
    autoInsertedSuggestionCount: number;
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
    matchingCalendarIds: [],
    blockedCreatorIds: [],
    blockedActivityTags: [],
    suggestionLimitPerDay: 4,
    suggestionLimitPerWeek: 16
  },
  criteria: {
    positiveCriteria: [],
    negativeCriteria: [],
    blockedPeople: [],
    blockedActivityTags: []
  },
  suggestionStats: {
    autoInsertedSuggestionCount: 0
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
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [suggestionForm, setSuggestionForm] = useState<SuggestionSettingsForm>(emptySettings.settings);

  const dating = useDatingSettings();

  async function loadSuggestionSettings() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const payload = (await response.json()) as SettingsPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "Einstellungen konnten nicht geladen werden");
      }

      setData(payload);
      setSuggestionForm(payload.settings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSuggestionSettings();
  }, []);

  async function saveSuggestionSettings(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(suggestionForm)
      });
      const payload = (await response.json()) as SettingsPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "Einstellungen konnten nicht gespeichert werden");
      }

      setData((current) => ({
        ...current,
        ...payload
      }));
      setSuggestionForm(payload.settings);
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function saveDatingSettings(event: React.FormEvent) {
    event.preventDefault();
    await dating.save();
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Möchtest du deinen Account wirklich endgültig löschen? Dabei entfernt Realite auch alle von Realite angelegten Kalendereinträge."
    );
    if (!confirmed) {
      return;
    }

    setDeleteBusy(true);
    setDeleteError(null);

    try {
      const response = await fetch("/api/settings/account", {
        method: "DELETE"
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Account konnte nicht gelöscht werden");
      }

      window.location.href = "/";
    } catch (accountDeleteError) {
      setDeleteError(accountDeleteError instanceof Error ? accountDeleteError.message : "Unbekannter Fehler");
    } finally {
      setDeleteBusy(false);
    }
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
                  Steuere hier Vorschlagslogik, Kalenderverhalten und den Dating-Modus für die Smart Group `#date`.
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
        {dating.error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{dating.error}</div>
        ) : null}
        {loading ? <p className="mt-6 text-slate-600">Lade Einstellungen...</p> : null}

        <SuggestionSettingsCard
          calendarConnected={data.calendarConnected}
          calendars={data.calendars}
          readableCalendars={data.readableCalendars}
          autoInsertedSuggestionCount={data.suggestionStats.autoInsertedSuggestionCount}
          blockedPeople={data.criteria.blockedPeople}
          form={suggestionForm}
          busy={busy}
          onFormChange={setSuggestionForm}
          onSubmit={saveSuggestionSettings}
        />

        <SuggestionLearningCard
          positiveCriteria={data.criteria.positiveCriteria}
          negativeCriteria={data.criteria.negativeCriteria}
        />

        <DatingSettingsCard
          form={dating.form}
          status={{ unlocked: dating.data.unlocked, age: dating.data.age }}
          missingRequirementLabels={dating.missingRequirementLabels}
          loading={dating.loading}
          busy={dating.busy}
          onFormChange={dating.setForm}
          onSubmit={saveDatingSettings}
        />

        <AccountDeleteCard busy={deleteBusy} error={deleteError} onDelete={deleteAccount} />
      </main>
    </AppShell>
  );
}
