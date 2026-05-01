"use client";

import { PencilSimple, UserCircle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import {
  getEventPresenceDisplayState,
  getEventPresenceWindow,
  getEventPresenceWindowOptions,
  type EventPresenceStatus,
  type EventPresenceWindowOption,
} from "@/src/lib/event-presence";
import type { DatingGender } from "@/src/lib/dating";
import { SinglesProfileImageField } from "@/src/components/singles-profile-image-field";
import type { SinglesHereClientPayload } from "@/src/lib/singles-here-payload";

type SinglesHerePageProps = {
  initialPayload: SinglesHereClientPayload;
  currentUserName: string | null;
  currentUserId: string;
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

function toLocalInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
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

function resolvePresenceWindowChoiceValue(
  options: EventPresenceWindowOption[],
  visibleUntilIso?: string | null,
): string {
  if (options.length === 0) {
    return "";
  }
  if (!visibleUntilIso) {
    return options[0]!.value;
  }
  const target = new Date(visibleUntilIso).getTime();
  if (Number.isNaN(target)) {
    return options[0]!.value;
  }
  let best = options[0]!;
  let bestDeltaMs = Infinity;
  for (const opt of options) {
    const d = Math.abs(opt.visibleUntil.getTime() - target);
    if (d < bestDeltaMs) {
      bestDeltaMs = d;
      best = opt;
    }
  }
  if (bestDeltaMs <= 120_000) {
    return best.value;
  }
  return options[0]!.value;
}

export function SinglesHerePage({
  initialPayload,
  currentUserName,
  currentUserId,
}: SinglesHerePageProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [name, setName] = useState(currentUserName ?? "");
  const [profileImageStorageUrl, setProfileImageStorageUrl] = useState<
    string | null
  >(initialPayload.viewerProfileImageStorageUrl ?? null);
  const [profileImageDisplayUrl, setProfileImageDisplayUrl] = useState<
    string | null
  >(initialPayload.viewerProfileImageDisplayUrl ?? null);
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
  const [imageUploading, setImageUploading] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(
    !initialPayload.profileUnlocked,
  );

  const isCreator = currentUserId === initialPayload.event.createdBy;
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [editName, setEditName] = useState(initialPayload.event.name);
  const [editLocation, setEditLocation] = useState(
    initialPayload.event.location ?? "",
  );
  const [editStartsAt, setEditStartsAt] = useState(() =>
    toLocalInputValue(new Date(initialPayload.event.startsAt)),
  );
  const [editEndsAt, setEditEndsAt] = useState(() =>
    toLocalInputValue(new Date(initialPayload.event.endsAt)),
  );

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
  const windowChoiceKey = windowOptions.map((o) => o.value).join("|");
  const [presenceWindowChoice, setPresenceWindowChoice] = useState(() =>
    resolvePresenceWindowChoiceValue(
      getEventPresenceWindowOptions(new Date(initialPayload.event.endsAt)),
      initialPayload.currentUserVisibleUntilIso,
    ),
  );
  useEffect(() => {
    setPresenceWindowChoice((current) => {
      if (windowOptions.some((o) => o.value === current)) {
        return current;
      }
      return resolvePresenceWindowChoiceValue(
        windowOptions,
        payload.currentUserVisibleUntilIso,
      );
    });
  }, [windowChoiceKey, payload.currentUserVisibleUntilIso]);
  const selectedPresenceOption = windowOptions.find(
    (o) => o.value === presenceWindowChoice,
  );
  const visibleUntilIso =
    selectedPresenceOption?.visibleUntil.toISOString() ?? "";

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
    const data = (await response.json()) as SinglesHereClientPayload;
    setPayload(data);
    setProfileImageStorageUrl(data.viewerProfileImageStorageUrl ?? null);
    setProfileImageDisplayUrl(data.viewerProfileImageDisplayUrl ?? null);
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

    setImageUploading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/profile/image", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        imageUrl?: string;
        viewerImageUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.imageUrl) {
        throw new Error(payload.error ?? "Bild konnte nicht hochgeladen werden.");
      }

      setProfileImageStorageUrl(payload.imageUrl);
      setProfileImageDisplayUrl(
        payload.viewerImageUrl ?? payload.imageUrl ?? null,
      );
      setMessage("Bild hochgeladen. Speichere dein Profil, damit andere es sehen.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Unbekannter Fehler",
      );
    } finally {
      setImageUploading(false);
    }
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
            imageUrl: profileImageStorageUrl,
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
        profile?: SinglesHereClientPayload["profile"];
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
      setProfileEditorOpen(false);
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function saveEvent(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/singles/events/${payload.event.slug}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName,
            location: editLocation || null,
            startsAt: new Date(editStartsAt).toISOString(),
            endsAt: new Date(editEndsAt).toISOString(),
          }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        event?: { name: string; location: string | null; startsAt: string; endsAt: string };
      };
      if (!response.ok || !result.event) {
        throw new Error(result.error ?? "Event konnte nicht gespeichert werden.");
      }

      setPayload((current) => ({
        ...current,
        event: {
          ...current.event,
          name: result.event!.name,
          location: result.event!.location,
          startsAt: result.event!.startsAt,
          endsAt: result.event!.endsAt,
        },
      }));
      setMessage("Event gespeichert.");
      setEventEditorOpen(false);
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
        <div className="flex flex-wrap items-start justify-between gap-4 lg:col-span-2">
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
          {payload.profileUnlocked ? (
            <button
              type="button"
              onClick={() => setProfileEditorOpen((open) => !open)}
              aria-expanded={profileEditorOpen}
              className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-3 py-2 text-sm font-semibold shadow-sm hover:bg-muted"
            >
              {profileImageDisplayUrl || profileImageStorageUrl ? (
                <img
                  src={(profileImageDisplayUrl ?? profileImageStorageUrl)!}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <UserCircle size={28} weight="duotone" aria-hidden="true" />
              )}
              <span>Profil</span>
              <PencilSimple size={16} aria-hidden="true" />
            </button>
          ) : null}
          {isCreator ? (
            <button
              type="button"
              onClick={() => setEventEditorOpen((open) => !open)}
              aria-expanded={eventEditorOpen}
              className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-3 py-2 text-sm font-semibold shadow-sm hover:bg-muted"
            >
              <PencilSimple size={16} aria-hidden="true" />
              <span>Event bearbeiten</span>
            </button>
          ) : null}
        </div>

        {isCreator && eventEditorOpen ? (
        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-xl font-semibold">Event bearbeiten</h2>
          <form onSubmit={saveEvent} className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span>Name</span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-lg border border-input px-3 py-2"
                required
                minLength={2}
                maxLength={80}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Ort</span>
              <input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="rounded-lg border border-input px-3 py-2"
                maxLength={160}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span>Start</span>
                <input
                  type="datetime-local"
                  value={editStartsAt}
                  onChange={(e) => setEditStartsAt(e.target.value)}
                  className="rounded-lg border border-input px-3 py-2"
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Ende</span>
                <input
                  type="datetime-local"
                  value={editEndsAt}
                  onChange={(e) => setEditEndsAt(e.target.value)}
                  className="rounded-lg border border-input px-3 py-2"
                  required
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={() => setEventEditorOpen(false)}
                className="rounded-lg border border-input px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </section>
        ) : null}

        {(!payload.profileUnlocked || profileEditorOpen) ? (
        <section className={`rounded-xl border border-border bg-card p-5 ${payload.profileUnlocked ? "lg:col-start-2 lg:row-start-2" : "lg:col-span-2"}`}>
          <h2 className="text-xl font-semibold">
            {payload.profileUnlocked ? "Profil bearbeiten" : "Profil anlegen"}
          </h2>
          {!payload.profileUnlocked ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Lege zuerst dein Profil an. Erst danach kannst du dich vor Ort
              sichtbar machen und passende andere Personen sehen.
            </p>
          ) : null}
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
            <SinglesProfileImageField
              previewUrl={profileImageDisplayUrl ?? profileImageStorageUrl}
              disabled={busy}
              busy={imageUploading}
              onFileReady={(file) => void handleImageChange(file)}
              onError={(msg) => {
                setError(msg);
                setMessage(null);
              }}
            />
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
              disabled={busy || imageUploading}
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
        ) : null}

        {payload.profileUnlocked ? (
          <div className={`grid gap-6 ${profileEditorOpen ? "lg:col-start-1 lg:row-start-2" : "lg:col-span-2"}`}>
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

              {payload.matchingPeople.length > 0 ? (
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
                  value={presenceWindowChoice}
                  onChange={(event) =>
                    setPresenceWindowChoice(event.target.value)
                  }
                  className="rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  disabled={!presenceWindow.canCheckIn || busy}
                >
                  {windowOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {`${option.label} (${formatTime(option.visibleUntil.toISOString())})`}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={
                    busy ||
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

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                <img
                  src={`/singles/${payload.event.slug}/qr/code`}
                  alt={`QR-Code für ${payload.event.name}`}
                  className="aspect-square w-full max-w-[220px] rounded-lg border border-border bg-white p-2"
                />
                <div>
                  <h2 className="text-xl font-semibold">Weitere Personen einladen</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Wenn ihr als Gruppe vor Ort seid, können andere diesen Code
                    scannen und auf derselben Eventseite einchecken. Erst nach
                    eigenem Profil und bewusstem Check-in werden sie sichtbar.
                  </p>
                  <p className="mt-3 break-all text-xs text-muted-foreground">
                    /singles/{payload.event.slug}
                  </p>
                  <a
                    href={`/singles/${payload.event.slug}/qr`}
                    className="mt-4 inline-flex rounded-lg border border-input px-4 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    Druckvorlage öffnen
                  </a>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {(error || message) && (
          <section
            className={`rounded-lg border px-3 py-2 text-sm lg:col-span-2 ${
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
