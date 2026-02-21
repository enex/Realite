"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type DatingGender = "woman" | "man" | "non_binary";

export type DatingSettingsPayload = {
  profile: {
    userId: string;
    enabled: boolean;
    birthYear: number | null;
    gender: DatingGender | null;
    isSingle: boolean;
    soughtGenders: DatingGender[];
    soughtAgeMin: number | null;
    soughtAgeMax: number | null;
    soughtOnlySingles: boolean;
  };
  unlocked: boolean;
  age: number | null;
  missingRequirements: string[];
  error?: string;
};

export const MISSING_REQUIREMENT_LABELS: Record<string, string> = {
  enable_mode: "Dating-Modus aktivieren",
  birth_year: "Geburtsjahr setzen",
  adult: "mindestens 18 Jahre",
  gender: "Geschlecht auswählen",
  must_be_single: "Single-Status auf single setzen",
  sought_genders: "gesuchte Geschlechter auswählen",
  sought_age_range: "gesuchten Altersbereich vollständig setzen"
};

const emptyDating: DatingSettingsPayload = {
  profile: {
    userId: "",
    enabled: false,
    birthYear: null,
    gender: null,
    isSingle: false,
    soughtGenders: [],
    soughtAgeMin: null,
    soughtAgeMax: null,
    soughtOnlySingles: false
  },
  unlocked: false,
  age: null,
  missingRequirements: []
};

export function useDatingSettings() {
  const [data, setData] = useState<DatingSettingsPayload>(emptyDating);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyDating.profile);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/dating", { cache: "no-store" });
      const payload = (await response.json()) as DatingSettingsPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Dating-Einstellungen konnten nicht geladen werden");
      }

      setData(payload);
      setForm(payload.profile);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/dating", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = (await response.json()) as DatingSettingsPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Dating-Einstellungen konnten nicht gespeichert werden");
      }

      setData(payload);
      setForm(payload.profile);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unbekannter Fehler");
      return false;
    } finally {
      setBusy(false);
    }
  }, [form]);

  const missingRequirementLabels = useMemo(
    () => data.missingRequirements.map((item) => MISSING_REQUIREMENT_LABELS[item] ?? item),
    [data.missingRequirements]
  );

  return {
    data,
    form,
    setForm,
    loading,
    busy,
    error,
    save,
    missingRequirementLabels
  };
}
