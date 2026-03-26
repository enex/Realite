"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";

import { AppShell } from "@/src/components/app-shell";
import { UserAvatar } from "@/src/components/user-avatar";
import { captureProductEvent } from "@/src/lib/posthog/capture";
import { DASHBOARD_QUERY_KEY, fetchDashboard } from "@/src/lib/dashboard-query";
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

function FlowLink({
  href,
  eyebrow,
  title,
  description
}: {
  href: ComponentProps<typeof Link>["href"];
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-teal-300 hover:bg-teal-50"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
      <h3 className="mt-2 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </Link>
  );
}

function ManagementCard({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-2 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </article>
  );
}

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
  const visibleGroups = useMemo(() => data.groups.filter((group) => !group.isHidden), [data.groups]);
  const hiddenGroups = useMemo(() => data.groups.filter((group) => group.isHidden), [data.groups]);
  const managedContactCount = useMemo(
    () => visibleGroups.reduce((total, group) => total + group.contactCount, 0),
    [visibleGroups]
  );
  const managedEventCount = useMemo(
    () => visibleGroups.reduce((total, group) => total + group.eventCount, 0),
    [visibleGroups]
  );

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

  async function createGroup(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSubmitError(null);

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

      const payload = (await response.json()) as {
        error?: string;
        group?: {
          id: string;
          visibility: "public" | "private";
          hashtags: string[];
          syncProvider: string | null;
        };
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Gruppe konnte nicht erstellt werden");
      }

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
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Verwalten</p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Alle Gruppen</h1>
                <p className="text-xs text-slate-500">{profileEmail}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Gruppen sind dein Relevanz- und Sichtbarkeitslayer. Du steuerst hier, welche sozialen Kreise Realite für
                  Aktivitäten berücksichtigen soll. Der eigentliche Aktivitätsfluss bleibt bewusst in Jetzt, Vorschlägen und
                  Events.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGroupForm((current) => !current)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {showGroupForm ? "Formular schließen" : "Neue Gruppe"}
            </button>
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">Aktivitätsfluss getrennt halten</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Hier pflegst du Kreise. Entscheidungen triffst du anderswo.</h2>
              <p className="mt-2 text-sm text-slate-700">
                Gruppen helfen Realite bei Relevanz, Sichtbarkeit und Einladungen. Sie sollen aber nicht mit spontanen Aktivitäten,
                offenen Reaktionen oder deinem Sozialkalender konkurrieren.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Gruppen</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{visibleGroups.length}</p>
              </div>
              <div className="rounded-xl bg-white px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Kontakte</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{managedContactCount}</p>
              </div>
              <div className="rounded-xl bg-white px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Events</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{managedEventCount}</p>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <FlowLink
              href="/now"
              eyebrow="Zurück zu Jetzt"
              title="Spontane Aktivitäten sehen"
              description="Wechsle dorthin, wenn du wissen willst, was gerade relevant ist und wo du direkt mitmachen kannst."
            />
            <FlowLink
              href="/suggestions"
              eyebrow="Zurück zu Vorschlägen"
              title="Offene Reaktionen priorisieren"
              description="Nutze Vorschläge für Empfehlungen, auf die du antworten, zusagen oder bewusst ablehnen willst."
            />
            <FlowLink
              href="/events"
              eyebrow="Zurück zu Events"
              title="Planung und Sozialkalender prüfen"
              description="Dort siehst du bestätigte Aktivitäten, eigene Planung und Smart Treffen im laufenden Kontext."
            />
          </div>
        </section>

        <section className="mt-6 grid gap-3 lg:grid-cols-3">
          <ManagementCard
            eyebrow="Relevanz"
            title="Wen Realite zuerst einbezieht"
            description="Gruppen helfen dabei, Aktivitäten zuerst für passende Leute zu priorisieren, statt alles wahllos offen zu streuen."
          />
          <ManagementCard
            eyebrow="Sichtbarkeit"
            title="Welche Kreise etwas sehen"
            description="Eine Gruppe definiert den sozialen Rahmen eines Events. Sichtbarkeit bleibt bewusst begrenzt und von dir steuerbar."
          />
          <ManagementCard
            eyebrow="Verwaltung"
            title="Kontakte, Hashtags und Einladungen pflegen"
            description="Hier strukturierst du Kreise und Sichtbarkeit. Reagieren, entdecken und zusagen passiert weiter getrennt in den Aktivitätsansichten."
          />
        </section>

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
        {loading && data.groups.length === 0 ? <p className="mt-6 text-slate-600">Lade Gruppen...</p> : null}

        {showGroupForm ? (
          <form onSubmit={createGroup} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Neue Gruppe anlegen</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Eine Gruppe bündelt Kontakte, Hashtags und Sichtbarkeit. Sie bestimmt nicht den Hauptfeed, sondern hilft Realite,
              spätere Aktivitäten für den richtigen Kreis einzuordnen.
            </p>
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Gruppenverwaltung</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">Was du hier konkret pflegst</h2>
              <p className="mt-2 text-sm text-slate-600">
                Nutze Gruppen, um deinen sozialen Rahmen sauber zu halten. Das hilft später bei Sichtbarkeit, Relevanz und
                Einladungen, ohne dass du im spontanen Flow zusätzliche Verwaltungsarbeit siehst.
              </p>
            </div>
            <a
              href="#gruppen"
              className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700"
            >
              Zu den Gruppenlisten
            </a>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Hier verwaltest du</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Kontakte und Kreise, die für spätere Events relevant sind</li>
                <li>Hashtags und Sichtbarkeit, die du bewusst begrenzen oder öffnen willst</li>
                <li>Invite-Links, Mitgliedschaften und Sync-Gruppen aus Google Kontakte</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Hier machst du bewusst nicht</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>offene Aktivitäten durchscrollen wie in einem Feed</li>
                <li>Vorschläge beantworten oder spontane Zusagen priorisieren</li>
                <li>eigene Planung gegen fremde Aktivitäten direkt vergleichen</li>
              </ul>
            </div>
          </div>
        </section>

        {datingModeEnabled ? (
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
        ) : null}

        <section id="gruppen" className="mt-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Sichtbare Gruppen</h2>
          <p className="mt-1 text-sm text-slate-600">
            Klick auf eine Gruppe für Mitglieder, Invite und Bearbeitung. Die Karten zeigen dir, welche Kreise du aktuell als
            Relevanz- und Sichtbarkeitslayer pflegst.
          </p>
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
