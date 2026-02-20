# Realite Web MVP

Bun-basierte React Webapp (Next.js + Tailwind + Drizzle/PostgreSQL) mit:

- Google Sign-In
- Google Kalender-Verbindung (frei/belegt Abgleich)
- Google Kontakte-Sync (Labels <-> Gruppen, Standardgruppe `#kontakte`)
- Gruppen (öffentlich/privat)
- Invite-Links für Gruppenbeitritt
- Events mit Tags (`#kontakte`, `#dating`, `#alle`, ...)
- Matching und proaktive Kalender-Vorschläge
- Zu-/Absage-Feedback, das zukünftige Vorschläge beeinflusst

## 1) Voraussetzungen

- Bun `>= 1.2`
- PostgreSQL `>= 14`
- Google OAuth App (Web)

## 2) Setup

```bash
bun install
cp .env.example .env.local
```

`DATABASE_URL` in `.env.local` auf deine Postgres-Instanz setzen.

## 3) Google OAuth konfigurieren

In der Google Cloud Console:

- OAuth Consent Screen aktivieren
- OAuth Client (Web) erstellen
- Redirect URI hinterlegen:

```text
http://localhost:3000/api/auth/callback/google
```

Dann Werte in `.env.local` setzen:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=http://localhost:3000`

## 4) Migrationen

Migrationen erzeugen:

```bash
bun run db:generate
```

Migrationen lokal ausführen:

```bash
bun run db:migrate
```

## 5) App starten

```bash
bun run dev
```

Öffne dann `http://localhost:3000`.

Dokumentation für Nutzer: `http://localhost:3000/docs`

## MVP-Flow

1. Mit Google anmelden.
2. Gruppe erstellen oder via Invite-Link beitreten.
3. Events erstellen und Tags setzen.
4. Matching starten.
5. Vorschläge als Zusage/Absage bewerten.

## Wichtige Endpunkte

- `GET/POST /api/groups`
- `GET /api/health` (führt beim ersten Aufruf Migrationen aus, liefert `503` bis fertig, danach `200`)
- `POST /api/groups/:groupId/invite-link`
- `POST /api/groups/join/:token`
- `GET/POST /api/events`
- `POST /api/suggestions/run`
- `POST /api/suggestions/:suggestionId/decision`
- `GET /api/dashboard`

## Kubernetes Readiness

Nutze `/api/health` als `readinessProbe`.
Der Endpoint bleibt auf `503`, während Migrationen laufen, und wird erst danach `200`.

Wichtig: Wenn die DB bereits manuell via `db:push` oder anderer Tools erstellt wurde, kann die erste
Migration mit `duplicate object` fehlschlagen. In dem Fall einmalig DB bereinigen oder Migration baseline setzen.
