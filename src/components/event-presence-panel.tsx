"use client";

import { useState } from "react";

import { toast } from "@/src/components/toaster";
import {
  getEventPresenceAudienceCopy,
  getEventPresenceAudienceRuleCopy,
  getEventPresenceDisplayMeta,
  getEventPresenceDisplayState,
  formatEventPresenceTime,
  getDefaultEventPresenceVisibleUntil,
  getEventPresencePanelCopy,
  getEventPresenceToggleCopy,
  getEventPresenceWindow,
  getEventPresenceWindowOptions,
  getEventPresenceWindowCopy,
  type EventPresenceStatus,
} from "@/src/lib/event-presence";
import { type EventVisibility } from "@/src/lib/event-visibility";
import { getPersonDisplayLabel } from "@/src/lib/person-display";

type PresenceUser = {
  userId: string;
  name: string | null;
  email: string;
  visibleUntilIso: string;
  presenceLocationNote?: string | null;
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

/** Eigene Shell: keine „reaction“-Gradienten — im Dark Mode nur App-Surface + klare Kontraste. */
const shellClassName =
  "mt-4 rounded-2xl border border-border bg-card p-6 shadow-sm dark:border-white/12 dark:bg-[var(--app-surface)] dark:shadow-none sm:p-6";

const insetClassName =
  "rounded-xl border border-border bg-muted p-4 dark:border-white/10 dark:bg-card/[0.06]";

const primaryBtnClassName =
  "rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryBtnClassName =
  "rounded-lg border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-card/10 dark:hover:bg-card/15";

export function EventPresencePanel(props: EventPresencePanelProps) {
  const [status, setStatus] = useState<EventPresenceStatus | null>(
    props.initialStatus,
  );
  const [currentVisibleUntilIso, setCurrentVisibleUntilIso] = useState(
    props.initialVisibleUntilIso,
  );
  const [checkedInUsers, setCheckedInUsers] = useState(props.initialCheckedInUsers);
  const [busy, setBusy] = useState(false);
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

  const displayState = getEventPresenceDisplayState({
    status,
    visibleUntil: currentVisibleUntilIso ? new Date(currentVisibleUntilIso) : null,
  });
  const hasCheckedIn = displayState === "checked_in";
  const panelCopy = getEventPresencePanelCopy(displayState);
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
      toast.success(
        getEventPresenceToggleCopy(nextStatus === "checked_in").successMessage,
      );
    } catch (requestError) {
      toast.error(
        requestError instanceof Error ? requestError.message : "Unbekannter Fehler",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={shellClassName}>
      <p className="text-sm font-semibold text-teal-600">Vor Ort Status</p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{panelCopy.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{panelCopy.description}</p>
      <p className="mt-3 text-sm leading-relaxed text-foreground">
        <span className="font-semibold text-foreground">{statusMeta.label}</span>
        <span className="text-muted-foreground"> · </span>
        {activeVisibleUntilLabel ? (
          <span>sichtbar bis {activeVisibleUntilLabel}</span>
        ) : (
          <span>{statusMeta.description}</span>
        )}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground">
        <span className="font-semibold text-foreground">{windowCopy.label}</span>
        <span className="text-muted-foreground"> · </span>
        <span>{windowCopy.description}</span>
      </p>

      {presenceWindow.canCheckIn ? (
        <label className="mt-4 block text-sm text-foreground">
          <span className="font-semibold text-foreground">Sichtbar bis</span>
          <select
            value={selectedVisibleUntilIso}
            onChange={(event) => setSelectedVisibleUntilIso(event.target.value)}
            className="mt-2 block w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm dark:border-white/15 dark:bg-card dark:text-foreground"
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
          className={primaryBtnClassName}
        >
          {presenceWindow.canCheckIn ? panelCopy.actionLabel : windowCopy.actionLabel}
        </button>
        <button
          type="button"
          disabled={busy || !hasCheckedIn}
          onClick={() => updateStatus("left")}
          className={secondaryBtnClassName}
        >
          {!hasCheckedIn ? "Nicht vor Ort sichtbar" : "Nicht mehr vor Ort sichtbar"}
        </button>
      </div>

      <div className={`mt-4 ${insetClassName}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground dark:text-muted-foreground">
          {audienceRuleCopy.title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{audienceRuleCopy.description}</p>
        <p className="mt-3 text-sm font-semibold text-foreground">{audienceCopy.title}</p>
        {checkedInUsers.length > 0 ? (
          <ul className="mt-2 space-y-2 text-sm text-foreground">
            {checkedInUsers.map((user) => (
              <li key={user.userId}>
                <span className="font-medium text-foreground">
                  {getPersonDisplayLabel({
                    name: user.name,
                    email: user.email,
                    allowEmail: false,
                  })}
                </span>{" "}
                · sichtbar bis {formatEventPresenceTime(new Date(user.visibleUntilIso))}
                {user.presenceLocationNote ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · Treffpunkt: {user.presenceLocationNote}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : audienceCopy.description ? (
          <p className="mt-2 text-sm leading-relaxed text-foreground">{audienceCopy.description}</p>
        ) : null}
      </div>

    </section>
  );
}
