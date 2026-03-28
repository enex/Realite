import { hasRequiredCalendarScopes } from "@/src/lib/provider-adapters";

type CalendarConnectionInput = {
  hasConnection: boolean;
  providerId?: string | null;
  scope: string | null | undefined;
  writableCalendarCount: number;
  readableCalendarCount: number;
};

export type CalendarConnectionState = "connected" | "not_connected" | "needs_reconnect";

export function deriveCalendarConnectionState(input: CalendarConnectionInput): CalendarConnectionState {
  if (!input.hasConnection) {
    return "not_connected";
  }

  if (!hasRequiredCalendarScopes(input.scope, input.providerId ?? "google")) {
    return "needs_reconnect";
  }

  if (input.writableCalendarCount > 0 || input.readableCalendarCount > 0) {
    return "connected";
  }

  return "needs_reconnect";
}
