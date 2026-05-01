"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getDefaultEventPresenceVisibleUntil,
  getEventPresenceDisplayState,
  getEventPresenceWindow,
  getEventPresenceWindowOptions,
  type EventPresenceStatus,
} from "@/src/lib/event-presence";
import type { DatingGender } from "@/src/lib/dating";

type SinglesHerePayload = {
  event: {
    id: string;
    slug: string;
    name: string;
    location: string | null;
    startsAt: string;
    endsAt: string;
    createdBy: string;
  };
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
  profileUnlocked: boolean;
  age: number | null;
  currentUserStatus: EventPresenceStatus | null;
  currentUserVisibleUntilIso: string | null;
  checkedInCount: number;
  matchingPeople: Array<{
    userId: string;
    name: string | null;
    image: string | null;
    visibleUntilIso: string;
  }>;
};

type SinglesHerePageProps = {
  initialPayload: SinglesHerePayload;
  currentUserName: string | null;
  currentUserImage: string | null;
};

const genderLabels: Record<DatingGender, string> = {
  woman: "Frau",
  man: "Mann",
  non_binary: "Nicht-binär",
};

const genderOptions: DatingGender[] = ["woman", "man", "non_binary"];

function toDateInputValue(birthYear: number | null) {
  return birthYear ? `${birthYear}-01-01` : "";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function SinglesHerePage({
  initialPayload,
  currentUserName,
  currentUserImage,
}: SinglesHerePageProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [name, setName] = useState(currentUserName ?? "");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(
    currentUserImage ?? null,
  );
  const [birthDate, setBirthDate] = useState(
    toDateInputValue(initialPayload.profile.birthYear),
  );
  const [gender, setGender] = useState<DatingGender | "">(
    initialPayload.profile.gender ?? "",
  );
  const [soughtGenders, setSoughtGenders] = useState<DatingGender[]>(
    initialPayload.profile.soughtGenders,
  );
  const [soughtAgeMin, setSoughtAgeMin] = useState(
    initialPayload.profile.soughtAgeMin?.toString() ?? "18",
  );
  const [soughtAgeMax, setSoughtAgeMax] = useState(
    initialPayload.profile.soughtAgeMax?.toString() ?? "45",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const startsAt = useMemo(
    () => new Date(payload.event.startsAt),
    [payload.event.startsAt],
  );
  const endsAt = useMemo(
    () => new Date(payload.event.endsAt),
    [payload.event.endsAt],
  );
  const presenceWindow = getEventPresenceWindow({ startsAt, endsAt });
  const windowOptions = getEventPresenceWindowOptions(endsAt);
  const [visibleUntilIso, setVisibleUntilIso] = useState(
    initialPayload.currentUserVisibleUntilIso ??
      getDefaultEventPresenceVisibleUntil(endsAt)?.toISOString() ??
      "",
  );
  const displayState = getEventPresenceDisplayState({
    status: payload.currentUserStatus,
    visibleUntil: payload.currentUserVisibleUntilIso
      ? new Date(payload.currentUserVisibleUntilIso)
      : null,
  });
  const isCheckedIn = displayState === "checked_in";

  async function refresh() {
    const response = await fetch(`/api/singles/events/${payload.event.slug}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return;
    }
    setPayload((await response.json()) as SinglesHerePayload);
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, 5_000);
    return () => window.clearInterval(timer);
  });

  function toggleSoughtGender(option: DatingGender) {
    setSoughtGenders((current) =>
      current.includes(option)
        ? current.filter((entry) => entry !== option)
        : [...current, option],
    );
  }

  async function handleImageChange(file: File | undefined) {
    if (!file) {
      return;
    }
    if (file.size > 350_000) {
      setError("Das Bild ist zu groß. Bitte wähle ein Bild unter 350 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/singles/events/${payload.event.slug}/profile`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            imageDataUrl,
            birthDate,
            gender,
            soughtGenders,
            soughtAgeMin: Number(soughtAgeMin),
            soughtAgeMax: Number(soughtAgeMax),
          }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        profile?: SinglesHerePayload["profile"];
        profileUnlocked?: boolean;
        age?: number | null;
      };
      if (!response.ok || !result.profile) {
        throw new Error(result.error ?? "Profil konnte nicht gespeichert werden.");
      }

      setPayload((current) => ({
        ...current,
        profile: result.profile!,
        profileUnlocked: Boolean(result.profileUnlocked),
        age: result.age ?? null,
      }));
      setMessage("Dein Profil ist gespeichert.");
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function updatePresence(status: EventPresenceStatus) {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/events/${payload.event.id}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          visibleUntilIso: status === "checked_in" ? visibleUntilIso : undefined,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Status konnte nicht gespeichert werden.");
      }

      setMessage(
        status === "checked_in"
          ? "Du bist jetzt für dieses Event sichtbar."
          : "Du bist nicht mehr vor Ort sichtbar.",
      );
      await refresh();
    } catch (presenceError) {
      setError(
        presenceError instanceof Error
          ? presenceError.message
          : "Unbekannter Fehler",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div>
          <p className="text-sm font-semibold text-teal-700">Realite Singles hier</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {payload.event.name}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {payload.event.location ? `${payload.event.location} · ` : ""}
            {formatDateTime(payload.event.startsAt)} bis{" "}
            {formatTime(payload.event.endsAt)}
          </p>
        </div>

        <aside className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">QR-Code für dieses Event</p>
          <img
            src={`/singles/${payload.event.slug}/qr`}
            alt={`QR-Code für ${payload.event.name}`}
            className="mt-3 aspect-square w-full rounded-lg border border-border bg-white p-2"
          />
          <p className="mt-3 break-all text-xs text-muted-foreground">
            /singles/{payload.event.slug}
          </p>
        </aside>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Gerade passende Personen</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Insgesamt vor Ort sichtbar: {payload.checkedInCount}
              </p>
            </div>
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
              {isCheckedIn ? "Du bist vor Ort" : "Nicht sichtbar"}
            </span>
          </div>

          {!payload.profileUnlocked ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Speichere zuerst Name, Bild und Single-Infos. Danach siehst du nur Personen,
              die gegenseitig zu deinen Angaben passen und ebenfalls eingecheckt sind.
            </p>
          ) : payload.matchingPeople.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {payload.matchingPeople.map((person) => (
                <article
                  key={person.userId}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  {person.image ? (
                    <img
                      src={person.image}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-muted text-lg font-semibold">
                      {(person.name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{person.name ?? "Vor Ort"}</p>
                    <p className="text-xs text-muted-foreground">
                      sichtbar bis {formatTime(person.visibleUntilIso)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              Noch keine gegenseitig passenden eingecheckten Personen sichtbar.
            </p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <select
              value={visibleUntilIso}
              onChange={(event) => setVisibleUntilIso(event.target.value)}
              className="rounded-lg border border-input bg-card px-3 py-2 text-sm"
              disabled={!presenceWindow.canCheckIn || busy}
            >
              {windowOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.visibleUntil.toISOString()}
                >
                  {option.label} ({formatTime(option.visibleUntil.toISOString())})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={
                busy ||
                !payload.profileUnlocked ||
                !presenceWindow.canCheckIn ||
                !visibleUntilIso
              }
              onClick={() => updatePresence("checked_in")}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Ich bin hier
            </button>
            <button
              type="button"
              disabled={busy || !isCheckedIn}
              onClick={() => updatePresence("left")}
              className="rounded-lg border border-input px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Nicht mehr da
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 lg:row-span-2">
          <h2 className="text-xl font-semibold">Schnelles Profil</h2>
          <form onSubmit={saveProfile} className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span>Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-lg border border-input px-3 py-2"
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Bild</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => handleImageChange(event.target.files?.[0])}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Geburtstag</span>
              <input
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                className="rounded-lg border border-input px-3 py-2"
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Geschlecht</span>
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value as DatingGender)}
                className="rounded-lg border border-input px-3 py-2"
                required
              >
                <option value="">Bitte wählen</option>
                {genderOptions.map((option) => (
                  <option key={option} value={option}>
                    {genderLabels[option]}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Ich suche</p>
              <div className="mt-2 grid gap-2">
                {genderOptions.map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={soughtGenders.includes(option)}
                      onChange={() => toggleSoughtGender(option)}
                    />
                    <span>{genderLabels[option]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm">
                <span>Alter von</span>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={soughtAgeMin}
                  onChange={(event) => setSoughtAgeMin(event.target.value)}
                  className="rounded-lg border border-input px-3 py-2"
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Alter bis</span>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={soughtAgeMax}
                  onChange={(event) => setSoughtAgeMax(event.target.value)}
                  className="rounded-lg border border-input px-3 py-2"
                  required
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Profil speichern
            </button>
          </form>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Realite setzt dich nicht automatisch sichtbar. Sichtbar wirst du erst
            durch den Button "Ich bin hier" und nur bis zum gewählten Zeitfenster.
          </p>
        </section>

        {(error || message) && (
          <section
            className={`rounded-lg border px-3 py-2 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-teal-200 bg-teal-50 text-teal-800"
            }`}
          >
            {error ?? message}
          </section>
        )}
      </section>
    </main>
  );
}
