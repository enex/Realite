"use client";

import { useEffect } from "react";
import { toast } from "@/src/components/toaster";
import { GOOGLE_CONNECT_BASE_PATH } from "@/src/lib/provider-adapters";
import type { CalendarConnectionState } from "@/src/lib/calendar-connection-state";
import type { ContactsConnectionState } from "@/src/lib/calendar-connection-state";

type GoogleConnectCardProps = {
  isGoogleUser: boolean;
  calendarConnectionState: CalendarConnectionState;
  contactsConnectionState: ContactsConnectionState;
};

function buildConnectUrl(
  scopeSet: "calendar" | "contacts",
  callbackUrl = "/settings",
) {
  return `${GOOGLE_CONNECT_BASE_PATH}?scope_set=${scopeSet}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

function ConnectionStatusBadge({
  connected,
  label,
}: {
  connected: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        connected
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-border bg-muted text-muted-foreground"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground/50"}`}
      />
      {label}
    </span>
  );
}

export function GoogleConnectCard({
  isGoogleUser,
  calendarConnectionState,
  contactsConnectionState,
}: GoogleConnectCardProps) {
  // Fehler aus dem Callback-Redirect anzeigen
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connectError = params.get("connect_error");
    if (connectError) {
      const messages: Record<string, string> = {
        token_exchange: "Google hat keinen gültigen Token zurückgegeben. Bitte erneut versuchen.",
        invalid_state: "Sicherheits-Check fehlgeschlagen. Bitte erneut versuchen.",
        user_not_found: "Benutzer nicht gefunden. Bitte neu einloggen.",
        access_denied: "Berechtigung abgelehnt. Du kannst die Verbindung jederzeit erneut starten.",
      };
      const message =
        messages[connectError] ?? "Verbindung fehlgeschlagen. Bitte erneut versuchen.";
      toast.error(message);
      // URL-Parameter entfernen
      const clean = new URL(window.location.href);
      clean.searchParams.delete("connect_error");
      window.history.replaceState({}, "", clean.toString());
    }
  }, []);

  if (!isGoogleUser) {
    return null;
  }

  const calendarConnected = calendarConnectionState === "connected";
  const calendarNeedsReconnect = calendarConnectionState === "needs_reconnect";
  const contactsConnected = contactsConnectionState === "connected";

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Verbindungen</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Kalender und Kontakte sind optional. Ohne sie funktionieren Events, Gruppen und
        Vorschläge weiter – die Verbindungen ergänzen nur zusätzlichen Planungskontext.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Google Kalender */}
        <article className="rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Google Kalender</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Verfügbarkeitsabgleich, automatische Kalender-Vormerkungen und Import
                markierter Termine.
              </p>
            </div>
            <ConnectionStatusBadge
              connected={calendarConnected}
              label={
                calendarConnected
                  ? "Verbunden"
                  : calendarNeedsReconnect
                    ? "Prüfen"
                    : "Nicht verbunden"
              }
            />
          </div>

          <div className="mt-3">
            {calendarConnected ? (
              <p className="text-xs text-emerald-700">
                Kalenderzugriff ist aktiv. Du kannst die Berechtigung jederzeit in deinen{" "}
                <a
                  href="https://myaccount.google.com/connections"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Google-Konto-Einstellungen
                </a>{" "}
                entziehen.
              </p>
            ) : calendarNeedsReconnect ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-rose-700">
                  Der Kalenderzugriff ist nicht mehr aktiv – wahrscheinlich wurde er in
                  Google widerrufen oder ist abgelaufen.
                </p>
                <a
                  href={buildConnectUrl("calendar")}
                  className="inline-flex w-fit items-center justify-center rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700"
                >
                  Kalenderzugriff erneut freigeben
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Realite kann deinen Kalender nutzen, sobald du es freigibst. Du kannst
                  das auch später jederzeit tun oder weglassen.
                </p>
                <a
                  href={buildConnectUrl("calendar")}
                  className="inline-flex w-fit items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Google Kalender verbinden
                </a>
              </div>
            )}
          </div>
        </article>

        {/* Google Kontakte */}
        <article className="rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Google Kontakte</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Importiert deine Google-Kontaktgruppen als Kreise in Realite und hilft,
                bestehende Kontakte als Nutzer zu erkennen.
              </p>
            </div>
            <ConnectionStatusBadge
              connected={contactsConnected}
              label={contactsConnected ? "Verbunden" : "Nicht verbunden"}
            />
          </div>

          <div className="mt-3">
            {contactsConnected ? (
              <p className="text-xs text-emerald-700">
                Kontakte-Zugriff ist aktiv. Du kannst ihn jederzeit in deinen{" "}
                <a
                  href="https://myaccount.google.com/connections"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Google-Konto-Einstellungen
                </a>{" "}
                entziehen.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Kontakte bleiben optional. Ohne sie funktionieren Gruppen und Kreise
                  weiterhin – nur der automatische Import aus Google fehlt.
                </p>
                <a
                  href={buildConnectUrl("contacts")}
                  className="inline-flex w-fit items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Google Kontakte verbinden
                </a>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
