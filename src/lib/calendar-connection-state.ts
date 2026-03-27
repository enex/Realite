type CalendarConnectionInput = {
  hasConnection: boolean;
  scope: string | null | undefined;
  writableCalendarCount: number;
  readableCalendarCount: number;
};

export type CalendarConnectionState = "connected" | "not_connected" | "needs_reconnect";

function hasCalendarScope(scope: string | null | undefined) {
  if (!scope) {
    return false;
  }

  return scope
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => entry === "https://www.googleapis.com/auth/calendar");
}

export function deriveCalendarConnectionState(input: CalendarConnectionInput): CalendarConnectionState {
  if (!input.hasConnection) {
    return "not_connected";
  }

  if (!hasCalendarScope(input.scope)) {
    return "needs_reconnect";
  }

  if (input.writableCalendarCount > 0 || input.readableCalendarCount > 0) {
    return "connected";
  }

  return "needs_reconnect";
}
