"use client";

import { useEffect, useMemo, useState } from "react";

import { getCardSurfaceMeta } from "@/src/lib/card-system";
import { getPageIntentMeta } from "@/src/lib/page-hierarchy";
import { getSmartMeetingOverview } from "@/src/lib/smart-meeting-overview";

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

function getMeetingStage(meeting: SmartMeeting) {
  const latestRunStatus = meeting.latestRun?.status;

  if (latestRunStatus === "awaiting_approval") {
    return {
      badge: "Freigabe offen",
      eyebrow: "Nächster Orga-Schritt",
      title: "Teilnehmerliste prüfen",
      description: "Wähle bewusst aus, wer die Kalendereinladung wirklich bekommen soll."
    };
  }

  if (latestRunStatus === "pending") {
    return {
      badge: "Warten auf Zusagen",
      eyebrow: "Nächster Orga-Schritt",
      title: "Auf Antworten der Gruppe warten",
      description: "Der Lauf sammelt gerade Zu- und Absagen im offenen Zeitfenster."
    };
  }

  if (meeting.status === "secured" || latestRunStatus === "secured") {
    return {
      badge: "Gesichert",
      eyebrow: "Planungsstand",
      title: "Termin steht",
      description: "Die Mindestzahl ist erreicht. Der Gruppen-Termin bleibt hier als bestätigter Orga-Stand sichtbar."
    };
  }

  if (meeting.status === "paused") {
    return {
      badge: "Pausiert",
      eyebrow: "Planungsstand",
      title: "Lauf bewusst angehalten",
      description: "Der Suchlauf ruht, bleibt aber als Orga-Verlauf und Bearbeitungsstand erhalten."
    };
  }

  if (meeting.status === "exhausted") {
    return {
      badge: "Beendet",
      eyebrow: "Planungsstand",
      title: "Kein weiterer Suchlauf aktiv",
      description: "Der bisherige Lauf ist abgeschlossen. Starte nur dann neu, wenn die Gruppe einen weiteren Versuch braucht."
    };
  }

  return {
    badge: "Suche läuft",
    eyebrow: "Nächster Orga-Schritt",
    title: "Suchlauf beobachten",
    description: "Realite prüft gerade passende Slots. Deine aktive Entscheidung kommt erst bei Freigabe oder Bearbeitung dazu."
  };
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
  const suggestionCard = getCardSurfaceMeta("suggestion");

  return (
    <div className={`mt-3 ${suggestionCard.insetClassName}`}>
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
            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-card px-3 py-2 text-sm text-foreground"
          >
            <input
              type="checkbox"
              checked={selectedSet.has(candidate.email)}
              onChange={() => onToggle(candidate.email)}
              disabled={busy}
              className="mt-0.5"
            />
            <span>
              <span className="block font-medium text-foreground">{candidate.label}</span>
              <span className="block text-xs text-muted-foreground">{candidate.email}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Kalendereinladungen senden
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className="rounded-lg border border-input px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
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
  pendingSuggestionCount,
  onCreated,
  onError
}: {
  groups: Group[];
  smartMeetings: SmartMeeting[];
  pendingSuggestionCount: number;
  onCreated: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const smartMeetingCard = getCardSurfaceMeta("smart_meeting");
  const discoverPage = getPageIntentMeta("discover");
  const reactPage = getPageIntentMeta("react");
  const managePage = getPageIntentMeta("manage");
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
  const overview = useMemo(
    () =>
      getSmartMeetingOverview(
        smartMeetings.map((meeting) => ({
          status: meeting.status,
          latestRunStatus: meeting.latestRun?.status ?? null
        }))
      ),
    [smartMeetings]
  );

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
    <section id="smart-meetings" className={`mt-8 scroll-mt-24 ${smartMeetingCard.sectionClassName}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${smartMeetingCard.eyebrowClassName}`}>
            Gruppen-Orga unter Events
          </p>
          <h2 className="text-lg font-semibold text-foreground">Smart Treffen</h2>
          <p className="mt-1 text-sm text-muted-foreground">{overview.description}</p>
        </div>
        <button
          onClick={() => setExpanded((current) => !current)}
          className={smartMeetingCard.actionClassName}
        >
          {expanded ? "Planer schließen" : "Orga-Lauf anlegen"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className={smartMeetingCard.insetClassName}>
          <p className={managePage.eyebrowClassName}>Orga-Ablauf statt Discovery</p>
          <h3 className="mt-2 text-base font-semibold text-foreground">{overview.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Smart Treffen ordnet Gruppen-Orga, Suchfenster und Freigaben. Der spontane Einstieg bleibt bewusst in{" "}
            <a href="/now" className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800">
              Jetzt
            </a>{" "}
            und offene Reaktionen in{" "}
            <a href="/suggestions" className="font-medium text-amber-700 underline underline-offset-2 hover:text-amber-800">
              Vorschläge
            </a>.
          </p>
          <div className="mt-4 rounded-xl border border-border bg-card/80 p-4 dark:border-white/12 dark:bg-[var(--app-surface)]">
            <p className={managePage.eyebrowClassName}>Jetzt hier sinnvoll</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{overview.nextStepTitle}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{overview.nextStepDescription}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={smartMeetingCard.statClassName}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Freigabe</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{overview.awaitingApprovalCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Teilnehmerlisten warten auf deine bewusste Freigabe.</p>
            </div>
            <div className={smartMeetingCard.statClassName}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Suche / Zusagen</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{overview.activeRunCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Läufe mit aktiver Terminprüfung oder offenem Antwortfenster.</p>
            </div>
            <div className={smartMeetingCard.statClassName}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Gesichert</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{overview.securedCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Gruppen-Termine mit erreichter Mindestzahl.</p>
            </div>
            <div className={smartMeetingCard.statClassName}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pausiert / beendet</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{overview.pausedCount + overview.exhaustedCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Läufe ohne aktiven Suchstand, aber mit sichtbarer Orga-Historie.</p>
            </div>
          </div>
        </div>

        <div className={smartMeetingCard.mutedInsetClassName}>
          <p className={managePage.eyebrowClassName}>Rückwege</p>
          <h3 className="mt-2 text-base font-semibold text-foreground">Von Planung zurück in den Aktivitätsfluss</h3>
          <div className="mt-4 space-y-3">
            <a href="/now" className="block rounded-xl border border-border bg-card p-4 transition hover:border-teal-300 hover:bg-teal-50">
              <p className={discoverPage.eyebrowClassName}>Zurück zu Jetzt</p>
              <p className="mt-2 text-base font-semibold text-foreground">Spontane Aktivitäten prüfen</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Öffne wieder offene Aktivitäten, sichtbares Momentum und direkte Mitmach-Einstiege.
              </p>
            </a>
            <a
              href={pendingSuggestionCount > 0 ? "/suggestions" : "#events"}
              className="block rounded-xl border border-border bg-card p-4 transition hover:border-amber-300 hover:bg-amber-50"
            >
              <p className={pendingSuggestionCount > 0 ? reactPage.eyebrowClassName : managePage.eyebrowClassName}>
                {pendingSuggestionCount > 0 ? "Reagieren zuerst" : "Sozialkalender"}
              </p>
              <p className="mt-2 text-base font-semibold text-foreground">
                {pendingSuggestionCount > 0 ? "Offene Vorschläge klären" : "Bestätigte Planung im Blick behalten"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {pendingSuggestionCount > 0
                  ? `${pendingSuggestionCount} ${pendingSuggestionCount === 1 ? "Vorschlag wartet" : "Vorschläge warten"} auf deine Entscheidung, bevor mehr Gruppen-Orga nötig ist.`
                  : "Springe zurück in den Sozialkalender mit Zusagen, eigener Planung und weiterem Kalenderkontext."}
              </p>
            </a>
          </div>
        </div>
      </div>

      {expanded ? (
        <form onSubmit={submitSmartMeeting} className={`mt-4 grid gap-3 ${smartMeetingCard.insetClassName}`}>
          <div className="rounded-xl border border-border bg-card/80 p-4 dark:border-white/12 dark:bg-[var(--app-surface)]">
            <p className={managePage.eyebrowClassName}>Neuer Orga-Lauf</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Nutze Smart Treffen nur für planbare Gruppenkoordination: Suchfenster festlegen, Mindestzahl definieren und
              spätere Kalendereinladungen bewusst freigeben.
            </p>
          </div>
          <input
            value={form.title}
            onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))}
            placeholder="Titel"
            className="w-full rounded-lg border border-input px-3 py-2 text-sm"
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={form.groupId}
              onChange={(event) => setForm((state) => ({ ...state, groupId: event.target.value }))}
              className="w-full rounded-lg border border-input px-3 py-2 text-sm"
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
              className="w-full rounded-lg border border-input px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-muted-foreground">
              Dauer (Minuten)
              <input
                type="number"
                min={15}
                max={1440}
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm((state) => ({ ...state, durationMinutes: Number.parseInt(event.target.value || "15", 10) || 15 }))
                }
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
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
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
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
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              Suche ab
              <input
                type="datetime-local"
                value={form.searchWindowStart}
                onChange={(event) => setForm((state) => ({ ...state, searchWindowStart: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Suche bis
              <input
                type="datetime-local"
                value={form.searchWindowEnd}
                onChange={(event) => setForm((state) => ({ ...state, searchWindowEnd: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
                required
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
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
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Max. neue Vorschläge
              <input
                type="number"
                min={1}
                max={10}
                value={form.maxAttempts}
                onChange={(event) =>
                  setForm((state) => ({ ...state, maxAttempts: Number.parseInt(event.target.value || "1", 10) || 1 }))
                }
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {editingId ? "Änderungen speichern" : "Orga-Lauf starten"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-lg border border-input px-4 py-2 text-sm font-semibold text-foreground"
              >
                Abbrechen
              </button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Shortcut für normale Events: `!min=3 !frist=24h !fenster=24h` direkt im Titel. Danach erscheint ebenfalls erst ein
            freizugebender Teilnehmer-Vorschlag, bevor Kalendereinladungen gesendet werden.
          </p>
        </form>
      ) : null}

      <div className="mt-4 space-y-2">
        {smartMeetings.length === 0 ? (
          <div className={smartMeetingCard.mutedInsetClassName}>
            <p className="text-sm font-semibold text-foreground">Noch kein Smart-Treffen-Lauf vorhanden.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Lege hier nur dann einen Gruppenlauf an, wenn du aktiv einen gemeinsamen Termin koordinieren willst. Für spontane
              offene Aktivitäten bleibst du besser in{" "}
              <a href="/now" className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800">
                Jetzt
              </a>.
            </p>
          </div>
        ) : null}
        {smartMeetings.map((meeting) => {
          const stage = getMeetingStage(meeting);

          return (
          <article key={meeting.id} className={smartMeetingCard.itemClassName}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-foreground">{meeting.title}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  {stage.badge}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${smartMeetingCard.badgeClassName}`}>
                  {statusLabel(meeting.status)}
                </span>
                <button
                  type="button"
                  onClick={() => startEditing(meeting)}
                  className="rounded border border-input px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Bearbeiten
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Gruppe {meeting.groupName} · Min {meeting.minAcceptedParticipants} Zusagen · Frist {meeting.responseWindowHours}h
            </p>
            {meeting.latestRun ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {runStatusLabel(meeting.latestRun.status)} · Versuch {meeting.latestRun.attempt}/{meeting.maxAttempts} · Zusagen{" "}
                {meeting.latestRun.acceptedCount}/{meeting.latestRun.participantCount} · {new Date(meeting.latestRun.startsAt).toLocaleString("de-DE")}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Noch kein aktiver Terminversuch.</p>
            )}
            <div className="mt-3 rounded-xl border border-border bg-card/80 p-3 dark:border-white/12 dark:bg-[var(--app-surface)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{stage.eyebrow}</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{stage.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{stage.description}</p>
            </div>
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
          );
        })}
      </div>
    </section>
  );
}
