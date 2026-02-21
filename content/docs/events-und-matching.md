# Events und Matching

## Event-Erstellung

Ein Event enthält unter anderem:

- Titel
- Start-/Endzeit
- Sichtbarkeit
- optionale Gruppe
- Tags/Hashtags

## Tagging-Logik

- `#alle` im Titel => Event wird als globales Event behandelt
- `#kontakte` => Event wird mit Kontaktkontext verknüpft

## Verfügbarkeitsabgleich

Realite prüft über Google FreeBusy, ob ein Event mit deinem Kalender kollidiert.

Kalender- und Kontakte-Sync laufen für Dashboard/Listen im Hintergrund, damit die Oberfläche schnell reagiert.

Wenn freie Zeit nicht sicher aus Google FreeBusy ermittelt werden kann, erstellt Realite keine neuen Vorschläge.

Wenn Google für lange Zeiträume Grenzen setzt, teilt Realite die Anfrage intern in kleinere Zeitfenster auf.

## Proaktive Vorschläge

Wenn ein Event gut passt, kann Realite es proaktiv zustellen.

In den Nutzereinstellungen auf `/settings` legst du fest:

- ob Vorschläge automatisch in Google Kalender eingetragen werden
- wie zugestellt wird:
- `Kalenderkopie` (Eintrag in deinem gewählten Kalender)
- `Source-Einladung` (du wirst als Teilnehmer im Quell-Event eingeladen, inkl. Google RSVP)
- ob deine E-Mail für Source-Einladungen sichtbar sein darf
- in welchen deiner beschreibbaren Google Kalender Kalenderkopien eingetragen werden

Du entscheidest dann in der App:

- **Zusagen**
- **Absagen**

Vorschläge werden in der Übersicht pro Tag gruppiert und zeigen Uhrzeit sowie Ersteller des Termins.

Realite synchronisiert Vorschläge inklusive Entfernen: Wenn Quelle oder Match wegfällt, werden veraltete Vorschläge und zugehörige Kalendereinträge wieder entfernt.

Bei Source-Einladungen entfernt Realite dich dabei wieder aus der Teilnehmerliste statt das Quell-Event zu löschen.

Wichtig: Ein neuer Vorschlag blockiert deinen Kalender noch nicht. Erst nach **Zusage** wird er als belegte Zeit geführt.

Im Kalendereintrag findest du außerdem einen Link zu Realite sowie direkte Zusage-/Absage-Links.

Diese Entscheidungen beeinflussen spätere Vorschläge.
