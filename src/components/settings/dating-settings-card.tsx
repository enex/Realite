"use client";

import type {
  DatingGender,
  DatingIntent,
  DatingSettingsPayload,
} from "@/src/components/settings/use-dating-settings";

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

const DATING_INTENT_OPTIONS: Array<{
  value: DatingIntent;
  label: string;
  description: string;
}> = [
  {
    value: "dating_only",
    label: "Nur Dating",
    description: "Du siehst nur Personen, die auch Dating offen haben.",
  },
  {
    value: "dating_and_social",
    label: "Dating und auch so",
    description: "Du siehst passende Personen unabhängig von deren Dating-Fokus.",
  },
  {
    value: "not_dating",
    label: "Nicht Dating",
    description: "Du siehst keine Personen, die nur für Dating sichtbar sein wollen.",
  },
];

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
    <section id="dating" className="mt-6 scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Dating-Modus (`#date`)</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status.unlocked ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {status.unlocked ? "Freigeschaltet" : "Noch gesperrt"}
        </span>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Wenn freigeschaltet, kannst du Events mit `#date` als geschützten Unterfall deiner normalen Aktivitätsplanung
        erstellen. Diese Events sind nur für Nutzer sichtbar, die gegenseitig mit dir matchen.
      </p>

      <p className="mt-2 text-xs text-muted-foreground">
        Realite behandelt Dating damit nicht als eigenen Produktkern oder offenen Personenfeed, sondern als bewusst begrenzte
        Relevanz-Sichtbarkeit für konkrete Aktivitäten.
      </p>

      {loading ? <p className="mt-3 text-sm text-muted-foreground">Lade Dating-Einstellungen...</p> : null}

      {!status.unlocked && missingRequirementLabels.length ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Noch offen: {missingRequirementLabels.join(", ")}
        </p>
      ) : null}

      {status.age !== null ? (
        <p className="mt-2 text-xs text-muted-foreground">Aktuelles Alter (aus Geburtsjahr): {status.age}</p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => onFormChange({ ...form, enabled: event.target.checked })}
            disabled={busy}
          />
          <span className="text-sm text-foreground">Dating-Modus aktivieren</span>
        </label>

        <label className="grid gap-1 text-sm text-foreground">
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
            className="w-full rounded-lg border border-input px-3 py-2 text-sm"
            disabled={busy}
          />
        </label>

        <label className="grid gap-1 text-sm text-foreground">
          <span>Geschlecht</span>
          <select
            value={form.gender ?? ""}
            onChange={(event) =>
              onFormChange({
                ...form,
                gender: event.target.value ? (event.target.value as DatingGender) : null
              })
            }
            className="w-full rounded-lg border border-input px-3 py-2 text-sm"
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

        <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
          <input
            type="checkbox"
            checked={form.isSingle}
            onChange={(event) => onFormChange({ ...form, isSingle: event.target.checked })}
            disabled={busy}
          />
          <span className="text-sm text-foreground">Ich bin single</span>
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
          <input
            type="checkbox"
            checked={form.soughtOnlySingles}
            onChange={(event) => onFormChange({ ...form, soughtOnlySingles: event.target.checked })}
            disabled={busy}
          />
          <span className="text-sm text-foreground">Ich suche nur Singles</span>
        </label>

        <fieldset className="rounded-lg border border-border p-3 sm:col-span-2">
          <legend className="px-1 text-sm font-medium text-foreground">
            Wonach bist du hier offen?
          </legend>
          <div className="mt-2 grid gap-2">
            {DATING_INTENT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-start gap-2 rounded border border-border px-2 py-2 text-sm"
              >
                <input
                  type="radio"
                  name="datingIntent"
                  value={option.value}
                  checked={form.datingIntent === option.value}
                  onChange={() =>
                    onFormChange({ ...form, datingIntent: option.value })
                  }
                  disabled={busy}
                />
                <span>
                  <span className="block font-medium text-foreground">
                    {option.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="rounded-lg border border-border p-3 sm:col-span-2">
          <p className="text-sm font-medium text-foreground">Ich suche</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {GENDER_OPTIONS.map((gender) => (
              <label key={gender} className="flex items-center gap-2 rounded border border-border px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={form.soughtGenders.includes(gender)}
                  onChange={() => toggleSoughtGender(gender)}
                  disabled={busy}
                />
                <span className="text-foreground">{GENDER_LABELS[gender]}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="grid gap-1 text-sm text-foreground">
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
            className="w-full rounded-lg border border-input px-3 py-2 text-sm"
            disabled={busy}
          />
        </label>

        <label className="grid gap-1 text-sm text-foreground">
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
            className="w-full rounded-lg border border-input px-3 py-2 text-sm"
            disabled={busy}
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-2"
        >
          Dating-Profil speichern
        </button>
      </form>
    </section>
  );
}
