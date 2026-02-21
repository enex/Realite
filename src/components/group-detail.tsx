"use client";

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

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  visibility: "public" | "group";
  groupId: string | null;
  groupName: string | null;
  tags: string[];
  isAvailable: boolean;
};

type DashboardPayload = {
  sync: {
    warning: string | null;
    contactsWarning: string | null;
  };
  groups: Group[];
  events: EventItem[];
};

const emptyPayload: DashboardPayload = {
  sync: {
    warning: null,
    contactsWarning: null
  },
  groups: [],
  events: []
};

export function GroupDetail({
  groupId,
  userName,
  userEmail,
  userImage
}: {
  groupId: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
}) {
  const [data, setData] = useState<DashboardPayload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    location: "",
    startsAt: "",
    endsAt: "",
    visibility: "group" as "public" | "group",
    tags: "#kontakte"
  });

  const group = useMemo(() => data.groups.find((entry) => entry.id === groupId) ?? null, [data.groups, groupId]);

  const groupEvents = useMemo(
    () =>
      data.events
        .filter((event) => event.groupId === groupId)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [data.events, groupId]
  );

  useEffect(() => {
    if (group) {
      setHashtagsInput(group.hashtags.join(", "));
    }
  }, [group]);

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
        throw new Error(payload.error ?? "Gruppendetails konnten nicht geladen werden");
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
  }, [groupId]);

  async function createInvite() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${groupId}/invite-link`, { method: "POST" });
      const payload = (await response.json()) as { error?: string; inviteUrl?: string };

      if (!response.ok || !payload.inviteUrl) {
        throw new Error(payload.error ?? "Invite-Link konnte nicht erstellt werden");
      }

      setInviteLink(payload.inviteUrl);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function addMemberByEmail(event: React.FormEvent) {
    event.preventDefault();
    const email = memberEmail.trim();
    if (!email) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const payload = (await response.json()) as { error?: string; warning?: string | null };

      if (!response.ok) {
        throw new Error(payload.error ?? "Mitglied konnte nicht hinzugefügt werden");
      }

      setMemberEmail("");
      await loadData();

      if (payload.warning) {
        setError(payload.warning);
      }
    } catch (memberError) {
      setError(memberError instanceof Error ? memberError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function saveHashtags(event: React.FormEvent) {
    event.preventDefault();

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashtags: parseHashtagList(hashtagsInput) })
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Hashtags konnten nicht aktualisiert werden");
      }

      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unbekannter Fehler");
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
          title: eventForm.title,
          description: eventForm.description,
          location: eventForm.location,
          startsAt: new Date(eventForm.startsAt).toISOString(),
          endsAt: new Date(eventForm.endsAt).toISOString(),
          visibility: eventForm.visibility,
          groupId,
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
        visibility: "group",
        tags: "#kontakte"
      });

      await loadData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function toggleGroupHidden() {
    if (!group || !group.syncProvider) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !group.isHidden })
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Gruppe konnte nicht umgeschaltet werden");
      }

      await loadData();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCurrentGroup() {
    if (!group || group.syncProvider) {
      return;
    }

    const confirmed = window.confirm(
      "Gruppe wirklich löschen? Alle Gruppenzugehörigkeiten, Kontakte und Invite-Links dieser Gruppe werden entfernt."
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Gruppe konnte nicht gelöscht werden");
      }

      window.location.href = "/groups";
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
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
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <UserAvatar name={userName} email={userEmail} image={userImage} size="lg" />
              <div>
                <p className="text-sm text-slate-500">Gruppe verwalten</p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{group?.name ?? "Gruppe"}</h1>
                <p className="text-xs text-slate-500">{userName}</p>
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <a href="/groups" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                Zur Gruppenliste
              </a>
              <a
                href="/settings"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Profil
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

      {!loading && !group ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Gruppe nicht gefunden oder keine Berechtigung.</p>
        </section>
      ) : null}

      {group ? (
        <>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-lg font-semibold text-slate-900">{group.name}</p>
                  {group.syncProvider === "google_contacts" && group.syncEnabled ? (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
                      Google Kontakte Sync
                    </span>
                  ) : null}
                  {group.isHidden ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Versteckt
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-slate-500">
                  {group.visibility === "public" ? "öffentlich" : "privat"} · {group.eventCount} Events · {group.contactCount} Kontakte
                </p>
                {group.description ? <p className="mt-1 text-sm text-slate-600">{group.description}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="max-w-full break-all rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Mitglieder & Kontakte</h2>
              <p className="mt-1 text-sm text-slate-600">Alle bekannten Kontakte in dieser Gruppe.</p>

              <form onSubmit={addMemberByEmail} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                  placeholder="person@mail.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:w-auto"
                >
                  Hinzufügen
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {group.contacts.length === 0 ? <p className="text-sm text-slate-500">Keine Kontakte vorhanden.</p> : null}
                {group.contacts.map((contact) => (
                  <div
                    key={`${group.id}:${contact.email}`}
                    className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <UserAvatar name={contact.name} email={contact.email} image={contact.image} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{contact.name ?? contact.email}</p>
                        {contact.name ? <p className="truncate text-xs text-slate-500">{contact.email}</p> : null}
                      </div>
                    </div>
                    <span className="shrink-0 pl-2 text-xs text-slate-500">
                      {contact.email === userEmail ? "Du" : contact.isRegistered ? "Realite" : "Kontakt"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Aktionen</h2>

              <div className="mt-4">
                <button
                  onClick={createInvite}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Invite-Link erstellen
                </button>
                {inviteLink ? <p className="mt-2 break-all text-xs text-teal-700">{inviteLink}</p> : null}
              </div>

              {group.role === "owner" ? (
                <div className="mt-4">
                  {group.syncProvider ? (
                    <button
                      onClick={toggleGroupHidden}
                      disabled={busy}
                      className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50"
                    >
                      {group.isHidden ? "Gruppe einblenden" : "Gruppe verstecken"}
                    </button>
                  ) : (
                    <button
                      onClick={deleteCurrentGroup}
                      disabled={busy}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                    >
                      Gruppe löschen
                    </button>
                  )}
                </div>
              ) : null}

              <form onSubmit={saveHashtags} className="mt-4 space-y-2">
                <label className="text-sm font-medium text-slate-700">Hashtags bearbeiten</label>
                <input
                  value={hashtagsInput}
                  onChange={(event) => setHashtagsInput(event.target.value)}
                  placeholder="#kontakte, #dating"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Speichern
                </button>
              </form>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Event in dieser Gruppe erstellen</h2>
            <form onSubmit={createEvent} className="mt-4 grid gap-3">
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
                placeholder="#kontakte"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={eventForm.visibility}
                onChange={(event) =>
                  setEventForm((state) => ({ ...state, visibility: event.target.value as "public" | "group" }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="group">Nur Gruppe</option>
                <option value="public">Öffentlich</option>
              </select>
              <button
                type="submit"
                disabled={busy}
                className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Event speichern
              </button>
            </form>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Events der Gruppe</h2>
            <div className="mt-4 space-y-2">
              {groupEvents.length === 0 ? (
                <p className="text-sm text-slate-500">Keine Events in dieser Gruppe.</p>
              ) : null}
              {groupEvents.map((event) => (
                <article key={event.id} className="rounded-md border border-slate-200 p-3">
                  <a
                    href={`/e/${shortenUUID(event.id)}`}
                    className="break-words text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-teal-500"
                  >
                    {event.title}
                  </a>
                  <p className="text-xs text-slate-500">
                    {new Date(event.startsAt).toLocaleString("de-DE")} - {new Date(event.endsAt).toLocaleTimeString("de-DE")}
                  </p>
                  {event.tags.length ? <p className="mt-1 text-xs text-slate-600">{event.tags.join(" · ")}</p> : null}
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
    </AppShell>
  );
}
