# MCP und OAuth

## Was ist jetzt möglich?

Realite stellt einen MCP-Endpunkt bereit. Ein MCP-Client kann damit:

- dein Dashboard lesen
- Gruppen, Kontakte und Einladungslinks verwalten
- Events lesen, anlegen, kommentieren und Einladungen verschicken
- Vorschläge lesen und entscheiden
- Einstellungen und Dating-Profil lesen und ändern
- Smart-Treffen lesen, anlegen und aktualisieren

Der Zugriff läuft über OAuth mit Better Auth. Dein MCP-Client bekommt also keinen statischen Realite-Login, sondern authentifiziert sich regulär gegen Realite und erhält dann ein Zugriffstoken.

## Wichtige URLs

- MCP-Endpunkt: `/api/mcp`
- OAuth Protected Resource Metadata: `/.well-known/oauth-protected-resource/api/mcp`
- OAuth Authorization Server Metadata: `/.well-known/oauth-authorization-server`
- OpenID-Konfiguration: `/.well-known/openid-configuration`

## So läuft die Anmeldung ab

1. Dein MCP-Client verbindet sich mit dem geschützten Resource-Endpunkt von Realite.
2. Realite verweist den Client auf die OAuth-Metadaten von Better Auth.
3. Du meldest dich mit einem für dieses Deployment freigeschalteten Realite-Login an, heute im Regelfall Google.
4. Du bestätigst den Zugriff auf dein Realite-Konto.
5. Danach kann der MCP-Client Tools und Resources von Realite nutzen.

## Welche Berechtigungen werden angefragt?

Realite verwendet für MCP aktuell diese Scopes:

- `openid`
- `profile`
- `email`
- `offline_access`
- `realite:read`
- `realite:write`

`realite:read` deckt lesende Zugriffe ab. `realite:write` erlaubt Änderungen wie neue Gruppen, Events oder Entscheidungen auf Vorschläge.

## Hinweise für MCP-Clients

- Der MCP-Transport läuft über HTTP `POST` auf `/api/mcp`.
- Der Endpunkt ist OAuth-geschützt und erwartet ein Bearer-Token.
- Für Discovery sollte der Client die Protected-Resource-Metadata lesen statt feste Auth-URLs anzunehmen.
- Realite nutzt den angemeldeten Better-Auth-User als Grundlage und synchronisiert daraus den internen App-User.

## Typische Probleme

### Der Client bekommt `401 Unauthorized`

Meist fehlt das Bearer-Token oder der Client nutzt die OAuth-Metadaten nicht korrekt. Prüfe insbesondere:

- ob `/.well-known/oauth-protected-resource/api/mcp` erreichbar ist
- ob der Client wirklich ein Access Token für die Resource `/api/mcp` anfordert
- ob die Anmeldung und die Consent-Seite vollständig abgeschlossen wurden

### MCP Inspector im Browser zeigt CORS-Fehler

Wenn du den MCP Inspector lokal im Browser nutzt, kommen Requests typischerweise von einer Localhost-Origin (z. B. `http://localhost:6274`).

Realite erlaubt dafür CORS auf den Discovery- und MCP-Endpunkten:

- `/.well-known/oauth-protected-resource/api/mcp`
- `/.well-known/oauth-authorization-server`
- `/.well-known/openid-configuration`
- `/api/mcp`

Falls du eine andere Origin verwenden willst, setze `MCP_ALLOWED_ORIGINS` als kommaseparierte Liste (z. B. `http://localhost:6274,http://localhost:3001`).

Hinweis: Für den Browser-Inspector muss CORS nicht nur auf den `/.well-known`- und `/api/mcp`-Routen stimmen, sondern auch auf den OAuth-Endpunkten unter `/api/auth/*` (z. B. Dynamic Client Registration).

### Was bedeuten `issuer` und `audience`?

- `issuer`: Wer hat das Access Token ausgestellt (der OAuth-Server).  
  Realite erwartet hier die eigene Origin (z. B. `https://realite.app`).
- `audience`: Für welche Resource ist das Token gedacht.  
  Realite erwartet hier den MCP-Resource-Endpunkt `https://realite.app/api/mcp`.

Wenn `issuer` oder `audience` nicht zum Token passen, lehnt Realite den Zugriff auf `/api/mcp` mit `401` ab.

### Die Anmeldung endet wieder auf der Login-Seite

Dann wurde der OAuth-Flow nicht vollständig fortgesetzt oder die Sitzung ist nicht gültig. Starte die MCP-Verbindung neu und melde dich erneut an.

### Der MCP-Client sieht keine Realite-Daten

Realite legt den internen App-User beim ersten gültigen Zugriff automatisch an bzw. aktualisiert ihn aus Better Auth. Wenn der Client zwar authentifiziert ist, aber keine Daten sieht, melde dich einmal regulär in Realite an und versuche es dann erneut.
