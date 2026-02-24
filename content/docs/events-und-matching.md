# Events und Matching

## Events erstellen

Ein Event besteht aus:

- Titel
- Start und Ende
- optionalem Ort
- Sichtbarkeit
- Hashtags
- optionaler Farbe (z. B. zur schnellen Zuordnung; wird bei Events und Vorschlägen als farbiger Rand angezeigt)

## Smart Treffen (automatische Terminfindung)

Mit **Smart Treffen** sucht Realite automatisch den besten Zeitpunkt für eine Gruppe und lädt die Teilnehmer direkt ein.

Du legst fest:

- welche Gruppe eingeladen wird
- wie viele Zusagen mindestens nötig sind
- in welchem Suchfenster Realite Zeiten prüfen soll
- wie lange auf Zusagen gewartet wird
- wie viele neue Vorschläge Realite maximal versuchen soll

So läuft es:

1. Realite bewertet mögliche Zeitfenster im Suchbereich.
2. Dabei werden Verfügbarkeiten, bisherige Interessen-Signale und frühere Zu-/Absagen der Teilnehmer berücksichtigt.
3. Der beste Termin wird in deinen Kalender eingetragen und die Gruppe wird eingeladen.
4. Wird die Mindestzahl bis zur Frist nicht erreicht (oder alle sagen ab), entfernt Realite den Termin wieder.
5. Danach erzeugt Realite automatisch einen neuen Vorschlag (bis zum eingestellten Versuchslimit).

Lernen über Zeit:

- Zusagen verbessern die Wahrscheinlichkeit für ähnliche Slots/Teilnehmer.
- Absagen und fehlende Antworten senken die künftige Priorität.
- Dadurch werden spätere Vorschläge pro Gruppe robuster.

## Smart Treffen per Titel-Shortcut bei normalen Events

Du kannst normale Event-Erstellung mit Shortcuts im Titel direkt an Smart Treffen übergeben.

Beispiele:

- `Team Dinner !min=4 !frist=24h !fenster=24h`
- `Padel Runde !min3 !versuche=2`

Bedeutung:

- `!min=4` oder `!min4`: Mindestzusagen
- `!frist=24h`: Zeit bis zur automatischen Bewertung/Absage
- `!fenster=24h`: Suchfenster ab dem eingegebenen Startzeitpunkt
- `!versuche=2`: maximale Anzahl automatischer Neuversuche
- `!interval=30m`: Slot-Abstand für die Suche

Die Shortcut-Tokens werden nicht als Teil des finalen Termintitels verwendet.

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

**Kalender und Realite bleiben synchron:** Realite nutzt Google-Kalender-Benachrichtigungen (Webhooks). Änderungen in deinen ausgewählten Kalendern (neue, geänderte oder gelöschte Termine) werden möglichst direkt in Realite übernommen. Beim Öffnen des Dashboards und beim Speichern der Kalender-Einstellungen werden die Benachrichtigungen eingerichtet bzw. erneuert. So bleiben Events und Verfügbarkeit in Realite aktuell, ohne dass du manuell synchronisieren musst.

Kalenderlinks in Realite:

- Neue Vorschläge im Kalender enthalten einen Link `realite.app/s/<shortUUID>` zur direkten Zu-/Absage.
- Angenommene Vorschläge bzw. bestätigte Einträge enthalten einen Link `realite.app/e/<shortUUID>` zur Eventseite.

**Event-Links ohne Anmeldung:** Öffentliche Events (`/e/...`) lassen sich auch ohne Konto öffnen. Du siehst Titel, Termin, Ort, Beschreibung und Ersteller sowie vorhandene Kommentare. Sobald du zusagen, absagen oder kommentieren willst, wirst du zur Anmeldung mit Google weitergeleitet und danach zurück auf die Eventseite gebracht.
- Titel von Realite-Kalendereinträgen enthalten keine Hashtags:  
  Bei neuen Vorschlägen `[Realite Vorschlag] <Titel ohne Hashtags>`, bei Zusage `[Realite] <Titel ohne Hashtags>`.
- In der Beschreibung wird dafür eine einzelne Zeile ergänzt: `Realite-Link (automatisch ergänzt): <Link>`.
- Wenn ein Event aus Google Kalender in Realite importiert wird, ergänzt Realite im Google-Termin automatisch einen `realite.app/e/...`-Link in der Beschreibung.
- Dieser automatisch ergänzte Realite-Text wird beim Import in Realite ignoriert, damit Beschreibungen in Realite sauber bleiben.

Wenn du einen `/e/...`-Link in Messenger-Apps oder Social-Feeds teilst, zeigt Realite jetzt ein Open-Graph-Vorschaubild mit Eventtitel, Termin und Ersteller.

Wichtig: Aus Datenschutzgründen werden darin nur Daten für öffentliche Events angezeigt. Für nicht-öffentliche Events erscheint eine neutrale Vorschau ohne Eventdetails.

Wenn für dich zu einem Event bereits eine Suggestion existiert und du nicht der Event-Ersteller bist, zeigt die Eventseite (`/e/...`) direkt denselben Antwort-Flow wie die Suggestionseite.

Event- und Vorschlagslisten in Realite verlinken direkt auf diese Seiten, damit du von jeder Übersicht sofort entscheiden kannst.

**Vorschläge mit Kalendertermin:** Wenn zu einem Vorschlag bei dir bereits ein Termin im Kalender angelegt wurde (z. B. durch Zusage oder automatische Übernahme), findest du auf der Vorschlagsseite und auf der Vorschlags-Detailseite einen Link **Im Kalender bearbeiten** bzw. **Event im Kalender bearbeiten**. Damit öffnest du den zugehörigen Termin in Google Kalender zur Bearbeitung.

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

**Jemanden einladen:** Wenn du der Ersteller eines Events aus dem Google Kalender bist, erscheint auf der Eventseite und – falls du dort landest – auch auf der zugehörigen Suggestionseite der Bereich **Jemanden einladen**. Dort kannst du:

- bis zu drei Personen aus deinen Realite-Kontakten (Gruppen/Kontakte) mit einem Klick vorschlagen und einladen,
- oder eine beliebige E-Mail-Adresse bzw. einen Namen eingeben: Realite schlägt passende Kontakte vor oder du lädst direkt per E-Mail ein.

Eingeladene Personen werden im zugehörigen Google-Kalender-Termin als Teilnehmer:innen ergänzt. Sie erhalten die Einladung per E-Mail von Google Kalender und können so den Termin sehen und zu-/absagen. Es werden nur Personen angezeigt, die noch nicht eingeladen wurden.

**Zusagen:** Wer einem Event in Realite zugesagt hat, ist direkt sichtbar: auf der **Eventseite** (Block „Zusagen“ mit Namen), in der **Event-Übersicht** (Dashboard) und in der **Vorschlags-Übersicht** unter jedem Termin. So siehst du auf einen Blick, wer dabei ist. Als Event-Ersteller siehst du im Bereich **Jemanden einladen** zusätzlich die Antworten aus dem Google-Kalender (zugesagt, abgesagt, ausstehend). Bei Terminen, denen du selbst zugesagt hast, erscheint der Hinweis **Du hast zugesagt**.

Wenn ein Ort hinterlegt ist, zeigt Realite zusätzlich:

- Distanz von deinem aktuellen Standort (wenn Standortfreigabe aktiv ist)
- einen Link **Route planen / navigieren** für direkte Navigation

**Kommentare:** Unter jedem Event (auf der Eventseite und auf der Vorschlagsseite zum gleichen Event) findest du einen Bereich **Kommentare**. Alle, die Zugriff auf das Event haben, können dort:

- Fragen stellen und beantworten
- vor, während und nach dem Termin miteinander schreiben
- sich zu Ort, Ablauf oder sonstigen Details austauschen

Die Kommentare sind an das Event gebunden: Ob du die Eventseite (`/e/...`) oder die Vorschlagsseite (`/s/...`) öffnest – es ist dieselbe Unterhaltung.

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
