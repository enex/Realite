# Events und Matching

## Events erstellen

Ein Event besteht aus:

- Titel
- Start und Ende
- optionalem Ort
- Sichtbarkeit
- Hashtags

## Hashtags richtig nutzen

- `#alle`: Event ist allgemein sichtbar
- `#kontakte`: Event richtet sich an deine Kontakte

Du kannst mehrere Hashtags nutzen.

## Wie Vorschläge entstehen

Realite vergleicht:

- deine Interessen (über Hashtags und bisherige Entscheidungen)
- deine verfügbare Zeit
- passende Events aus deinen Gruppen und öffentlichen Bereichen

Verfügbarkeit bedeutet hier die Kalender-Eigenschaft pro Termin:

- **Beschäftigt** blockiert den Zeitraum
- **Frei/Verfügbar** blockiert den Zeitraum nicht

Realite macht Vorschläge nur dann, wenn du im betreffenden Zeitraum verfügbar bist.

Hinweis zum Datenschutz:

- Hashtags werden in Event- und Vorschlagsansichten nicht offen angezeigt.
- So bleiben persönliche Interessen privat.

## Was im Kalender passiert

Wenn aktiviert, kann Realite Vorschläge automatisch in deinen Kalender übernehmen.

Du entscheidest in den Einstellungen:

- ob automatische Übernahme aktiv ist
- ob Vorschläge als eigener Kalendereintrag oder als Einladung erscheinen
- welcher Kalender für Kalendereinträge genutzt wird
- welche Kalender für Verfügbarkeit und Vorschläge einbezogen werden

Wichtig für korrektes Matching:

- Du musst die Verfügbarkeits-Eigenschaft deiner Termine im Kalender setzen und pflegen (z. B. **Beschäftigt** oder **Frei/Verfügbar**).
- Realite nutzt diese Eigenschaft direkt, um zu entscheiden, ob ein Zeitfenster als verfügbar gilt.

Jeder von Realite angelegte Kalendereintrag enthält jetzt kurze Realite-Links:

- `realite.app/e/<shortUUID>` zur Eventseite
- `realite.app/s/<shortUUID>` zur Antwortseite für die Suggestion

Wenn du einen `/e/...`-Link in Messenger-Apps oder Social-Feeds teilst, zeigt Realite jetzt ein Open-Graph-Vorschaubild.

Wichtig: Aus Datenschutzgründen werden darin nur Daten für öffentliche Events angezeigt. Für nicht-öffentliche Events erscheint eine neutrale Vorschau ohne Eventdetails.

Wenn für dich zu einem Event bereits eine Suggestion existiert und du nicht der Event-Ersteller bist, zeigt die Eventseite (`/e/...`) direkt denselben Antwort-Flow wie die Suggestionseite.

Event- und Vorschlagslisten in Realite verlinken direkt auf diese Seiten, damit du von jeder Übersicht sofort entscheiden kannst.

## Was du im Dashboard siehst

In **Alle sichtbaren Events** werden keine Events angezeigt, zu denen für dich eine noch unbestätigte Suggestion existiert.

Das betrifft Suggestionen mit offenem Status (z. B. noch nicht angenommen oder abgelehnt). Nach deiner Entscheidung erscheint das Event wieder normal in der Eventliste, falls es für dich sichtbar ist.

## Wichtig zu Zusage und Absage

- Bei **Zusage** wird der Termin in deinem Kalender geführt.
- Bei **Absage** wird der Vorschlag nicht in deinem Kalender behalten.

## Warum Entscheidungen wichtig sind

Jede Zusage oder Absage verbessert zukünftige Vorschläge.

Wenn du absagst, kannst du mehrere Gründe auswählen:

- Nicht mit dieser Person
- Nicht diese Aktivität
- Habe da keine Zeit
- Zu weit entfernt
- Wenn folgendes anders wäre ja

Diese Gründe werden gespeichert und im Matching für zukünftige Termine verwendet.
