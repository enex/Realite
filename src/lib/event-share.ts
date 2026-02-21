import { type PublicEventSharePreview, getPublicEventSharePreviewById } from "@/src/lib/repository";
import { enlargeUUID } from "@/src/lib/utils/short-uuid";

export const EVENT_SHARE_FALLBACK_TITLE = "Event auf Realite";
export const EVENT_SHARE_FALLBACK_DESCRIPTION = "Öffne den Link, um das Event in Realite anzusehen.";

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function stripHashtagsFromTitle(value: string) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  const filtered = tokens.filter((token) => {
    const normalized = token.replace(/^[([{"']+/, "").replace(/[)\]}".,!?;:'-]+$/, "");
    return !normalized.startsWith("#");
  });

  return filtered.join(" ").trim();
}

export function formatEventShareSchedule(event: Pick<PublicEventSharePreview, "startsAt" | "endsAt" | "location">) {
  const day = event.startsAt.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const start = event.startsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const end = event.endsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const location = event.location?.trim() ? ` | ${truncate(event.location.trim(), 64)}` : "";

  return `${day} | ${start}-${end}${location}`;
}

export function formatEventShareOwner(preview: PublicEventSharePreview) {
  const creator = preview.createdByName?.trim() || preview.createdByEmail?.trim();
  if (!creator) {
    return "Von einem Realite Mitglied";
  }

  return `Von ${truncate(creator, 56)}`;
}

export async function getPublicEventSharePreviewByShortId(shortEventId: string) {
  try {
    const eventId = enlargeUUID(shortEventId);
    return await getPublicEventSharePreviewById(eventId);
  } catch {
    return null;
  }
}

export function getEventShareCopy(preview: PublicEventSharePreview | null) {
  if (!preview) {
    return {
      title: EVENT_SHARE_FALLBACK_TITLE,
      description: EVENT_SHARE_FALLBACK_DESCRIPTION
    };
  }

  const sanitizedTitle = stripHashtagsFromTitle(preview.title);
  const title = truncate(sanitizedTitle || preview.title.trim(), 90) || EVENT_SHARE_FALLBACK_TITLE;
  const schedule = formatEventShareSchedule(preview);
  const descriptionText = preview.description?.trim();
  const owner = formatEventShareOwner(preview);
  const detail = descriptionText ? truncate(descriptionText, 96) : null;

  return {
    title,
    description: [schedule, owner, detail].filter(Boolean).join(" | ")
  };
}
