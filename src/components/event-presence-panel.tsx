"use client";

import { useState } from "react";

import {
  getEventPresenceAudienceCopy,
  getEventPresenceAudienceRuleCopy,
  getEventPresenceDisplayMeta,
  getEventPresenceDisplayState,
  formatEventPresenceTime,
  getDefaultEventPresenceVisibleUntil,
  getEventPresenceToggleCopy,
  getEventPresenceWindow,
  getEventPresenceWindowOptions,
  getEventPresenceWindowCopy,
  type EventPresenceStatus,
} from "@/src/lib/event-presence";
import { getCardSurfaceMeta } from "@/src/lib/card-system";
import { type EventVisibility } from "@/src/lib/event-visibility";
import { getPersonDisplayLabel } from "@/src/lib/person-display";

type PresenceUser = {
  userId: string;
  name: string | null;
  email: string;
  visibleUntilIso: string;
};

type EventPresencePanelProps = {
  eventId: string;
  startsAtIso: string;
  endsAtIso: string;
  visibility: EventVisibility;
  groupName?: string | null;
  initialStatus: EventPresenceStatus | null;
  initialVisibleUntilIso: string | null;
  initialCheckedInUsers: PresenceUser[];
};

export function EventPresencePanel(props: EventPresencePanelProps) {
  const presenceCard = getCardSurfaceMeta("presence");
  const [status, setStatus] = useState<EventPresenceStatus | null>(
    props.initialStatus,
  );
  const [currentVisibleUntilIso, setCurrentVisibleUntilIso] = useState(
    props.initialVisibleUntilIso,
  );
  const [checkedInUsers, setCheckedInUsers] = useState(props.initialCheckedInUsers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const startsAt = new Date(props.startsAtIso);
  const endsAt = new Date(props.endsAtIso);
  const presenceWindow = getEventPresenceWindow({ startsAt, endsAt });
  const windowCopy = getEventPresenceWindowCopy({ startsAt, endsAt });
  const windowOptions = getEventPresenceWindowOptions(endsAt);
  const [selectedVisibleUntilIso, setSelectedVisibleUntilIso] = useState(
    props.initialVisibleUntilIso ??
      getDefaultEventPresenceVisibleUntil(endsAt)?.toISOString() ??
      "",
  );

  const hasCheckedIn = status === "checked_in";
  const toggleCopy = getEventPresenceToggleCopy(hasCheckedIn);
  const displayState = getEventPresenceDisplayState({
    status,
    visibleUntil: currentVisibleUntilIso ? new Date(currentVisibleUntilIso) : null,
  });
  const statusMeta = getEventPresenceDisplayMeta(displayState);
  const audienceCopy = getEventPresenceAudienceCopy({
    windowState: presenceWindow.state,
    checkedInCount: checkedInUsers.length,
  });
  const audienceRuleCopy = getEventPresenceAudienceRuleCopy({
    visibility: props.visibility,
    groupName: props.groupName,
  });
  const selectOptions =
    selectedVisibleUntilIso &&
    !windowOptions.some(
      (option) => option.visibleUntil.toISOString() === selectedVisibleUntilIso,
    )
      ? [
          {
            value: "current_selection",
            label: "Aktuelles Zeitfenster",
            visibleUntil: new Date(selectedVisibleUntilIso),
          },
          ...windowOptions,
        ]
      : windowOptions;
  const activeVisibleUntilLabel =
    displayState === "checked_in" && currentVisibleUntilIso
      ? formatEventPresenceTime(new Date(currentVisibleUntilIso))
      : null;

  async function updateStatus(nextStatus: EventPresenceStatus) {
    setBusy(true);
    setError(null);
    setSavedMessage(null);

    try {
      const response = await fetch(`/api/events/${props.eventId}/presence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
          visibleUntilIso:
            nextStatus === "checked_in" ? selectedVisibleUntilIso : undefined,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        summary?: {
          currentUserStatus: EventPresenceStatus | null;
          currentUserVisibleUntilIso: string | null;
          checkedInUsers: PresenceUser[];
        };
      };

      if (!response.ok || !payload.summary) {
        throw new Error(
          payload.error ?? "Vor-Ort-Status konnte nicht gespeichert werden.",
        );
      }

      setStatus(payload.summary.currentUserStatus);
      setCurrentVisibleUntilIso(payload.summary.currentUserVisibleUntilIso);
      setCheckedInUsers(payload.summary.checkedInUsers);
      if (payload.summary.currentUserVisibleUntilIso) {
        setSelectedVisibleUntilIso(payload.summary.currentUserVisibleUntilIso);
      }
      setSavedMessage(getEventPresenceToggleCopy(nextStatus === "checked_in").successMessage);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unbekannter Fehler",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`mt-4 ${presenceCard.sectionClassName} sm:p-6`}>
      <p className={`text-sm font-semibold ${presenceCard.accentTextClassName}`}>Vor Ort Status</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">{toggleCopy.title}</h2>
      <p className="mt-2 text-sm text-slate-700">{toggleCopy.description}</p>
      <p className="mt-3 text-sm text-slate-600">
        <span className="font-medium text-slate-900">{statusMeta.label}</span> ·{" "}
        {activeVisibleUntilLabel
          ? `sichtbar bis ${activeVisibleUntilLabel}`
          : statusMeta.description}
      </p>
      <p className="mt-2 text-sm text-slate-600">
        <span className="font-medium text-slate-900">{windowCopy.label}</span> ·{" "}
        {windowCopy.description}
      </p>

      {presenceWindow.canCheckIn ? (
        <label className="mt-4 block text-sm text-slate-700">
          <span className="font-medium text-slate-900">Sichtbar bis</span>
          <select
            value={selectedVisibleUntilIso}
            onChange={(event) => setSelectedVisibleUntilIso(event.target.value)}
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {selectOptions.map((option) => (
              <option key={option.value} value={option.visibleUntil.toISOString()}>
                {option.label} ({formatEventPresenceTime(option.visibleUntil)})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={
            busy ||
            !presenceWindow.canCheckIn ||
            !selectedVisibleUntilIso ||
            windowOptions.length === 0
          }
          onClick={() => updateStatus("checked_in")}
          className={presenceCard.actionClassName}
        >
          {presenceWindow.canCheckIn ? toggleCopy.actionLabel : windowCopy.actionLabel}
        </button>
        <button
          type="button"
          disabled={busy || !hasCheckedIn}
          onClick={() => updateStatus("left")}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!hasCheckedIn ? "Nicht vor Ort sichtbar" : "Nicht mehr vor Ort sichtbar"}
        </button>
      </div>

      <div className={`mt-4 ${presenceCard.insetClassName}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {audienceRuleCopy.title}
        </p>
        <p className="mt-2 text-sm text-slate-600">{audienceRuleCopy.description}</p>
        <p className="text-sm font-semibold text-slate-900">{audienceCopy.title}</p>
        {checkedInUsers.length > 0 ? (
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {checkedInUsers.map((user) => (
              <li key={user.userId}>
                <span className="font-medium text-slate-900">
                  {getPersonDisplayLabel({
                    name: user.name,
                    email: user.email,
                    allowEmail: false,
                  })}
                </span>{" "}
                · sichtbar bis {formatEventPresenceTime(new Date(user.visibleUntilIso))}
              </li>
            ))}
          </ul>
        ) : (
          audienceCopy.description ? (
            <p className="mt-2 text-sm text-slate-600">{audienceCopy.description}</p>
          ) : null
        )}
      </div>

      {savedMessage ? (
        <p className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700">
          {savedMessage}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
