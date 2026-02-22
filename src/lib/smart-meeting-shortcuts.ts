export type SmartMeetingShortcutConfig = {
  enabled: boolean;
  cleanedTitle: string;
  minAcceptedParticipants: number | null;
  responseWindowHours: number | null;
  searchWindowHours: number | null;
  maxAttempts: number | null;
  slotIntervalMinutes: number | null;
};

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function parsePositiveInt(raw: string | undefined) {
  if (!raw) {
    return null;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function parseHoursShortcut(raw: string | undefined) {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  const matched = normalized.match(/^(\d+)(?:h|std)?$/i);
  if (!matched) {
    return null;
  }

  return parsePositiveInt(matched[1]);
}

function parseMinutesShortcut(raw: string | undefined) {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  const matched = normalized.match(/^(\d+)(?:m|min)?$/i);
  if (!matched) {
    return null;
  }

  return parsePositiveInt(matched[1]);
}

function parseTokenWithOptionalValue(token: string) {
  const normalized = token.trim().toLowerCase();
  if (!normalized.startsWith("!")) {
    return null;
  }

  const directMatch = normalized.match(/^!([a-zäöüß]+)=(.+)$/i);
  if (directMatch) {
    return {
      key: directMatch[1] ?? "",
      value: directMatch[2] ?? ""
    };
  }

  const compactMatch = normalized.match(/^!([a-zäöüß]+)(\d+[a-z]*)$/i);
  if (compactMatch) {
    return {
      key: compactMatch[1] ?? "",
      value: compactMatch[2] ?? ""
    };
  }

  return {
    key: normalized.slice(1),
    value: ""
  };
}

export function parseSmartMeetingShortcuts(title: string): SmartMeetingShortcutConfig {
  const tokens = title.split(/\s+/).filter(Boolean);
  const cleanedTokens: string[] = [];

  let enabled = false;
  let minAcceptedParticipants: number | null = null;
  let responseWindowHours: number | null = null;
  let searchWindowHours: number | null = null;
  let maxAttempts: number | null = null;
  let slotIntervalMinutes: number | null = null;

  for (const token of tokens) {
    const parsed = parseTokenWithOptionalValue(token);
    if (!parsed) {
      cleanedTokens.push(token);
      continue;
    }

    const key = parsed.key;
    const value = parsed.value;

    if (key === "smart" || key === "auto") {
      enabled = true;
      continue;
    }

    if (key === "min" || key === "mind" || key === "mindestens") {
      const parsedValue = parsePositiveInt(value);
      if (parsedValue) {
        minAcceptedParticipants = clampInt(parsedValue, 1, 50);
        enabled = true;
        continue;
      }
    }

    if (key === "frist" || key === "deadline") {
      const parsedValue = parseHoursShortcut(value);
      if (parsedValue) {
        responseWindowHours = clampInt(parsedValue, 1, 336);
        enabled = true;
        continue;
      }
    }

    if (key === "fenster" || key === "window") {
      const parsedValue = parseHoursShortcut(value);
      if (parsedValue) {
        searchWindowHours = clampInt(parsedValue, 2, 336);
        enabled = true;
        continue;
      }
    }

    if (key === "versuche" || key === "attempts") {
      const parsedValue = parsePositiveInt(value);
      if (parsedValue) {
        maxAttempts = clampInt(parsedValue, 1, 10);
        enabled = true;
        continue;
      }
    }

    if (key === "interval" || key === "slot") {
      const parsedValue = parseMinutesShortcut(value);
      if (parsedValue) {
        slotIntervalMinutes = clampInt(parsedValue, 15, 180);
        enabled = true;
        continue;
      }
    }

    cleanedTokens.push(token);
  }

  const cleanedTitle = cleanedTokens.join(" ").replace(/\s{2,}/g, " ").trim();

  return {
    enabled,
    cleanedTitle,
    minAcceptedParticipants,
    responseWindowHours,
    searchWindowHours,
    maxAttempts,
    slotIntervalMinutes
  };
}
