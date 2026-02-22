"use client";

import { useMemo, useState } from "react";

type Group = {
  id: string;
  name: string;
  isHidden: boolean;
};

type SmartMeeting = {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  status: "active" | "secured" | "exhausted" | "paused";
  tags: string[];
  minAcceptedParticipants: number;
  responseWindowHours: number;
  maxAttempts: number;
  searchWindowStart: string;
  searchWindowEnd: string;
  updatedAt: string;
  latestRun: {
    id: string;
    attempt: number;
    startsAt: string;
    endsAt: string;
    responseDeadlineAt: string;
    status: "pending" | "secured" | "expired" | "cancelled";
    participantCount: number;
    acceptedCount: number;
    declinedCount: number;
    pendingCount: number;
    statusReason: string | null;
  } | null;
};

function toDatetimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function statusLabel(status: SmartMeeting["status"]) {
  if (status === "active") {
    return "Aktiv";
  }
  if (status === "secured") {
    return "Gesichert";
  }
  if (status === "paused") {
    return "Pausiert";
  }
  return "Beendet";
}

function runStatusLabel(status: NonNullable<SmartMeeting["latestRun"]>["status"]) {
  if (status === "pending") {
    return "Warten auf Zusagen";
  }
  if (status === "secured") {
    return "Mindestzahl erreicht";
  }
  if (status === "cancelled") {
    return "Abgebrochen";
  }
  return "Abgelaufen";
}

export function SmartMeetingsCard({
  groups,
  smartMeetings,
  onCreated,
  onError
}: {
  groups: Group[];
  smartMeetings: SmartMeeting[];
  onCreated: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const now = useMemo(() => new Date(), []);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    groupId: "",
    tags: "",
    durationMinutes: 90,
    minAcceptedParticipants: 3,
    responseWindowHours: 24,
    slotIntervalMinutes: 30,
    maxAttempts: 3,
    searchWindowStart: toDatetimeLocalValue(new Date(now.getTime() + 60 * 60 * 1000)),
    searchWindowEnd: toDatetimeLocalValue(new Date(now.getTime() + 24 * 60 * 60 * 1000))
  });

  const visibleGroups = useMemo(() => groups.filter((group) => !group.isHidden), [groups]);

  async function createSmartMeeting(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);

    try {
      const response = await fetch("/api/smart-meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          groupId: form.groupId,
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          durationMinutes: form.durationMinutes,
          minAcceptedParticipants: form.minAcceptedParticipants,
          responseWindowHours: form.responseWindowHours,
          slotIntervalMinutes: form.slotIntervalMinutes,
          maxAttempts: form.maxAttempts,
          searchWindowStart: new Date(form.searchWindowStart).toISOString(),
          searchWindowEnd: new Date(form.searchWindowEnd).toISOString()
        })
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Smart-Meeting konnte nicht erstellt werden");
      }

      setForm((state) => ({
        ...state,
        title: "",
        tags: ""
      }));
      setExpanded(false);
      await onCreated();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Smart-Meeting konnte nicht erstellt werden");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Smart Meetings</h2>
          <p className="mt-1 text-sm text-slate-600">
            Realite sucht den besten Zeitpunkt in deinem Fenster, lädt die Gruppe ein und prüft die Mindestzusagen.
          </p>
        </div>
        <button
          onClick={() => setExpanded((current) => !current)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          {expanded ? "Planer schließen" : "Smart Meeting planen"}
        </button>
      </div>

      {expanded ? (
        <form onSubmit={createSmartMeeting} className="mt-4 grid gap-3 rounded-lg border border-slate-200 p-4">
          <input
            value={form.title}
            onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))}
            placeholder="Titel"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={form.groupId}
              onChange={(event) => setForm((state) => ({ ...state, groupId: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Gruppe wählen</option>
              {visibleGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <input
              value={form.tags}
              onChange={(event) => setForm((state) => ({ ...state, tags: event.target.value }))}
              placeholder="#abendessen, #sport"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-slate-600">
              Dauer (Minuten)
              <input
                type="number"
                min={15}
                max={1440}
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm((state) => ({ ...state, durationMinutes: Number.parseInt(event.target.value || "15", 10) || 15 }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600">
              Mindestzusagen
              <input
                type="number"
                min={1}
                max={50}
                value={form.minAcceptedParticipants}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    minAcceptedParticipants: Number.parseInt(event.target.value || "1", 10) || 1
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600">
              Antwortfrist (Stunden)
              <input
                type="number"
                min={1}
                max={336}
                value={form.responseWindowHours}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    responseWindowHours: Number.parseInt(event.target.value || "1", 10) || 1
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              Suche ab
              <input
                type="datetime-local"
                value={form.searchWindowStart}
                onChange={(event) => setForm((state) => ({ ...state, searchWindowStart: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="text-xs text-slate-600">
              Suche bis
              <input
                type="datetime-local"
                value={form.searchWindowEnd}
                onChange={(event) => setForm((state) => ({ ...state, searchWindowEnd: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              Slot-Intervall (Minuten)
              <input
                type="number"
                min={15}
                max={180}
                value={form.slotIntervalMinutes}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    slotIntervalMinutes: Number.parseInt(event.target.value || "15", 10) || 15
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600">
              Max. neue Vorschläge
              <input
                type="number"
                min={1}
                max={10}
                value={form.maxAttempts}
                onChange={(event) =>
                  setForm((state) => ({ ...state, maxAttempts: Number.parseInt(event.target.value || "1", 10) || 1 }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Smart Meeting starten
          </button>
          <p className="text-xs text-slate-500">
            Shortcut für normale Events: `!min=3 !frist=24h !fenster=24h` direkt im Titel. Dann wird das Event automatisch als
            Smart Meeting geplant.
          </p>
        </form>
      ) : null}

      <div className="mt-4 space-y-2">
        {smartMeetings.length === 0 ? <p className="text-sm text-slate-500">Noch keine Smart Meetings vorhanden.</p> : null}
        {smartMeetings.map((meeting) => (
          <article key={meeting.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-900">{meeting.title}</p>
              <p className="text-xs text-slate-500">Status: {statusLabel(meeting.status)}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Gruppe {meeting.groupName} · Min {meeting.minAcceptedParticipants} Zusagen · Frist {meeting.responseWindowHours}h
            </p>
            {meeting.latestRun ? (
              <p className="mt-1 text-xs text-slate-600">
                {runStatusLabel(meeting.latestRun.status)} · Versuch {meeting.latestRun.attempt}/{meeting.maxAttempts} · Zusagen{" "}
                {meeting.latestRun.acceptedCount}/{meeting.latestRun.participantCount} · {new Date(meeting.latestRun.startsAt).toLocaleString("de-DE")}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-600">Noch kein aktiver Terminversuch.</p>
            )}
            {meeting.latestRun?.statusReason ? (
              <p className="mt-1 text-xs text-amber-700">{meeting.latestRun.statusReason}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
