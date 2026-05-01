"use client";

import { useCallback, useEffect, useState } from "react";

import { UserAvatar } from "@/src/components/user-avatar";
import { buildLoginPath } from "@/src/lib/provider-adapters";

type Overview = {
  generatedAtIso: string;
  singlesHereEventCount: number;
  eventsWithActivePresence: number;
  distinctUsersCheckedIn: number;
  genderAmongActiveCheckedIn: Record<string, number>;
  mutualMatchPairCountAmongActive: number;
  topEventsByActiveCheckIn: Array<{
    id: string;
    slug: string;
    name: string;
    location: string | null;
    startsAtIso: string;
    endsAtIso: string;
    createdBy: string;
    presenceWindowState: string;
    activeCheckedInCount: number;
    totalPresenceRows: number;
  }>;
};

type EventRow = Overview["topEventsByActiveCheckIn"][number];

type Participant = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  presenceStatus: string;
  visibleUntilIso: string;
  unlockedProfile: boolean;
  gender: string | null;
  age: number | null;
};

type EventDetail = {
  event: {
    id: string;
    slug: string;
    name: string;
    location: string | null;
    startsAtIso: string;
    endsAtIso: string;
    createdBy: string;
    presenceWindowState: string;
    publicPath: string;
  };
  activeCheckedInCount: number;
  mutualMatchPairCount: number;
  genderAmongActiveCheckedIn: Record<string, number>;
  participants: Participant[];
};

type DatingProfileRow = {
  userId: string;
  enabled: boolean;
  birthYear: number | null;
  gender: string | null;
  isSingle: boolean;
  soughtGenders: string;
  profileUpdatedAt: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  userCreatedAt: string;
};

const tabs = ["Übersicht", "Singles hier", "Dating-Profile"] as const;
type Tab = (typeof tabs)[number];

type AdminUiConfig = {
  enabled: boolean;
  emailLoginEnabled: boolean;
  secretLoginEnabled: boolean;
};

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("Übersicht");
  const [authReady, setAuthReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminUiConfig, setAdminUiConfig] = useState<AdminUiConfig | null>(
    null,
  );
  const [authVia, setAuthVia] = useState<"email" | "secret" | null>(null);
  const [adminDisplayEmail, setAdminDisplayEmail] = useState<string | null>(
    null,
  );
  const [secretInput, setSecretInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [profiles, setProfiles] = useState<DatingProfileRow[]>([]);
  const [profileTotal, setProfileTotal] = useState(0);
  const [profileOffset, setProfileOffset] = useState(0);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [detailReload, setDetailReload] = useState(0);

  const runAuthCheck = useCallback(async () => {
    const cfgRes = await fetch("/api/admin/config");
    const cfgJson = await parseJsonSafe<AdminUiConfig>(cfgRes);
    const cfg: AdminUiConfig = cfgJson ?? {
      enabled: false,
      emailLoginEnabled: false,
      secretLoginEnabled: false,
    };
    setAdminUiConfig(cfg);

    if (!cfg.enabled) {
      setLoggedIn(false);
      setAuthVia(null);
      setAdminDisplayEmail(null);
      setLoginError(
        "Auf dem Server ist kein Admin-Zugang aktiv (REALITE_ADMIN_EMAILS und/oder REALITE_ADMIN_SECRET).",
      );
      setAuthReady(true);
      return;
    }

    const meRes = await fetch("/api/admin/me", { credentials: "include" });
    if (meRes.status === 503) {
      const body = await parseJsonSafe<{ error?: string }>(meRes);
      setLoginError(body?.error ?? "Admin nicht konfiguriert.");
      setLoggedIn(false);
      setAuthVia(null);
      setAdminDisplayEmail(null);
      setAuthReady(true);
      return;
    }

    if (meRes.ok) {
      const body = await parseJsonSafe<{
        ok?: boolean;
        via?: "email" | "secret";
        email?: string | null;
      }>(meRes);
      setLoggedIn(true);
      setAuthVia(body?.via ?? null);
      setAdminDisplayEmail(body?.email ?? null);
      setLoginError(null);
    } else {
      setLoggedIn(false);
      setAuthVia(null);
      setAdminDisplayEmail(null);
      setLoginError(null);
    }
    setAuthReady(true);
  }, []);

  useEffect(() => {
    void runAuthCheck();
  }, [runAuthCheck]);

  const loadOverview = useCallback(async () => {
    const response = await fetch("/api/admin/singles-here/overview", {
      credentials: "include",
    });
    if (!response.ok) {
      setErrorBanner("Übersicht konnte nicht geladen werden.");
      return;
    }
    const data = await parseJsonSafe<Overview>(response);
    setErrorBanner(null);
    if (data) {
      setOverview(data);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    const response = await fetch("/api/admin/singles-here/events", {
      credentials: "include",
    });
    if (!response.ok) {
      setErrorBanner("Eventliste konnte nicht geladen werden.");
      return;
    }
    const body = await parseJsonSafe<{ events: EventRow[] }>(response);
    setErrorBanner(null);
    if (body?.events) {
      setEvents(body.events);
    }
  }, []);

  const loadProfiles = useCallback(async (offset: number) => {
    const qs = new URLSearchParams({
      limit: "30",
      offset: String(offset),
    });
    const response = await fetch(`/api/admin/dating-profiles?${qs}`, {
      credentials: "include",
    });
    if (!response.ok) {
      setErrorBanner("Profile konnten nicht geladen werden.");
      return;
    }
    const body = await parseJsonSafe<{
      profiles: DatingProfileRow[];
      total: number;
    }>(response);
    setErrorBanner(null);
    if (body) {
      setProfiles(body.profiles);
      setProfileTotal(body.total);
      setProfileOffset(offset);
    }
  }, []);

  useEffect(() => {
    if (!loggedIn) {
      return;
    }
    if (tab === "Übersicht") {
      void loadOverview();
    }
    if (tab === "Singles hier") {
      void loadEvents();
    }
    if (tab === "Dating-Profile") {
      void loadProfiles(0);
    }
  }, [loggedIn, tab, loadOverview, loadEvents, loadProfiles]);

  useEffect(() => {
    if (!loggedIn || !detailSlug) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const enc = encodeURIComponent(detailSlug);
      const response = await fetch(`/api/admin/singles-here/events/${enc}`, {
        credentials: "include",
      });
      if (!response.ok) {
        if (!cancelled) {
          setDetail(null);
          setErrorBanner("Event-Details nicht gefunden.");
        }
        return;
      }
      const data = await parseJsonSafe<EventDetail>(response);
      if (!cancelled && data) {
        setDetail(data);
        setErrorBanner(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, detailSlug, detailReload]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLoginError(null);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ secret: secretInput }),
    });
    setBusy(false);
    if (!response.ok) {
      setLoginError("Zugang verweigert.");
      setLoggedIn(false);
      return;
    }
    setSecretInput("");
    await runAuthCheck();
    setLoginError(null);
  }

  async function handleLeaveAdmin() {
    if (authVia === "secret") {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
    }
    setLoggedIn(false);
    setAuthVia(null);
    setAdminDisplayEmail(null);
    setOverview(null);
    setEvents([]);
    setProfiles([]);
    setDetailSlug(null);
    setDetail(null);
    setDetailReload(0);
    window.location.href = "/";
  }

  async function forceLeave(userId: string) {
    if (!detailSlug) {
      return;
    }
    if (
      !window.confirm(
        "Check-in beenden? Der Nutzer ist danach nicht mehr als vor Ort sichtbar.",
      )
    ) {
      return;
    }
    const enc = encodeURIComponent(detailSlug);
    const response = await fetch(
      `/api/admin/singles-here/events/${enc}/force-leave`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      },
    );
    if (!response.ok) {
      setErrorBanner("Aktion fehlgeschlagen.");
      return;
    }
    setDetailReload((x) => x + 1);
    void loadOverview();
    void loadEvents();
  }

  async function disableDating(userId: string) {
    if (!window.confirm("Dating-Modus für diesen Nutzer deaktivieren?")) {
      return;
    }
    const enc = encodeURIComponent(userId);
    const response = await fetch(`/api/admin/users/${enc}/dating-disable`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      setErrorBanner("Dating deaktivieren fehlgeschlagen.");
      return;
    }
    if (detailSlug) {
      setDetailReload((x) => x + 1);
    }
    void loadProfiles(profileOffset);
  }

  async function deleteUser(userId: string) {
    if (
      !window.confirm(
        "Nutzer dauerhaft löschen? Das entfernt App-Daten (users) — Auth-Sessions können separat bestehen bleiben.",
      )
    ) {
      return;
    }
    const enc = encodeURIComponent(userId);
    const response = await fetch(`/api/admin/users/${enc}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      setErrorBanner("Löschen fehlgeschlagen.");
      return;
    }
    setDetailSlug(null);
    setDetail(null);
    void loadOverview();
    void loadEvents();
    void loadProfiles(profileOffset);
  }

  if (!authReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">Lade…</p>
      </div>
    );
  }

  if (!loggedIn) {
    const loginPath = buildLoginPath("/admin");
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Realite Admin
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitoring für Singles hier / Vor-Ort. Zugang nur für eingetragene
            Admin-E-Mails oder (optional) Geheimnis-Login.
          </p>
        </div>

        {loginError ? (
          <p className="text-destructive text-sm">{loginError}</p>
        ) : null}

        {adminUiConfig?.enabled && adminUiConfig.emailLoginEnabled ? (
          <div className="border-border bg-card rounded-xl border p-4 space-y-3">
            <p className="text-sm font-medium">Mit Realite anmelden</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Wenn deine E-Mail in{" "}
              <span className="font-mono">REALITE_ADMIN_EMAILS</span> auf dem
              Server eingetragen ist und du hier mit Realite eingeloggt bist,
              solltest du die Inhalte sofort sehen. Sonst hier anmelden und
              wieder auf <span className="font-mono">/admin</span> gehen.
            </p>
            <a
              href={loginPath}
              className="bg-primary text-primary-foreground inline-flex w-full items-center justify-center rounded-lg py-3 text-center text-sm font-medium hover:opacity-90"
            >
              Zu Realite anmelden
            </a>
          </div>
        ) : null}

        {adminUiConfig?.enabled && adminUiConfig.secretLoginEnabled ? (
          <form
            onSubmit={handleLogin}
            className="flex flex-col gap-3 border-border rounded-xl border p-4 space-y-1"
          >
            <p className="text-sm font-medium">Geheimnis-Login</p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Optional für Notfall-Zugriff ohne persönlicher Realite-Session
              (Cookie, begrenzte Gültigkeit).
            </p>
            <label className="text-sm font-medium" htmlFor="admin-secret">
              REALITE_ADMIN_SECRET
            </label>
            <input
              id="admin-secret"
              name="secret"
              type="password"
              autoComplete="off"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              className="border-input bg-background focus-visible:ring-ring rounded-lg border px-3 py-2 text-base outline-none focus-visible:ring-2"
              placeholder="Geheimnis einfügen"
            />
            <button
              type="submit"
              disabled={busy || !secretInput.trim()}
              className="bg-secondary text-secondary-foreground mt-2 hover:opacity-90 disabled:opacity-50 rounded-lg py-3 text-sm font-medium"
            >
              {busy ? "…" : "Mit Secret anmelden"}
            </button>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 py-6 pb-10">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
          <p className="text-muted-foreground text-xs">
            Singles hier · Mobil
            {authVia === "email" && adminDisplayEmail ? (
              <> · {adminDisplayEmail}</>
            ) : null}
            {authVia === "secret" ? <> · Secret-Login</> : null}
          </p>
        </div>
        <button
          type="button"
          className="text-muted-foreground text-sm underline underline-offset-2"
          onClick={() => void handleLeaveAdmin()}
        >
          Admin verlassen
        </button>
      </header>

      <nav className="bg-muted/60 flex rounded-xl p-1">
        {tabs.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(label)}
            className={
              tab === label
                ? "bg-card text-card-foreground shadow-sm flex-1 rounded-lg py-2 text-center text-xs font-medium"
                : "text-muted-foreground flex-1 rounded-lg py-2 text-center text-xs font-medium"
            }
          >
            {label}
          </button>
        ))}
      </nav>

      {errorBanner ? (
        <p className="text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-sm">
          {errorBanner}
        </p>
      ) : null}

      {tab === "Übersicht" ? (
        <OverviewPane
          overview={overview}
          onRefresh={() => void loadOverview()}
        />
      ) : null}

      {tab === "Singles hier" ? (
        <SinglesPane
          events={events}
          detail={detail}
          detailSlug={detailSlug}
          onOpenDetail={(slug) => setDetailSlug(slug)}
          onCloseDetail={() => setDetailSlug(null)}
          onRefresh={() => void loadEvents()}
          onForceLeave={(userId) => void forceLeave(userId)}
          onDisableDating={(userId) => void disableDating(userId)}
          onDeleteUser={(userId) => void deleteUser(userId)}
        />
      ) : null}

      {tab === "Dating-Profile" ? (
        <ProfilesPane
          profiles={profiles}
          total={profileTotal}
          offset={profileOffset}
          onPage={(next) => void loadProfiles(Math.max(0, next))}
          onDisableDating={(userId) => void disableDating(userId)}
          onDeleteUser={(userId) => void deleteUser(userId)}
        />
      ) : null}
    </div>
  );
}

function OverviewPane(props: {
  overview: Overview | null;
  onRefresh: () => void;
}) {
  const { overview } = props;
  if (!overview) {
    return <p className="text-muted-foreground text-sm">Keine Daten.</p>;
  }

  const g = overview.genderAmongActiveCheckedIn;
  const genderLine = `Frauen ${g.woman ?? 0} · Männer ${g.man ?? 0} · Divers ${g.non_binary ?? 0} · Profil offen ${g.unknown ?? 0}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Stand: {new Date(overview.generatedAtIso).toLocaleString("de-DE")}
        </p>
        <button
          type="button"
          className="text-primary text-xs font-medium"
          onClick={props.onRefresh}
        >
          Aktualisieren
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Jetzt sichtbar (unique)"
          value={String(overview.distinctUsersCheckedIn)}
        />
        <StatCard
          label="Aktive Events"
          value={String(overview.eventsWithActivePresence)}
          hint={`von ${overview.singlesHereEventCount} Singles-hier`}
        />
        <StatCard
          label="Match-Paare (Summe je Event)"
          value={String(overview.mutualMatchPairCountAmongActive)}
        />
        <StatCard label="Geschlecht (mit Profil)" value="" sub={genderLine} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Top Events (Check-ins)</h2>
        <ul className="border-border flex flex-col gap-2 rounded-xl border">
          {overview.topEventsByActiveCheckIn.length === 0 ? (
            <li className="text-muted-foreground p-4 text-sm">
              Keine aktiven Check-ins.
            </li>
          ) : (
            overview.topEventsByActiveCheckIn.map((ev) => (
              <li
                key={ev.id}
                className="border-border flex flex-col gap-1 border-b p-4 last:border-b-0"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-sm font-medium">{ev.name}</span>
                  <span className="text-primary shrink-0 text-sm font-semibold">
                    {ev.activeCheckedInCount}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {windowLabel(ev.presenceWindowState)} · {ev.slug}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function windowLabel(state: string) {
  switch (state) {
    case "before_window":
      return "Vor Zeitfenster";
    case "active":
      return "Zeitfenster aktiv";
    case "ended":
      return "Beendet";
    default:
      return state;
  }
}

function StatCard(props: {
  label: string;
  value: string;
  hint?: string;
  sub?: string;
}) {
  return (
    <div className="bg-card border-border rounded-xl border p-3">
      <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
        {props.label}
      </p>
      {props.value ? (
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {props.value}
        </p>
      ) : null}
      {props.hint ? (
        <p className="text-muted-foreground mt-1 text-[11px]">{props.hint}</p>
      ) : null}
      {props.sub ? (
        <p className="text-muted-foreground mt-2 text-[11px] leading-snug">
          {props.sub}
        </p>
      ) : null}
    </div>
  );
}

function SinglesPane(props: {
  events: EventRow[];
  detail: EventDetail | null;
  detailSlug: string | null;
  onOpenDetail: (slug: string) => void;
  onCloseDetail: () => void;
  onRefresh: () => void;
  onForceLeave: (userId: string) => void;
  onDisableDating: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        className="text-primary self-start text-sm font-medium"
        onClick={props.onRefresh}
      >
        Liste aktualisieren
      </button>

      {!props.detailSlug ? (
        <ul className="border-border flex flex-col gap-2 rounded-xl border">
          {props.events.length === 0 ? (
            <li className="text-muted-foreground p-4 text-sm">
              Keine Singles-hier-Events.
            </li>
          ) : (
            props.events.map((ev) => (
              <li
                key={ev.id}
                className="border-border border-b last:border-b-0"
              >
                <button
                  type="button"
                  className="hover:bg-muted/50 flex w-full flex-col items-start gap-1 p-4 text-left"
                  onClick={() => props.onOpenDetail(ev.slug)}
                >
                  <span className="text-sm font-medium">{ev.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {ev.activeCheckedInCount} sichtbar ·{" "}
                    {windowLabel(ev.presenceWindowState)}
                  </span>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {ev.slug}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="text-primary text-sm font-medium"
            onClick={props.onCloseDetail}
          >
            ← Zurück
          </button>
          {props.detail ? (
            <EventDetailView
              detail={props.detail}
              onForceLeave={props.onForceLeave}
              onDisableDating={props.onDisableDating}
              onDeleteUser={props.onDeleteUser}
            />
          ) : (
            <p className="text-muted-foreground text-sm">Lade Details…</p>
          )}
        </div>
      )}
    </div>
  );
}

function EventDetailView(props: {
  detail: EventDetail;
  onForceLeave: (userId: string) => void;
  onDisableDating: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}) {
  const { detail } = props;
  const g = detail.genderAmongActiveCheckedIn;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card border-border rounded-xl border p-4">
        <h2 className="text-base font-semibold">{detail.event.name}</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          {detail.event.publicPath}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-[10px] uppercase">
              Sichtbar
            </p>
            <p className="font-semibold tabular-nums">
              {detail.activeCheckedInCount}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] uppercase">
              Matches (Paare)
            </p>
            <p className="font-semibold tabular-nums">
              {detail.mutualMatchPairCount}
            </p>
          </div>
        </div>
        <p className="text-muted-foreground mt-3 text-[11px]">
          Frauen {g.woman ?? 0} · Männer {g.man ?? 0} · Divers{" "}
          {g.non_binary ?? 0} · offen/unbekannt {g.unknown ?? 0}
        </p>
      </div>

      <h3 className="text-sm font-semibold">Teilnehmende (Presence-Zeilen)</h3>
      <ul className="flex flex-col gap-3">
        {detail.participants.map((p) => (
          <li key={p.userId} className="bg-muted/40 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={p.name}
                email={p.email}
                image={p.image}
                size="sm"
              />
              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                <span className="font-medium">{p.name ?? "(ohne Name)"}</span>
                <span className="text-muted-foreground text-[10px] font-mono">
                  {p.userId.slice(0, 8)}…
                </span>
              </div>
            </div>
            <p className="text-muted-foreground mt-1 truncate text-xs">
              {p.email}
            </p>
            <p className="text-muted-foreground mt-2 text-[11px]">
              Status: {p.presenceStatus} · Profil Dating:{" "}
              {p.unlockedProfile ? "vollständig" : "unvollständig"}
              {p.gender ? ` · ${p.gender}` : ""}
              {p.age != null ? ` · ${p.age} J.` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium"
                onClick={() => props.onForceLeave(p.userId)}
              >
                Check-in beenden
              </button>
              <button
                type="button"
                className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium"
                onClick={() => props.onDisableDating(p.userId)}
              >
                Dating aus
              </button>
              <button
                type="button"
                className="text-destructive border-destructive/40 rounded-lg border px-2 py-1 text-[11px] font-medium"
                onClick={() => props.onDeleteUser(p.userId)}
              >
                Nutzer löschen
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfilesPane(props: {
  profiles: DatingProfileRow[];
  total: number;
  offset: number;
  onPage: (offset: number) => void;
  onDisableDating: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}) {
  const limit = 30;
  const hasPrev = props.offset > 0;
  const hasNext = props.offset + props.profiles.length < props.total;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs">
        {props.total} Profile · Seite {Math.floor(props.offset / limit) + 1}
      </p>
      <ul className="flex flex-col gap-2">
        {props.profiles.map((p) => (
          <li
            key={p.userId}
            className="bg-card border-border rounded-xl border p-3"
          >
            <div className="flex items-center gap-3">
              <UserAvatar
                name={p.userName}
                email={p.userEmail}
                image={p.userImage}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <span className="text-sm font-medium">
                    {p.userName ?? p.userEmail}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {p.enabled ? "an" : "aus"}
                  </span>
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  {p.userEmail}
                </p>
                <p className="text-muted-foreground mt-1 text-[10px] font-mono">
                  {p.userId}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-2 py-1 text-[11px]"
                onClick={() => props.onDisableDating(p.userId)}
              >
                Dating aus
              </button>
              <button
                type="button"
                className="text-destructive border-destructive/40 rounded-lg border px-2 py-1 text-[11px]"
                onClick={() => props.onDeleteUser(p.userId)}
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-between gap-2 pt-2">
        <button
          type="button"
          disabled={!hasPrev}
          className="text-primary text-sm font-medium disabled:opacity-30"
          onClick={() => props.onPage(props.offset - limit)}
        >
          Zurück
        </button>
        <button
          type="button"
          disabled={!hasNext}
          className="text-primary text-sm font-medium disabled:opacity-30"
          onClick={() => props.onPage(props.offset + limit)}
        >
          Weiter
        </button>
      </div>
    </div>
  );
}
