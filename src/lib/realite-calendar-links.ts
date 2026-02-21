export type RealiteCalendarLinkType = "event" | "suggestion";

const REALITE_METADATA_HEADER = "Realite-Link (automatisch ergänzt)";
const METADATA_LINE_REGEX = /(?:\n{2,})?Realite-Link \(automatisch ergänzt\):\s*https?:\/\/\S+/giu;
const METADATA_BLOCK_REGEX = /(?:\n{2,})?Realite-Link \(automatisch ergänzt\)\nTyp: (?:Event|Vorschlag)\nURL:\s*https?:\/\/\S+/giu;
const LEGACY_SUGGESTION_BLOCK_REGEX = /(?:\n{2,})?Vorschlag von Realite\.\nEventseite:\s*https?:\/\/\S+\nAntwortseite:\s*https?:\/\/\S+/giu;

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function collapseWhitespace(value: string) {
  return value.replace(/\n{3,}/g, "\n\n").trim();
}

export function stripRealiteCalendarMetadata(description?: string | null) {
  const normalized = normalizeLineEndings(description ?? "");
  const cleaned = normalized
    .replace(METADATA_LINE_REGEX, "")
    .replace(METADATA_BLOCK_REGEX, "")
    .replace(LEGACY_SUGGESTION_BLOCK_REGEX, "");

  const compact = collapseWhitespace(cleaned);
  return compact ? compact : null;
}

export function buildRealiteCalendarMetadata(input: {
  description?: string | null;
  url: string;
  type: RealiteCalendarLinkType;
}) {
  const baseDescription = stripRealiteCalendarMetadata(input.description);
  const metadataBlock = `${REALITE_METADATA_HEADER}: ${input.url}`;

  return [baseDescription, metadataBlock].filter(Boolean).join("\n\n");
}
