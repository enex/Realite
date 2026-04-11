"use client";

import { EventImage } from "@/src/components/event-image";
import { EventLocationDetails } from "@/src/components/event-location-details";
import { getEventJoinModeMeta, type EventJoinMode } from "@/src/lib/event-join-modes";
import { getEventOnSiteVisibilityMeta } from "@/src/lib/event-on-site";
import { getEventPresenceAudienceHint } from "@/src/lib/event-presence";
import { getEventVisibilityMeta, type EventVisibility } from "@/src/lib/event-visibility";
import { getPersonDisplayLabel } from "@/src/lib/person-display";
import {
  detailBodyClassName,
  detailLabelClassName,
  getPageIntentMeta,
  pageMetaClassName,
  pageTitleClassName,
  surfaceShellClassName,
} from "@/src/lib/page-hierarchy";
import { stripRealiteCalendarMetadata } from "@/src/lib/realite-calendar-links";
import { sanitizeBasicHtml } from "@/src/lib/sanitize-basic-html";
import { getVisualPriorityMeta } from "@/src/lib/visual-priority";

type SharedEventContentProps = {
  title: string;
  startsAtIso: string;
  endsAtIso: string;
  description?: string | null;
  location?: string | null;
  joinMode?: EventJoinMode | null;
  visibility?: EventVisibility | null;
  allowOnSiteVisibility?: boolean | null;
  /** Bild des Ortes (z. B. Venue). */
  placeImageUrl?: string | null;
  /** Link-Preview-Bild aus der Beschreibung. */
  linkPreviewImageUrl?: string | null;
  groupName?: string | null;
  createdByShortId?: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
  isOwnedByCurrentUser?: boolean;
  showCreatorEmail?: boolean;
  sourceProvider?: string | null;
  sourceEventId?: string | null;
  /** Kompakt: Anzahl Zusagen (Suggestion accepted). */
  acceptedParticipantCount?: number;
  /** Volle Namensliste für Tooltip (Komma-getrennt). */
  acceptedParticipantNamesLine?: string | null;
};

function buildGoogleCalendarEditUrl(sourceProvider?: string | null, sourceEventId?: string | null) {
  if (sourceProvider !== "google" || !sourceEventId) {
    return null;
  }

  const params = new URLSearchParams({
    sourceProvider: sourceProvider,
    sourceEventId: sourceEventId,
  });

  return `/api/events/source-link?${params.toString()}`;
}

function formatEventDurationLabel(startsAt: Date, endsAt: Date): string {
  const ms = endsAt.getTime() - startsAt.getTime();
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} Std. ${m} Min.` : `${h} Std.`;
  }
  return `${minutes} Min.`;
}

function getSchedulePhase(
  startsAt: Date,
  endsAt: Date,
  now: Date,
): { label: string; emphasis: "live" | "default" | "muted" } {
  if (now < startsAt) {
    return { label: "Bevorstehend", emphasis: "default" };
  }
  if (now <= endsAt) {
    return { label: "Läuft gerade", emphasis: "live" };
  }
  return { label: "Vorbei", emphasis: "muted" };
}

const metaPillClassName =
  "inline-flex max-w-full items-center rounded-full border border-border/90 bg-muted/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm dark:border-white/12 dark:bg-card/5";

function EventCoverImage({
  placeImageUrl,
  linkPreviewImageUrl,
}: {
  placeImageUrl?: string | null;
  linkPreviewImageUrl?: string | null;
}) {
  const coverUrl = placeImageUrl ?? linkPreviewImageUrl ?? null;
  if (!coverUrl) return null;

  return (
    <div className="-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl sm:-mx-6 sm:-mt-6">
      <EventImage
        src={coverUrl}
        className="h-44 w-full object-cover sm:h-52"
        sizes="(max-width: 640px) 100vw, 672px"
      />
    </div>
  );
}

export function SharedEventContent(props: SharedEventContentProps) {
  const startsAt = new Date(props.startsAtIso);
  const endsAt = new Date(props.endsAtIso);
  const location = props.location?.trim() ?? "";
  const description = stripRealiteCalendarMetadata(props.description)?.trim() ?? "";
  const sanitizedDescriptionHtml = sanitizeBasicHtml(description);
  const joinModeMeta = props.joinMode ? getEventJoinModeMeta(props.joinMode) : null;
  const visibilityMeta = props.visibility ? getEventVisibilityMeta(props.visibility) : null;
  const managementPage = getPageIntentMeta("manage");
  const onSiteMeta = getEventOnSiteVisibilityMeta(Boolean(props.allowOnSiteVisibility));
  const onSiteAudienceHint =
    props.allowOnSiteVisibility && props.visibility
      ? getEventPresenceAudienceHint({
          visibility: props.visibility,
          groupName: props.groupName,
        })
      : null;
  const originalEditUrl = props.isOwnedByCurrentUser
    ? buildGoogleCalendarEditUrl(props.sourceProvider, props.sourceEventId)
    : null;
  const creatorLabel = getPersonDisplayLabel({
    name: props.createdByName,
    email: props.createdByEmail,
    allowEmail: props.showCreatorEmail ?? true,
  });
  const showCreatorLine = Boolean(props.createdByName?.trim() || props.createdByEmail?.trim());
  const showCreatorEmailSuffix =
    (props.showCreatorEmail ?? true) &&
    Boolean(props.createdByName?.trim() && props.createdByEmail?.trim());

  const durationLabel = formatEventDurationLabel(startsAt, endsAt);
  const phase = getSchedulePhase(startsAt, endsAt, new Date());
  const phaseClassName =
    phase.emphasis === "live"
      ? "font-semibold text-teal-600"
      : phase.emphasis === "muted"
        ? "text-muted-foreground"
        : "text-foreground";

  const acceptedN = props.acceptedParticipantCount ?? 0;
  const acceptedTitle = props.acceptedParticipantNamesLine?.trim() ?? undefined;

  return (
    <section className={`${surfaceShellClassName} p-5 sm:p-6`}>
      <EventCoverImage
        placeImageUrl={props.placeImageUrl}
        linkPreviewImageUrl={props.linkPreviewImageUrl}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {props.groupName ? (
            <p className={managementPage.eyebrowClassName}>Gruppe: {props.groupName}</p>
          ) : null}
          <h1
            className={`${props.groupName ? pageTitleClassName : "text-2xl font-semibold tracking-tight text-foreground"} sm:text-3xl`}
          >
            {props.title}
          </h1>
        </div>

        {originalEditUrl ? (
          <a
            href={originalEditUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 text-xs font-semibold text-foreground hover:border-muted-foreground dark:border-white/15 dark:bg-card/5 dark:hover:border-white/25"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Bearbeiten
          </a>
        ) : null}
      </div>

      <p className={`${detailBodyClassName} sm:text-base`}>
        {startsAt.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}{" "}
        · {startsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} bis{" "}
        {endsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
      </p>

      <p className="mt-2 text-sm text-muted-foreground">
        <span className="text-muted-foreground">Dauer</span> {durationLabel}
        <span className="mx-2 text-muted-foreground" aria-hidden="true">
          ·
        </span>
        <span className={phaseClassName}>{phase.label}</span>
      </p>

      {showCreatorLine ? (
        <p className={pageMetaClassName}>
          Von{" "}
          {props.createdByShortId ? (
            <a
              href={`/u/${props.createdByShortId}`}
              className="font-medium text-teal-600 hover:text-teal-700"
            >
              {creatorLabel}
            </a>
          ) : (
            creatorLabel
          )}
          {showCreatorEmailSuffix ? ` (${props.createdByEmail})` : ""}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Kurzinfos zum Event">
        {acceptedN > 0 ? (
          <span className={metaPillClassName} title={acceptedTitle}>
            {acceptedN} {acceptedN === 1 ? "Zusage" : "Zusagen"}
          </span>
        ) : null}
        {joinModeMeta ? (
          <span className={metaPillClassName} title={`${joinModeMeta.label} · ${joinModeMeta.description}`}>
            Mitmachen: {joinModeMeta.label}
          </span>
        ) : null}
        {visibilityMeta ? (
          <span
            className={metaPillClassName}
            title={`${visibilityMeta.label} · ${visibilityMeta.description}`}
          >
            Sichtbarkeit: {visibilityMeta.label}
          </span>
        ) : null}
        <span
          className={metaPillClassName}
          title={
            onSiteAudienceHint
              ? `${onSiteMeta.label} · ${onSiteMeta.description} · ${onSiteAudienceHint}`
              : `${onSiteMeta.label} · ${onSiteMeta.description}`
          }
        >
          Vor Ort: {onSiteMeta.label}
        </span>
      </div>

      {location ? (
        <EventLocationDetails location={location} />
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Kein Ort angegeben.</p>
      )}

      {sanitizedDescriptionHtml ? (
        <section className={`mt-4 rounded-xl border p-4 ${getVisualPriorityMeta("neutral").insetClassName}`}>
          <p className={detailLabelClassName}>Beschreibung</p>
          <div
            className={`${detailBodyClassName} whitespace-pre-wrap [&_a]:font-medium [&_a]:text-teal-600 [&_a]:underline hover:[&_a]:text-teal-700 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6`}
            dangerouslySetInnerHTML={{ __html: sanitizedDescriptionHtml }}
          />
        </section>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Keine Beschreibung.</p>
      )}
    </section>
  );
}
