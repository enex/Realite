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

Das stellst du auf **`/settings`** ein. Dort kannst du automatische Einträge ein-/ausschalten und den Zustellmodus wählen.

Modi:

- `Kalenderkopie`: Eintrag in deinen gewählten Kalender.
- `Source-Einladung`: Du wirst als Teilnehmer im Quell-Event eingeladen (Google RSVP).

Falls der gewählte Kalender für Kalenderkopien später nicht mehr verfügbar ist, nutzt Realite automatisch einen Fallback (Primary oder erster verfügbarer Kalender).

## Warum wurde keine Source-Einladung erstellt?

Typische Gründe:

- das Quell-Event ist nicht aus Google synchronisiert
- der Event-Owner hat für diesen Kalender keine Schreibrechte
- du hast „E-Mail sichtbar“ für Source-Einladungen deaktiviert (dann fällt Realite auf Kalenderkopie zurück)
