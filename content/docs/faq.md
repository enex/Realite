# FAQ

## Ich sehe meine Kalender-Events nicht

Prüfe:

- ob Google Kalender API im Google Cloud Projekt aktiviert ist
- ob du die benötigten Scopes beim Login bestätigt hast
- ob das Event den erwarteten Hashtag enthält (z. B. `#alle`)

## Kontakte-Sync zeigt Warnungen

Typisch sind fehlende Kontakte-Berechtigungen oder API-Einschränkungen. Melde dich einmal ab und erneut mit Google an.

## Warum ist eine Gruppe als "Sync" markiert?

Diese Gruppe ist mit Google Kontakte (My Contacts oder Label) verknüpft und wird automatisch aktualisiert.

## Warum erscheinen manche Kontakte ohne Realite-Markierung?

Dann ist der Kontakt zwar in der Gruppe/Kontaktliste, aber die E-Mail ist noch nicht als Realite-Konto registriert.

## Wo verwalte ich Gruppenaktionen?

In der Gruppen-Detailseite (`/groups/<id>`), nicht mehr in der kompakten Übersicht.
