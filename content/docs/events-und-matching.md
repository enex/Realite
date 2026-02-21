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

Wenn Google für lange Zeiträume Grenzen setzt, teilt Realite die Anfrage intern in kleinere Zeitfenster auf.

## Proaktive Vorschläge

Wenn ein Event gut passt, kann Realite es als Vorschlag in den Kalender schreiben.

In den Nutzereinstellungen auf `/settings` legst du fest:

- ob Vorschläge automatisch in Google Kalender eingetragen werden
- in welchen deiner beschreibbaren Google Kalender eingetragen wird

Du entscheidest dann in der App:

- **Zusagen**
- **Absagen**

Vorschläge werden in der Übersicht pro Tag gruppiert und zeigen Uhrzeit sowie Ersteller des Termins.

Im Kalendereintrag findest du außerdem einen Link zu Realite sowie direkte Zusage-/Absage-Links.

Diese Entscheidungen beeinflussen spätere Vorschläge.
