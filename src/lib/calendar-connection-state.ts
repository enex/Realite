import {
  hasRequiredCalendarScopes,
  hasRequiredContactsScopes,
} from "@/src/lib/provider-adapters";

type CalendarConnectionInput = {
  hasConnection: boolean;
  providerId?: string | null;
  scope: string | null | undefined;
  writableCalendarCount: number;
  readableCalendarCount: number;
};

export type CalendarConnectionState =
  | "connected"
  | "not_connected"
  | "needs_reconnect";

/**
 * Leitet den Kalender-Verbindungsstatus ab.
 *
 * - `not_connected`: Keine Google-Verbindung ODER Verbindung hat keine Kalender-Scopes.
 *   Das ist der Normalzustand für neue Nutzer nach dem minimalen Login.
 * - `needs_reconnect`: Kalender-Scopes waren erteilt, aber die Kalender-API liefert
 *   keine Kalender mehr (Token widerrufen, abgelaufen oder Berechtigung entzogen).
 * - `connected`: Kalender-Scopes aktiv und mindestens ein Kalender erreichbar.
 */
export function deriveCalendarConnectionState(
  input: CalendarConnectionInput,
): CalendarConnectionState {
  if (
    !input.hasConnection ||
    !hasRequiredCalendarScopes(input.scope, input.providerId ?? "google")
  ) {
    return "not_connected";
  }

  if (input.writableCalendarCount > 0 || input.readableCalendarCount > 0) {
    return "connected";
  }

  return "needs_reconnect";
}

export type ContactsConnectionState = "connected" | "not_connected";

/**
 * Leitet den Kontakte-Verbindungsstatus ab.
 * Kontakte sind verbunden, wenn die Google-Contacts-Scopes in der gespeicherten
 * Berechtigung enthalten sind.
 */
export function deriveContactsConnectionState(
  scope: string | null | undefined,
): ContactsConnectionState {
  return hasRequiredContactsScopes(scope) ? "connected" : "not_connected";
}
