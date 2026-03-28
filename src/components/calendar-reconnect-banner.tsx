import type { CalendarConnectionState } from "@/src/lib/calendar-connection-state";

type CalendarReconnectBannerProps = {
  calendarConnectionState: CalendarConnectionState;
  className?: string;
};

export function CalendarReconnectBanner({
  calendarConnectionState,
  className = "mt-4"
}: CalendarReconnectBannerProps) {
  if (calendarConnectionState !== "needs_reconnect") {
    return null;
  }

  return (
    <section className={`${className} rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-800 shadow-sm`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">Kalenderzugriff pausiert</p>
          <p className="mt-1 text-sm leading-6">
            Realite kann deinen Kalender gerade nicht nutzen. Vormerkungen und Verfügbarkeitsabgleich laufen erst wieder,
            wenn du den Zugriff erneut freigibst.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/auth/signin/google?callbackUrl=%2Fsettings"
            className="inline-flex items-center justify-center rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
          >
            Kalenderzugriff erneut freigeben
          </a>
          <a href="/settings" className="text-sm font-medium text-rose-700 underline-offset-2 hover:underline">
            Zu den Einstellungen
          </a>
        </div>
      </div>
    </section>
  );
}
