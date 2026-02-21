"use client";

type WritableCalendar = {
  id: string;
  summary: string;
  primary: boolean;
};

type ReadableCalendar = {
  id: string;
  summary: string;
  primary: boolean;
};

export type SuggestionSettingsForm = {
  autoInsertSuggestions: boolean;
  suggestionCalendarId: string;
  suggestionDeliveryMode: "calendar_copy" | "source_invite";
  shareEmailInSourceInvites: boolean;
  matchingCalendarIds: string[];
};

type SuggestionSettingsCardProps = {
  calendarConnected: boolean;
  calendars: WritableCalendar[];
  readableCalendars: ReadableCalendar[];
  autoInsertedSuggestionCount: number;
  form: SuggestionSettingsForm;
  busy: boolean;
  onFormChange: (next: SuggestionSettingsForm) => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function SuggestionSettingsCard({
  calendarConnected,
  calendars,
  readableCalendars,
  autoInsertedSuggestionCount,
  form,
  busy,
  onFormChange,
  onSubmit
}: SuggestionSettingsCardProps) {
  function toggleMatchingCalendar(calendarId: string) {
    const exists = form.matchingCalendarIds.includes(calendarId);
    onFormChange({
      ...form,
      matchingCalendarIds: exists
        ? form.matchingCalendarIds.filter((id) => id !== calendarId)
        : [...form.matchingCalendarIds, calendarId]
    });
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Vorschlags-Einstellungen</h2>
      <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-700">Automatisch erstellt</p>
        <p className="mt-1 text-2xl font-semibold text-teal-900">{autoInsertedSuggestionCount}</p>
        <p className="text-xs text-teal-700">Aktuell automatisch als Vorschlag in deinen Kalender eingetragen</p>
      </div>
      {!calendarConnected ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Google Kalender ist aktuell nicht verbunden.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.autoInsertSuggestions}
            onChange={(event) =>
              onFormChange({
                ...form,
                autoInsertSuggestions: event.target.checked
              })
            }
            disabled={busy}
          />
          <span className="text-sm text-slate-700">Potenzielle Events automatisch in meinen Kalender eintragen</span>
        </label>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:col-span-2">
          Vorschläge werden als Kalendereintrag mit einem Realite-Link erstellt. Zu-/Absage läuft direkt über die Realite-Seite.
        </div>

        <select
          value={form.suggestionCalendarId}
          onChange={(event) =>
            onFormChange({
              ...form,
              suggestionCalendarId: event.target.value
            })
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          disabled={!calendarConnected || calendars.length === 0 || busy}
        >
          {calendars.length === 0 ? <option value="primary">Primary</option> : null}
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>
              {calendar.primary ? `${calendar.summary} (Primary)` : calendar.summary}
            </option>
          ))}
        </select>

        <div className="rounded-lg border border-slate-200 p-3 text-sm sm:col-span-2">
          <p className="font-medium text-slate-800">Kalender für Matching und Event-Fund</p>
          <p className="mt-1 text-xs text-slate-600">
            Nur diese Kalender werden für Verfügbarkeit und #alle-Sync des aktuellen Nutzers verwendet.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() =>
                onFormChange({
                  ...form,
                  matchingCalendarIds: readableCalendars.map((calendar) => calendar.id)
                })
              }
              disabled={busy || !calendarConnected}
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
            >
              Alle
            </button>
            <button
              type="button"
              onClick={() =>
                onFormChange({
                  ...form,
                  matchingCalendarIds: []
                })
              }
              disabled={busy || !calendarConnected}
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
            >
              Zurücksetzen (alle)
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {readableCalendars.map((calendar) => (
              <label key={calendar.id} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1">
                <input
                  type="checkbox"
                  checked={form.matchingCalendarIds.includes(calendar.id)}
                  onChange={() => toggleMatchingCalendar(calendar.id)}
                  disabled={busy || !calendarConnected}
                />
                <span className="text-xs text-slate-700">
                  {calendar.primary ? `${calendar.summary} (Primary)` : calendar.summary}
                </span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={busy || !calendarConnected}
          className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Einstellungen speichern
        </button>
      </form>
    </section>
  );
}
