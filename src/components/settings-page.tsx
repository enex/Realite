"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/src/components/app-shell";
import { UserAvatar } from "@/src/components/user-avatar";
import { AccountDeleteCard } from "@/src/components/settings/account-delete-card";
import { DatingSettingsCard } from "@/src/components/settings/dating-settings-card";
import { MpcSettingsCard } from "@/src/components/settings/mcp-settings-card";
import { ProviderCapabilityCard } from "@/src/components/settings/provider-capability-card";
import { SuggestionLearningCard } from "@/src/components/settings/suggestion-learning-card";
import { SuggestionSettingsCard, type SuggestionSettingsForm } from "@/src/components/settings/suggestion-settings-card";
import { ThemeSettingsCard } from "@/src/components/settings/theme-settings-card";
import type { CalendarConnectionState } from "@/src/lib/calendar-connection-state";
import { getSuggestionSettingsMessaging } from "@/src/lib/calendar-messaging";
import { getPageIntentMeta, pageLeadClassName, pageMetaClassName, pageShellClassName, pageTitleClassName } from "@/src/lib/page-hierarchy";
import { useDatingSettings } from "@/src/components/settings/use-dating-settings";
import { useRealiteFeatureFlag } from "@/src/lib/posthog/feature-flags";

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
  calendarConnectionState: CalendarConnectionState;
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
  calendarConnected: false,
  calendarConnectionState: "not_connected"
};

const SETTINGS_QUERY_KEY = ["settings"] as const;

async function fetchSettings(): Promise<SettingsPayload> {
  const response = await fetch("/api/settings", { cache: "no-store" });
  const payload = (await response.json()) as SettingsPayload;
  if (!response.ok) {
    throw new Error(payload.error ?? "Einstellungen konnten nicht geladen werden");
  }
  return payload;
}

export function SettingsPage({
  userName,
  userEmail,
  userImage
}: {
  userName: string;
  userEmail: string;
  userImage: string | null;
}) {
  const managementPage = getPageIntentMeta("manage");
  const queryClient = useQueryClient();
  const {
    data: queryData,
    isPending: loading,
    error: queryError,
  } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: fetchSettings,
  });
  const data = queryData ?? emptySettings;
  const settingsMessaging = getSuggestionSettingsMessaging(data.calendarConnectionState);

  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [suggestionForm, setSuggestionForm] = useState<SuggestionSettingsForm>(emptySettings.settings);

  const dating = useDatingSettings();
  const datingModeEnabled = useRealiteFeatureFlag("dating-mode", false);

  useEffect(() => {
    if (queryData?.settings) {
      setSuggestionForm(queryData.settings);
    }
  }, [queryData?.settings]);

  async function saveSuggestionSettings(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSubmitError(null);

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

      queryClient.setQueryData(SETTINGS_QUERY_KEY, (prev: SettingsPayload | undefined) =>
        prev ? { ...prev, ...payload } : payload
      );
      setSuggestionForm(payload.settings);
    } catch (settingsError) {
      setSubmitError(settingsError instanceof Error ? settingsError.message : "Unbekannter Fehler");
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
        <header className={pageShellClassName}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <UserAvatar name={userName} email={userEmail} image={userImage} size="lg" />
              <div>
                <p className={managementPage.eyebrowClassName}>Profil & Einstellungen</p>
                <h1 className={pageTitleClassName}>{userName}</h1>
                <p className={pageMetaClassName}>{userEmail}</p>
                <p className={pageLeadClassName}>
                  {datingModeEnabled
                    ? `${settingsMessaging.lead} Den Dating-Modus für die Smart Group #date steuerst du ebenfalls hier.`
                    : settingsMessaging.lead}
                </p>
              </div>
            </div>
          </div>
        </header>

        {(queryError || submitError) ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError ?? (queryError instanceof Error ? queryError.message : String(queryError))}
          </div>
        ) : null}
        {datingModeEnabled && dating.error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{dating.error}</div>
        ) : null}
        {loading ? <p className="mt-6 text-slate-600">Lade Einstellungen...</p> : null}

        <ThemeSettingsCard />

        <SuggestionSettingsCard
          calendarConnected={data.calendarConnected}
          calendarConnectionState={data.calendarConnectionState}
          calendars={data.calendars}
          readableCalendars={data.readableCalendars}
          autoInsertedSuggestionCount={data.suggestionStats.autoInsertedSuggestionCount}
          blockedPeople={data.criteria.blockedPeople}
          form={suggestionForm}
          busy={busy}
          onFormChange={setSuggestionForm}
          onSubmit={saveSuggestionSettings}
        />

        <ProviderCapabilityCard />

        <SuggestionLearningCard
          positiveCriteria={data.criteria.positiveCriteria}
          negativeCriteria={data.criteria.negativeCriteria}
        />

        {datingModeEnabled ? (
          <DatingSettingsCard
            form={dating.form}
            status={{ unlocked: dating.data.unlocked, age: dating.data.age }}
            missingRequirementLabels={dating.missingRequirementLabels}
            loading={dating.loading}
            busy={dating.busy}
            onFormChange={dating.setForm}
            onSubmit={saveDatingSettings}
          />
        ) : null}

        <MpcSettingsCard />

        <AccountDeleteCard busy={deleteBusy} error={deleteError} onDelete={deleteAccount} />
      </main>
    </AppShell>
  );
}
