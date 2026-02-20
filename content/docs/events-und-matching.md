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

Wenn Google für lange Zeiträume Grenzen setzt, teilt Realite die Anfrage intern in kleinere Zeitfenster auf.

## Proaktive Vorschläge

Wenn ein Event gut passt, kann Realite es als Vorschlag in den Kalender schreiben.

Du entscheidest dann in der App:

- **Zusagen**
- **Absagen**

Diese Entscheidungen beeinflussen spätere Vorschläge.
