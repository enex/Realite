"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "@/src/components/app-shell";
import { CalendarReconnectBanner } from "@/src/components/calendar-reconnect-banner";
import { UserAvatar } from "@/src/components/user-avatar";
import { captureProductEvent } from "@/src/lib/posthog/capture";
import { DASHBOARD_QUERY_KEY, fetchDashboard } from "@/src/lib/dashboard-query";
import type { CalendarConnectionState } from "@/src/lib/calendar-connection-state";
import { getGroupManagementState, sortGroupsForManagement } from "@/src/lib/group-management";
import { useRealiteFeatureFlag } from "@/src/lib/posthog/feature-flags";

type GroupContact = {
  groupId: string;
  email: string;
  emails: string[];
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

type GroupsPayload = {
  me: {
    email: string;
    name: string | null;
    image: string | null;
    calendarConnectionState: CalendarConnectionState;
  };
  sync: {
    warning: string | null;
    contactsWarning: string | null;
  };
  dating: {
    enabled: boolean;
    unlocked: boolean;
    missingRequirements: string[];
  };
  groups: Group[];
};

const emptyPayload: GroupsPayload = {
  me: { email: "", name: null, image: null, calendarConnectionState: "not_connected" },
  sync: { warning: null, contactsWarning: null },
  dating: { enabled: false, unlocked: false, missingRequirements: [] },
  groups: []
};

export function GroupsPage({
  userName,
  userEmail,
  userImage
}: {
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
    queryFn: () => fetchDashboard() as Promise<GroupsPayload>,
  });
  const data = queryData ?? emptyPayload;

  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    hashtags: "#alle",
    visibility: "private" as "public" | "private"
  });

  const datingModeEnabled = useRealiteFeatureFlag("dating-mode", false);
  const visibleGroups = useMemo(() => data.groups.filter((g) => !g.isHidden), [data.groups]);
  const hiddenGroups = useMemo(() => data.groups.filter((g) => g.isHidden), [data.groups]);
  const orderedVisibleGroups = useMemo(() => sortGroupsForManagement(visibleGroups), [visibleGroups]);

  const profileName = data.me.name ?? userName;
  const profileEmail = data.me.email || userEmail;
  const profileImage = data.me.image ?? userImage;

  async function createGroup(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSubmitError(null);
    try {
      const hashtags = groupForm.hashtags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupForm.name,
          description: groupForm.description,
          visibility: groupForm.visibility,
          hashtags: hashtags.length ? hashtags : ["#alle"]
        })
      });
      const payload = (await response.json()) as {
        error?: string;
        group?: { id: string; visibility: "public" | "private"; hashtags: string[]; syncProvider: string | null };
      };
      if (!response.ok) throw new Error(payload.error ?? "Gruppe konnte nicht erstellt werden");
      if (payload.group) {
        captureProductEvent("group_created", {
          group_id: payload.group.id,
          visibility: payload.group.visibility,
          hashtag_count: payload.group.hashtags.length,
          sync_provider: payload.group.syncProvider ?? "none"
        });
      }
      setGroupForm({ name: "", description: "", hashtags: "#alle", visibility: "private" });
      setShowGroupForm(false);
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell user={{ name: profileName, email: profileEmail, image: profileImage }}>
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900">Gruppen</h1>
          <button
            onClick={() => setShowGroupForm((v) => !v)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            {showGroupForm ? "Schließen" : "Neue Gruppe"}
          </button>
        </div>

        {(queryError || submitError) ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError ?? (queryError instanceof Error ? queryError.message : String(queryError))}
          </div>
        ) : null}
        <CalendarReconnectBanner calendarConnectionState={data.me.calendarConnectionState} />
        {data.sync.warning ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {data.sync.warning}
          </div>
        ) : null}
        {data.sync.contactsWarning ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {data.sync.contactsWarning}
          </div>
        ) : null}

        {showGroupForm ? (
          <form onSubmit={createGroup} className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={groupForm.name}
                onChange={(e) => setGroupForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Gruppenname"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                value={groupForm.hashtags}
                onChange={(e) => setGroupForm((s) => ({ ...s, hashtags: e.target.value }))}
                placeholder="#alle, #kontakte"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={groupForm.description}
                onChange={(e) => setGroupForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Beschreibung (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
              />
              <select
                value={groupForm.visibility}
                onChange={(e) => setGroupForm((s) => ({ ...s, visibility: e.target.value as "public" | "private" }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="private">Privat</option>
                <option value="public">Öffentlich</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Erstellen
            </button>
          </form>
        ) : null}

        {loading && data.groups.length === 0 ? <p className="mt-6 text-sm text-slate-500">Lade Gruppen…</p> : null}

        {visibleGroups.length === 0 && !loading && !showGroupForm ? (
          <div className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">Noch keine Gruppen</p>
            <p className="mt-1 text-sm text-slate-500">Erstelle deine erste Gruppe, um Kontakte und Sichtbarkeit zu organisieren.</p>
          </div>
        ) : null}

        {orderedVisibleGroups.length > 0 ? (
          <section className="mt-5 grid gap-3 sm:grid-cols-2">
            {orderedVisibleGroups.map((group) => {
              const state = getGroupManagementState(group);
              return (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className={`rounded-xl border p-4 transition ${state.cardClassName}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold text-slate-900">{group.name}</p>
                    <div className="flex shrink-0 gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${state.badgeClassName}`}>
                        {state.label}
                      </span>
                      {group.syncProvider === "google_contacts" && group.syncEnabled ? (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-200">
                          Sync
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {group.contactCount} Kontakte · {group.eventCount} Events · {group.visibility === "public" ? "öffentlich" : "privat"}
                  </p>
                  {group.contacts.length > 0 ? (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {group.contacts.slice(0, 4).map((contact) => (
                          <UserAvatar
                            key={`${group.id}:${contact.email}`}
                            name={contact.name}
                            email={contact.email}
                            image={contact.image}
                            size="xs"
                            className="ring-2 ring-white"
                          />
                        ))}
                        {group.contactCount > 4 ? (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 ring-2 ring-white">
                            +{group.contactCount - 4}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </section>
        ) : null}

        {datingModeEnabled ? (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">#date</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {data.dating.unlocked ? "Freigeschaltet" : data.dating.enabled ? "Aktiv, noch nicht vollständig" : "Nicht aktiviert"}
                </p>
              </div>
              <a
                href="/settings#dating"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Profil öffnen
              </a>
            </div>
          </section>
        ) : null}

        {hiddenGroups.length > 0 ? (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-slate-500">Versteckt</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {hiddenGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="rounded-lg border border-slate-200 p-3 transition hover:border-amber-300 hover:bg-amber-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-slate-900">{group.name}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Versteckt</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{group.contactCount} Kontakte · {group.eventCount} Events</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
