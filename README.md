# Realite Web MVP

Realite ist die soziale Koordinationsschicht für das echte Leben.

Kurz gesagt:

- weniger organisieren
- mehr zusammen erleben

Die Web-App hilft dabei, konkrete Aktivitäten sichtbar, joinbar und leichter koordinierbar zu machen, ohne Kalender oder Kontakte ungefragt öffentlich zu machen.

## Produktüberblick

### Kernidee

Realite stellt nicht Posts oder Chats in den Mittelpunkt, sondern konkrete Aktivitäten:

- etwas, das geplant ist
- etwas, dem man beitreten kann
- etwas, das im richtigen sozialen Kreis sichtbar werden kann

### Welches Problem gelöst wird

Realite adressiert typische Reibung im Alltag:

- zu viel Abstimmung in Chats
- unklar, wer wann Zeit hat
- spontane Treffen kommen nicht zustande
- bestehende Kontakte führen zu wenig zu echten gemeinsamen Aktivitäten

Als kleinerer Zusatznutzen kann Realite auch beim Socializing auf bestehenden Veranstaltungen helfen, etwa wenn man auf einem Stadtfest, Festival oder ähnlichen Event sehen möchte, welche bekannten oder interessanten Personen ebenfalls gerade da sind und offen für spontanen Kontakt wären. Dieser Use Case ist bewusst nachgeordnet und soll den Kern rund um Aktivitäten nur ergänzen.

### Für wen das Produkt gedacht ist

Primär für sozial aktive Menschen mit bestehendem Netzwerk, die spontane gemeinsame Aktivitäten wollen, aber nicht ständig koordinieren möchten.

### Produktprinzipien

- **Aktivität vor Kommunikation**
- **Explizite Freigabe statt Auto-Posting**
- **Privatsphäre zuerst**
- **Kontakte für Relevanz, nicht für Spam**
- **Kontrollierte Sichtbarkeit statt Zufallsverbreitung**
- **Vor-Ort-Sichtbarkeit nur als optionaler Zusatznutzen**

## Aktueller Produktumfang

- Google Sign-In
- Google-Kalender-Verbindung für Verfügbarkeit und kontextbezogene Vorschläge
- Google-Kontakte-Sync für Relevanz und Gruppenbezug
- Gruppen und soziale Sichtbarkeit
- Invite-Links für Gruppenbeitritt
- Events bzw. Aktivitäten mit Tags wie `#kontakte`, `#dating`, `#alle`
- Matching und Vorschläge
- Zu-/Absage-Feedback, das zukünftige Vorschläge beeinflusst

## Repo-Navigation

- `app/`: App Router Seiten, Layouts und API-Routen
- `src/`: Geschäftslogik, Integrationen, Utilities und Datenzugriff
- `content/docs/`: gerenderte Endnutzer-Doku für `/docs`
- `tests/`: Bun-Tests für Logik und Regressionen
- `drizzle/`: Migrationsartefakte
- `AGENTS.md`: verbindliche Arbeitsregeln und Produktkontext für Agenten

## Wie man in diesem Repo gute Entscheidungen trifft

Wenn du hier etwas änderst, prüfe immer:

1. Macht die Änderung eine reale Aktivität leichter erstellbar, sichtbarer oder joinbarer?
2. Bleibt klar, was privat ist und was ausdrücklich freigegeben wird?
3. Ist die Logik vom konkreten Anbieter wie Google sauber getrennt?
4. Wurde die passende Doku-Ebene aktualisiert?

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
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL=http://localhost:3000`
- `NEXT_PUBLIC_POSTHOG_KEY` (Projekt-API-Key aus PostHog)
- `NEXT_PUBLIC_POSTHOG_HOST` (z. B. `https://eu.i.posthog.com` oder `https://us.i.posthog.com`)
- `POSTHOG_API_KEY` (derselbe Projekt-API-Key, für serverseitige Logs an PostHog; optional)
- `POSTHOG_HOST` (z. B. `https://eu.i.posthog.com`; optional, Standard: EU)

## 3.1) PostHog: Analytics, Session Replay, Feature Flags und Logs

Die App initialisiert PostHog clientseitig über `instrumentation-client.ts`.

- Analytics und Session Replay laufen nach erfolgreicher Initialisierung automatisch.
- Eingeloggte Nutzer werden über ihre E-Mail identifiziert.
- Feature Flags können in Komponenten über `useRealiteFeatureFlag(...)` genutzt werden.
- **Serverseitige Logs (OpenTelemetry):** Wenn `POSTHOG_API_KEY` gesetzt ist, werden Logs aus API Routes/Server Code per OTLP an PostHog gesendet. In Route Handlern nach dem Loggen `flushPostHogLogs()` aufrufen (am besten in `after()` von `next/server`), siehe `src/lib/posthog/server-logger.ts`.

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

Für Agenten und Mitwirkende ist `AGENTS.md` die verbindliche Ergänzung zu diesem README.

## MVP-Flow

1. Mit Google anmelden.
2. Gruppe erstellen oder via Invite-Link beitreten.
3. Events erstellen und Tags setzen.
4. Matching starten.
5. Vorschläge als Zusage/Absage bewerten.

## Dokumentation im Repo

Es gibt zwei wichtige Dokumentationsarten:

- Endnutzer-Doku in `content/docs/*`
- Mitwirkenden- und Agenten-Doku in `README.md` und `AGENTS.md`

Wenn sich ein Nutzerfluss ändert, muss die Endnutzer-Doku im selben Change-Set mitgezogen werden.

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
