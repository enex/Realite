"use client";

import { useEffect, useMemo, useState } from "react";

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
  description?: string | null;
  location?: string | null;
  durationMinutes?: number;
  slotIntervalMinutes?: number;
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
    status: "awaiting_approval" | "pending" | "secured" | "expired" | "cancelled";
    invitedEmails: string[];
    approvalCandidates: Array<{
      email: string;
      label: string;
    }>;
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
  if (status === "awaiting_approval") {
    return "Warten auf deine Freigabe";
  }
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

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function SmartMeetingApprovalPanel({
  meeting,
  run,
  selectedEmails,
  busy,
  onToggle,
  onApprove,
  onReject
}: {
  meeting: SmartMeeting;
  run: NonNullable<SmartMeeting["latestRun"]>;
  selectedEmails: string[];
  busy: boolean;
  onToggle: (email: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const selectedSet = new Set(selectedEmails);

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-950">Kalendereinladungen erst nach deiner Freigabe</p>
      <p className="mt-1 text-xs text-amber-800">
        Prüfe die Liste, entferne Personen bei Bedarf und sende die Einladungen erst danach.
      </p>
      <p className="mt-2 text-xs text-amber-900">
        Ausgewählt: {selectedEmails.length} von {run.approvalCandidates.length} Teilnehmern. Mindestens{" "}
        {meeting.minAcceptedParticipants} bleiben nötig.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {run.approvalCandidates.map((candidate) => (
          <label
            key={candidate.email}
            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              checked={selectedSet.has(candidate.email)}
              onChange={() => onToggle(candidate.email)}
              disabled={busy}
              className="mt-0.5"
            />
            <span>
              <span className="block font-medium text-slate-900">{candidate.label}</span>
              <span className="block text-xs text-slate-500">{candidate.email}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Kalendereinladungen senden
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          Diesen Versand ablehnen
        </button>
      </div>
    </div>
  );
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);
  const [busy, setBusy] = useState(false);
  const [approvalBusyRunId, setApprovalBusyRunId] = useState<string | null>(null);
  const [approvalSelections, setApprovalSelections] = useState<Record<string, string[]>>({});
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

  useEffect(() => {
    setApprovalSelections((current) => {
      const next: Record<string, string[]> = {};

      for (const meeting of smartMeetings) {
        const run = meeting.latestRun;
        if (!run || run.status !== "awaiting_approval") {
          continue;
        }

        const candidateEmails = run.approvalCandidates.map((candidate) => candidate.email);
        const defaultSelection = run.invitedEmails.filter((email) => candidateEmails.includes(email));
        const hasExistingSelection = Object.prototype.hasOwnProperty.call(current, run.id);
        const currentSelection = hasExistingSelection ? current[run.id] ?? [] : defaultSelection;

        next[run.id] = currentSelection.filter((email) => candidateEmails.includes(email));
      }

      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      const changed =
        currentKeys.length !== nextKeys.length ||
        nextKeys.some((key) => !arraysEqual(current[key] ?? [], next[key] ?? []));

      return changed ? next : current;
    });
  }, [smartMeetings]);

  function startEditing(meeting: SmartMeeting) {
    setForm({
      title: meeting.title,
      groupId: meeting.groupId,
      tags: meeting.tags.join(", "),
      durationMinutes: meeting.durationMinutes ?? 90,
      minAcceptedParticipants: meeting.minAcceptedParticipants,
      responseWindowHours: meeting.responseWindowHours,
      slotIntervalMinutes: meeting.slotIntervalMinutes ?? 30,
      maxAttempts: meeting.maxAttempts,
      searchWindowStart: toDatetimeLocalValue(new Date(meeting.searchWindowStart)),
      searchWindowEnd: toDatetimeLocalValue(new Date(meeting.searchWindowEnd))
    });
    setEditingId(meeting.id);
    setExpanded(true);
  }

  function cancelEditing() {
    setEditingId(null);
    setExpanded(false);
  }

  function toggleApprovalSelection(runId: string, email: string) {
    setApprovalSelections((current) => {
      const selected = new Set(current[runId] ?? []);
      if (selected.has(email)) {
        selected.delete(email);
      } else {
        selected.add(email);
      }

      return {
        ...current,
        [runId]: Array.from(selected).sort((left, right) => left.localeCompare(right))
      };
    });
  }

  async function submitSmartMeeting(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);

    const payload = {
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
    };

    try {
      const url = editingId ? `/api/smart-meetings/${editingId}` : "/api/smart-meetings";
      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          data.error ??
            (editingId ? "Smart-Treffen konnte nicht gespeichert werden" : "Smart-Treffen konnte nicht erstellt werden")
        );
      }

      if (editingId) {
        setEditingId(null);
        setExpanded(false);
      } else {
        setForm((state) => ({
          ...state,
          title: "",
          tags: ""
        }));
        setExpanded(false);
      }
      await onCreated();
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : editingId
            ? "Smart-Treffen konnte nicht gespeichert werden"
            : "Smart-Treffen konnte nicht erstellt werden"
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitApprovalAction(
    meeting: SmartMeeting,
    action: "approve" | "reject"
  ) {
    const run = meeting.latestRun;
    if (!run || run.status !== "awaiting_approval") {
      return;
    }

    setApprovalBusyRunId(run.id);

    try {
      const response = await fetch(`/api/smart-meetings/${meeting.id}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "approve"
            ? {
                action,
                runId: run.id,
                attendeeEmails: approvalSelections[run.id] ?? run.invitedEmails
              }
            : {
                action,
                runId: run.id
              }
        )
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Smart-Treffen konnte nicht aktualisiert werden");
      }

      await onCreated();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Smart-Treffen konnte nicht aktualisiert werden");
    } finally {
      setApprovalBusyRunId(null);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Smart Treffen</h2>
          <p className="mt-1 text-sm text-slate-600">
            Realite sucht den besten Zeitpunkt in deinem Fenster. Kalendereinladungen gehen erst raus, wenn du die
            Teilnehmerliste ausdrücklich freigibst.
          </p>
        </div>
        <button
          onClick={() => setExpanded((current) => !current)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          {expanded ? "Planer schließen" : "Smart Treffen planen"}
        </button>
      </div>

      {expanded ? (
        <form onSubmit={submitSmartMeeting} className="mt-4 grid gap-3 rounded-lg border border-slate-200 p-4">
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {editingId ? "Speichern" : "Smart Treffen starten"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Abbrechen
              </button>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">
            Shortcut für normale Events: `!min=3 !frist=24h !fenster=24h` direkt im Titel. Danach erscheint ebenfalls erst ein
            freizugebender Teilnehmer-Vorschlag, bevor Kalendereinladungen gesendet werden.
          </p>
        </form>
      ) : null}

      <div className="mt-4 space-y-2">
        {smartMeetings.length === 0 ? <p className="text-sm text-slate-500">Noch keine Smart Treffen vorhanden.</p> : null}
        {smartMeetings.map((meeting) => (
          <article key={meeting.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-900">{meeting.title}</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-slate-500">Status: {statusLabel(meeting.status)}</p>
                <button
                  type="button"
                  onClick={() => startEditing(meeting)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Bearbeiten
                </button>
              </div>
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
            {meeting.latestRun?.status === "awaiting_approval" ? (
              <SmartMeetingApprovalPanel
                meeting={meeting}
                run={meeting.latestRun}
                selectedEmails={approvalSelections[meeting.latestRun.id] ?? meeting.latestRun.invitedEmails}
                busy={approvalBusyRunId === meeting.latestRun.id}
                onToggle={(email) => toggleApprovalSelection(meeting.latestRun!.id, email)}
                onApprove={() => submitApprovalAction(meeting, "approve")}
                onReject={() => submitApprovalAction(meeting, "reject")}
              />
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
