"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ContactCandidate = {
  email: string;
  name: string | null;
  image: string | null;
};

type AttendeeResponse = {
  email: string;
  responseStatus: "accepted" | "declined" | "tentative" | "needsAction" | "unknown";
};

type InviteData = {
  alreadyInvitedEmails: string[];
  attendeeResponses?: AttendeeResponse[];
  suggestedContacts: ContactCandidate[];
  candidates?: ContactCandidate[];
};

type EventInviteSectionProps = {
  eventId: string;
  /** Wenn gesetzt, wird „Du hast zugesagt“ angezeigt, falls diese E-Mail zugesagt hat. */
  currentUserEmail?: string | null;
};

const SEARCH_DEBOUNCE_MS = 250;

function AttendeeResponsesSummary({
  responses,
  currentUserEmail
}: {
  responses: AttendeeResponse[];
  currentUserEmail?: string | null;
}) {
  const accepted = responses.filter((r) => r.responseStatus === "accepted");
  const declined = responses.filter((r) => r.responseStatus === "declined");
  const pending = responses.filter(
    (r) =>
      r.responseStatus === "needsAction" ||
      r.responseStatus === "tentative" ||
      r.responseStatus === "unknown"
  );
  const currentUserNorm = currentUserEmail?.trim().toLowerCase() ?? "";
  const myStatus = currentUserNorm
    ? responses.find((r) => r.email === currentUserNorm)?.responseStatus
    : undefined;

  return (
    <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">Zusagen</p>
      {myStatus === "accepted" && (
        <p className="text-sm font-medium text-teal-700">Du hast zugesagt.</p>
      )}
      {myStatus === "declined" && (
        <p className="text-sm text-slate-600">Du hast abgesagt.</p>
      )}
      {myStatus && myStatus !== "accepted" && myStatus !== "declined" && (
        <p className="text-sm text-slate-600">Deine Antwort steht noch aus.</p>
      )}
      {accepted.length > 0 && (
        <p className="text-xs text-slate-600">
          Zugesagt: {accepted.map((r) => r.email).join(", ")}
        </p>
      )}
      {declined.length > 0 && (
        <p className="text-xs text-slate-500">
          Abgesagt: {declined.map((r) => r.email).join(", ")}
        </p>
      )}
      {pending.length > 0 && (
        <p className="text-xs text-slate-500">
          Ausstehend: {pending.map((r) => r.email).join(", ")}
        </p>
      )}
    </div>
  );
}

export function EventInviteSection({ eventId, currentUserEmail }: EventInviteSectionProps) {
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitingEmail, setInvitingEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState<ContactCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInviteData = useCallback(async () => {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/invite`);
    if (!res.ok) {
      setInviteData(null);
      return;
    }
    const data = (await res.json()) as InviteData;
    setInviteData(data);
  }, [eventId]);

  useEffect(() => {
    setLoading(true);
    fetchInviteData().finally(() => setLoading(false));
  }, [fetchInviteData]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (!searchQuery.trim()) {
      setCandidates([]);
      setSearching(false);
      setOpen(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const url = `/api/events/${encodeURIComponent(eventId)}/invite?q=${encodeURIComponent(searchQuery.trim())}`;
      const res = await fetch(url);
      if (!res.ok) {
        setCandidates([]);
        setSearching(false);
        return;
      }
      const data = (await res.json()) as InviteData;
      setCandidates(data.candidates ?? []);
      setSearching(false);
      setOpen(true);
      setSelectedIndex(-1);
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [eventId, searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const invitedSet = new Set(
    inviteData?.alreadyInvitedEmails ?? []
  );

  const invite = useCallback(
    async (email: string) => {
      const norm = email.trim().toLowerCase();
      if (!norm) return;
      const currentInvited = new Set(inviteData?.alreadyInvitedEmails ?? []);
      if (currentInvited.has(norm)) return;
      setInvitingEmail(norm);
      setInviteError(null);
      try {
        const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: norm }),
        });
        const payload = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(payload.error ?? "Einladung fehlgeschlagen");
        }
        setInviteData((prev) =>
          prev
            ? {
                ...prev,
                alreadyInvitedEmails: [...prev.alreadyInvitedEmails, norm],
                suggestedContacts: prev.suggestedContacts.filter(
                  (c) => c.email !== norm
                ),
              }
            : null
        );
        setSearchQuery("");
        setCandidates([]);
        setOpen(false);
      } catch (e) {
        setInviteError(e instanceof Error ? e.message : "Einladung fehlgeschlagen");
      } finally {
        setInvitingEmail(null);
      }
    },
    [eventId, inviteData?.alreadyInvitedEmails]
  );

  const displayList = searchQuery.trim() ? candidates : inviteData?.suggestedContacts ?? [];
  const canInviteByEmail =
    searchQuery.includes("@") &&
    searchQuery.trim().length >= 3 &&
    !invitedSet.has(searchQuery.trim().toLowerCase()) &&
    !displayList.some(
      (c) => c.email === searchQuery.trim().toLowerCase()
    );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && !canInviteByEmail) return;
    if (e.key === "Escape") {
      setOpen(false);
      setSelectedIndex(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (canInviteByEmail) {
        invite(searchQuery.trim());
        return;
      }
      if (selectedIndex >= 0 && displayList[selectedIndex]) {
        invite(displayList[selectedIndex].email);
        setOpen(false);
        setSelectedIndex(-1);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) =>
        i < displayList.length - 1 ? i + 1 : i
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i > 0 ? i - 1 : -1));
    }
  };

  if (loading || !inviteData) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Jemanden einladen</h2>
      <p className="mt-1 text-sm text-slate-600">
        Die Person erhält eine Einladung per E-Mail über Google Kalender.
      </p>

      {inviteData.suggestedContacts.length > 0 && !searchQuery.trim() && (
        <div className="mt-3">
          <p className="text-xs font-medium text-slate-500">Aus deinen Kontakten</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {inviteData.suggestedContacts.slice(0, 3).map((contact) => (
              <li key={contact.email}>
                <button
                  type="button"
                  onClick={() => invite(contact.email)}
                  disabled={invitingEmail !== null}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-800 disabled:opacity-50"
                >
                  {contact.image ? (
                    <img
                      src={contact.image}
                      alt=""
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                      {(contact.name ?? contact.email).slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  {contact.name ?? contact.email}
                  {invitingEmail === contact.email && (
                    <span className="text-slate-400">…</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4" ref={wrapperRef}>
        <label htmlFor="invite-search" className="sr-only">
          E-Mail oder Name eingeben
        </label>
        <input
          id="invite-search"
          type="text"
          placeholder="E-Mail oder Name eingeben …"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.trim() && setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          autoComplete="off"
        />
        {searching && (
          <p className="mt-1 text-xs text-slate-500">Suche …</p>
        )}
        {open && (searchQuery.trim() || displayList.length > 0) && (
          <ul
            className="mt-1 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-sm"
            role="listbox"
          >
            {canInviteByEmail && (
              <li
                role="option"
                aria-selected={selectedIndex === -1 && canInviteByEmail}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  selectedIndex === -1
                    ? "bg-teal-50 text-teal-800"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                onMouseEnter={() => setSelectedIndex(-1)}
                onClick={() => invite(searchQuery.trim())}
              >
                Einladen: <strong>{searchQuery.trim()}</strong>
              </li>
            )}
            {displayList.map((c, i) => {
              const idx = canInviteByEmail ? i + 1 : i;
              return (
                <li
                  key={c.email}
                  role="option"
                  aria-selected={selectedIndex === idx}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                    selectedIndex === idx
                      ? "bg-teal-50 text-teal-800"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => invite(c.email)}
                >
                  {c.image ? (
                    <img
                      src={c.image}
                      alt=""
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                      {(c.name ?? c.email).slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  {c.name ? `${c.name} (${c.email})` : c.email}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {inviteError && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {inviteError}
        </p>
      )}

      {inviteData.alreadyInvitedEmails.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Bereits eingeladen: {inviteData.alreadyInvitedEmails.length} Person(en)
        </p>
      )}

      {inviteData.attendeeResponses && inviteData.attendeeResponses.length > 0 && (
        <AttendeeResponsesSummary
          responses={inviteData.attendeeResponses}
          currentUserEmail={currentUserEmail}
        />
      )}
    </section>
  );
}
