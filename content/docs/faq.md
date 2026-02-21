# FAQ

## Ich sehe meine Kalender-Events nicht

Prüfe:

- ob Google Kalender API im Google Cloud Projekt aktiviert ist
- ob du die benötigten Scopes beim Login bestätigt hast
- ob das Event den erwarteten Hashtag enthält (z. B. `#alle`)

Hinweis: Die App zeigt zuerst Daten aus der Datenbank und synchronisiert Google Kalender/Kontakte im Hintergrund.

## Kontakte-Sync zeigt Warnungen

Typisch sind fehlende Kontakte-Berechtigungen oder API-Einschränkungen. Melde dich einmal ab und erneut mit Google an.

## Warum ist eine Gruppe als "Sync" markiert?

Diese Gruppe ist mit Google Kontakte (My Contacts oder Label) verknüpft und wird automatisch aktualisiert.

## Warum kann ich manche Gruppen nicht löschen?

Synchronisierte Gruppen werden absichtlich nicht hart gelöscht. Du kannst sie stattdessen verstecken und später wieder einblenden.

## Warum erscheinen manche Kontakte ohne Realite-Markierung?

Dann ist der Kontakt zwar in der Gruppe/Kontaktliste, aber die E-Mail ist noch nicht als Realite-Konto registriert.

## Wo verwalte ich Gruppenaktionen?

In der Gruppen-Detailseite (`/groups/<id>`), nicht mehr in der kompakten Übersicht.

## In welchen Kalender werden Vorschläge eingetragen?

Das stellst du auf **`/settings`** ein. Dort kannst du automatische Einträge ein-/ausschalten und den Zielkalender auswählen.

Falls der gewählte Kalender später nicht mehr verfügbar ist, versucht Realite automatisch den Primary-Kalender.
