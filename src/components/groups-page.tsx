"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/src/components/app-shell";
import { UserAvatar } from "@/src/components/user-avatar";

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

type GroupsPayload = {
  me: {
    email: string;
    name: string | null;
    image: string | null;
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
  me: {
    email: "",
    name: null,
    image: null
  },
  sync: {
    warning: null,
    contactsWarning: null
  },
  dating: {
    enabled: false,
    unlocked: false,
    missingRequirements: []
  },
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
  const [data, setData] = useState<GroupsPayload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);

  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    hashtags: "#alle",
    visibility: "private" as "public" | "private"
  });

  const visibleGroups = useMemo(() => data.groups.filter((group) => !group.isHidden), [data.groups]);
  const hiddenGroups = useMemo(() => data.groups.filter((group) => group.isHidden), [data.groups]);

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

  function formatMissingDatingRequirement(value: string) {
    const labels: Record<string, string> = {
      enable_mode: "Dating-Modus aktivieren",
      birth_year: "Geburtsjahr setzen",
      adult: "mindestens 18 Jahre",
      gender: "Geschlecht setzen",
      must_be_single: "Single-Status auf single",
      sought_genders: "gesuchte Geschlechter auswählen",
      sought_age_range: "gesuchten Altersbereich setzen"
    };

    return labels[value] ?? value;
  }

  async function loadData(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const payload = (await response.json()) as GroupsPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Gruppen konnten nicht geladen werden");
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
                <p className="text-sm text-slate-500">Gruppen</p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Alle Gruppen</h1>
                <p className="text-xs text-slate-500">{profileEmail}</p>
                <p className="mt-2 text-sm text-slate-600">Hier legst du neue Gruppen an und verwaltest bestehende Gruppen.</p>
              </div>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-80">
              <button
                onClick={() => setShowGroupForm((current) => !current)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {showGroupForm ? "Formular schließen" : "Neue Gruppe"}
              </button>
              <a
                href="/events"
                className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700"
              >
                Zu Events
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
        {loading && data.groups.length === 0 ? <p className="mt-6 text-slate-600">Lade Gruppen...</p> : null}

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

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Smarte Gruppe</p>
              <h2 className="text-lg font-semibold text-slate-900">#date</h2>
              <p className="mt-1 text-sm text-slate-600">
                Events mit `#date` sind nur für Personen sichtbar, die sich gegenseitig im Dating-Profil matchen.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Status:{" "}
                {data.dating.unlocked
                  ? "freigeschaltet"
                  : data.dating.enabled
                    ? "aktiv, aber noch nicht vollständig"
                    : "nicht aktiviert"}
              </p>
            </div>
            <a
              href="/settings#dating"
              className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700"
            >
              Dating-Profil öffnen
            </a>
          </div>
          {!data.dating.unlocked && data.dating.missingRequirements.length ? (
            <p className="mt-3 text-xs text-slate-500">
              Noch offen: {data.dating.missingRequirements.map((item) => formatMissingDatingRequirement(item)).join(", ")}
            </p>
          ) : null}
        </section>

        <section id="gruppen" className="mt-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Sichtbare Gruppen</h2>
          <p className="mt-1 text-sm text-slate-600">Klick auf eine Gruppe für Mitglieder, Invite und Bearbeitung.</p>
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
      </main>
    </AppShell>
  );
}
