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
- `#date`: Event für Dating-Matches (nur nach gegenseitigem Profil-Match sichtbar)

Du kannst mehrere Hashtags nutzen.

Regeln für `#date`:

- `#date` muss in deinem Profil freigeschaltet sein
- `#date` kann nicht mit `#alle` oder `#kontakte` kombiniert werden
- `#dating` wird automatisch als `#date` behandelt

## Wie Vorschläge entstehen

Realite vergleicht:

- deine Interessen (über Hashtags und bisherige Entscheidungen)
- deine verfügbare Zeit
- passende Events aus deinen Gruppen und öffentlichen Bereichen
- bei `#date` zusätzlich: gegenseitige Profilkriterien (Geschlecht, Altersbereich, Single-Status)

Verfügbarkeit bedeutet hier die Kalender-Eigenschaft pro Termin:

- **Beschäftigt** blockiert den Zeitraum
- **Frei/Verfügbar** blockiert den Zeitraum nicht

Realite macht Vorschläge nur dann, wenn du im betreffenden Zeitraum verfügbar bist.
Für `#date`-Events gilt zusätzlich: beide Seiten müssen sich gegenseitig matchen.

Hinweis zum Datenschutz:

- Hashtags werden in Event- und Vorschlagsansichten nicht offen angezeigt.
- So bleiben persönliche Interessen privat.

## Was im Kalender passiert

Wenn aktiviert, kann Realite Vorschläge automatisch in deinen Kalender übernehmen.

Du entscheidest in den Einstellungen:

- ob automatische Übernahme aktiv ist
- dass Vorschläge als Kalendereintrag mit Realite-Link erscheinen
- welcher Kalender für Kalendereinträge genutzt wird
- welche Kalender für Verfügbarkeit und Vorschläge einbezogen werden
- wie viele Vorschläge maximal pro Tag und pro Kalenderwoche bleiben
- wie viele Vorschläge aktuell automatisch in deinen Kalender eingetragen wurden

Wichtig für korrektes Matching:

- Du musst die Verfügbarkeits-Eigenschaft deiner Termine im Kalender setzen und pflegen (z. B. **Beschäftigt** oder **Frei/Verfügbar**).
- Realite nutzt diese Eigenschaft direkt, um zu entscheiden, ob ein Zeitfenster als verfügbar gilt.

Kalenderlinks in Realite:

- Neue Vorschläge im Kalender enthalten einen Link `realite.app/s/<shortUUID>` zur direkten Zu-/Absage.
- Angenommene Vorschläge bzw. bestätigte Einträge enthalten einen Link `realite.app/e/<shortUUID>` zur Eventseite.
- Titel von Realite-Kalendereinträgen enthalten keine Hashtags:  
  Bei neuen Vorschlägen `[Realite Vorschlag] <Titel ohne Hashtags>`, bei Zusage `[Realite] <Titel ohne Hashtags>`.
- In der Beschreibung wird dafür eine einzelne Zeile ergänzt: `Realite-Link (automatisch ergänzt): <Link>`.
- Wenn ein Event aus Google Kalender in Realite importiert wird, ergänzt Realite im Google-Termin automatisch einen `realite.app/e/...`-Link in der Beschreibung.
- Dieser automatisch ergänzte Realite-Text wird beim Import in Realite ignoriert, damit Beschreibungen in Realite sauber bleiben.

Wenn du einen `/e/...`-Link in Messenger-Apps oder Social-Feeds teilst, zeigt Realite jetzt ein Open-Graph-Vorschaubild mit Eventtitel, Termin und Ersteller.

Wichtig: Aus Datenschutzgründen werden darin nur Daten für öffentliche Events angezeigt. Für nicht-öffentliche Events erscheint eine neutrale Vorschau ohne Eventdetails.

Wenn für dich zu einem Event bereits eine Suggestion existiert und du nicht der Event-Ersteller bist, zeigt die Eventseite (`/e/...`) direkt denselben Antwort-Flow wie die Suggestionseite.

Event- und Vorschlagslisten in Realite verlinken direkt auf diese Seiten, damit du von jeder Übersicht sofort entscheiden kannst.

## Event-Detailseite

Auf der Eventseite (`/e/<shortUUID>`) siehst du jetzt alle wichtigen Event-Informationen gesammelt:

- Titel und Termin
- Ort
- Beschreibung
- Ersteller

Die Beschreibung unterstützt einfache HTML-Formatierung. Erlaubt sind z. B.:

- Absätze und Zeilenumbrüche (`<p>`, `<br>`)
- Betonung (`<strong>`, `<b>`, `<em>`, `<i>`, `<u>`)
- Listen (`<ul>`, `<ol>`, `<li>`)
- Links (`<a href="...">`)

Unsichere oder nicht erlaubte HTML-Inhalte werden automatisch bereinigt und nicht ausgeführt.
Der automatisch von Realite ergänzte Kalender-Zusatz (`Realite-Link (automatisch ergänzt): ...`) wird auf der Eventseite ausgeblendet.

Wenn der Termin aus deinem Google Kalender stammt und du der Ersteller bist, findest du oben rechts einen **Bearbeiten**-Button mit Stift-Symbol.  
Damit springst du direkt zum Original-Termin in Google Kalender.

Wenn ein Ort hinterlegt ist, zeigt Realite zusätzlich:

- Distanz von deinem aktuellen Standort (wenn Standortfreigabe aktiv ist)
- einen Link **Route planen / navigieren** für direkte Navigation

## Profilseiten von Nutzern

Jeder registrierte Nutzer hat eine Profilseite unter:

- `realite.app/u/<shortUUID>`

Dort siehst du öffentliche Profilinfos und kommende Events der Person. Was du sehen kannst, hängt von deinem Status ab:

- **Nicht eingeloggt:** nur öffentliche Events mit `#alle`
- **Eingeloggt:** nur Events dieser Person, die mit dir gematcht wurden
- **Eigenes Profil:** deine sichtbaren, kommenden Events

In Event- und Suggestion-Ansichten kannst du den Ersteller direkt anklicken und kommst auf dieses Profil.

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

Neu für Absagen:

- Bei **Nicht mit dieser Person** fragt Realite konkret mit Namen (z. B. „Nicht mit Max Mustermann“).
- Wenn du das auswählst, landet die Person in deiner Blockliste und wird nicht mehr vorgeschlagen.
- Bei **Nicht diese Aktivität** blockiert Realite die betroffenen Aktivitäts-Tags (z. B. Karaoke), damit genau solche Vorschläge nicht wieder auftauchen.

## Transparenz im Profil

Unter **Profil & Einstellungen** siehst du jetzt offen:

- welche Kriterien aktuell positiv gewichtet werden
- welche Kriterien aktuell negativ gewichtet werden
- welche Personen und Aktivitäten fest blockiert sind

Blocklisten kannst du dort auch wieder bereinigen (Entfernen).
