"use client";

import type { DatingGender, DatingSettingsPayload } from "@/src/components/settings/use-dating-settings";

type DatingSettingsCardProps = {
  form: DatingSettingsPayload["profile"];
  status: {
    unlocked: boolean;
    age: number | null;
  };
  missingRequirementLabels: string[];
  loading: boolean;
  busy: boolean;
  onFormChange: (next: DatingSettingsPayload["profile"]) => void;
  onSubmit: (event: React.FormEvent) => void;
};

const GENDER_LABELS: Record<DatingGender, string> = {
  woman: "Frau",
  man: "Mann",
  non_binary: "Nicht-binär"
};

const GENDER_OPTIONS: DatingGender[] = ["woman", "man", "non_binary"];

export function DatingSettingsCard({
  form,
  status,
  missingRequirementLabels,
  loading,
  busy,
  onFormChange,
  onSubmit
}: DatingSettingsCardProps) {
  function toggleSoughtGender(gender: DatingGender) {
    const exists = form.soughtGenders.includes(gender);
    onFormChange({
      ...form,
      soughtGenders: exists ? form.soughtGenders.filter((entry) => entry !== gender) : [...form.soughtGenders, gender]
    });
  }

  return (
    <section id="dating" className="mt-6 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Dating-Modus (`#date`)</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status.unlocked ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {status.unlocked ? "Freigeschaltet" : "Noch gesperrt"}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Wenn freigeschaltet, kannst du Events mit `#date` erstellen. Diese sind nur für Nutzer sichtbar, die gegenseitig mit
        dir matchen.
      </p>

      {loading ? <p className="mt-3 text-sm text-slate-500">Lade Dating-Einstellungen...</p> : null}

      {!status.unlocked && missingRequirementLabels.length ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Noch offen: {missingRequirementLabels.join(", ")}
        </p>
      ) : null}

      {status.age !== null ? (
        <p className="mt-2 text-xs text-slate-500">Aktuelles Alter (aus Geburtsjahr): {status.age}</p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => onFormChange({ ...form, enabled: event.target.checked })}
            disabled={busy}
          />
          <span className="text-sm text-slate-700">Dating-Modus aktivieren</span>
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Geburtsjahr</span>
          <input
            type="number"
            min={1900}
            max={new Date().getUTCFullYear()}
            value={form.birthYear ?? ""}
            onChange={(event) =>
              onFormChange({
                ...form,
                birthYear: event.target.value ? Number(event.target.value) : null
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={busy}
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Geschlecht</span>
          <select
            value={form.gender ?? ""}
            onChange={(event) =>
              onFormChange({
                ...form,
                gender: event.target.value ? (event.target.value as DatingGender) : null
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={busy}
          >
            <option value="">Bitte wählen</option>
            {GENDER_OPTIONS.map((gender) => (
              <option key={gender} value={gender}>
                {GENDER_LABELS[gender]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <input
            type="checkbox"
            checked={form.isSingle}
            onChange={(event) => onFormChange({ ...form, isSingle: event.target.checked })}
            disabled={busy}
          />
          <span className="text-sm text-slate-700">Ich bin single</span>
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <input
            type="checkbox"
            checked={form.soughtOnlySingles}
            onChange={(event) => onFormChange({ ...form, soughtOnlySingles: event.target.checked })}
            disabled={busy}
          />
          <span className="text-sm text-slate-700">Ich suche nur Singles</span>
        </label>

        <div className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
          <p className="text-sm font-medium text-slate-800">Ich suche</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {GENDER_OPTIONS.map((gender) => (
              <label key={gender} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={form.soughtGenders.includes(gender)}
                  onChange={() => toggleSoughtGender(gender)}
                  disabled={busy}
                />
                <span className="text-slate-700">{GENDER_LABELS[gender]}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Gesuchtes Alter von</span>
          <input
            type="number"
            min={18}
            max={99}
            value={form.soughtAgeMin ?? ""}
            onChange={(event) =>
              onFormChange({
                ...form,
                soughtAgeMin: event.target.value ? Number(event.target.value) : null
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={busy}
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Gesuchtes Alter bis</span>
          <input
            type="number"
            min={18}
            max={99}
            value={form.soughtAgeMax ?? ""}
            onChange={(event) =>
              onFormChange({
                ...form,
                soughtAgeMax: event.target.value ? Number(event.target.value) : null
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={busy}
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
        >
          Dating-Profil speichern
        </button>
      </form>
    </section>
  );
}
