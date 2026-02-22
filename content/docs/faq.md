# FAQ

## Ich sehe meine Kalender-Events nicht

Prüfe bitte:

- ob dein Kalenderzugriff in Realite noch aktiv ist
- ob der Termin den richtigen Hashtag enthält (z. B. `#alle`)
- ob der Termin im richtigen Kalender liegt, den du in den Einstellungen ausgewählt hast

Wenn es weiter nicht klappt: einmal abmelden und neu anmelden.

## Warum erscheinen manche Termine doppelt?

Das passiert oft, wenn mehrere sehr ähnliche Kalender gleichzeitig berücksichtigt werden.

Lösung:

- öffne **Einstellungen**
- reduziere die Auswahl bei **Kalender für Verfügbarkeit und Vorschläge** auf die wirklich relevanten Kalender

## Warum wurde kein Vorschlag gemacht?

Mögliche Gründe:

- der Termin passt nicht zu deinen Gruppen oder Hashtags
- du bist zur Zeit des Termins nicht verfügbar
- der Termin liegt außerhalb der aktuell genutzten Kalenderauswahl

Wichtig:

- Realite bewertet deine Verfügbarkeit über die Kalender-Eigenschaft pro Termin.
- Termine mit **Beschäftigt** blockieren Zeitfenster.
- Termine mit **Frei/Verfügbar** blockieren Zeitfenster nicht.

Wenn Vorschläge fehlen, prüfe deshalb direkt im Kalender, ob die Verfügbarkeit für betroffene Termine korrekt gesetzt ist.

## Warum ist `#date` bei mir noch gesperrt?

`#date` wird nur freigeschaltet, wenn dein Dating-Profil vollständig ist.

Prüfe in **Profil & Einstellungen**:

- Dating-Modus aktiviert
- Geburtsjahr gesetzt (mindestens 18 Jahre)
- Geschlecht gesetzt
- Single-Status aktiv
- gesuchte Geschlechter gesetzt
- gesuchter Altersbereich vollständig gesetzt

Solange etwas fehlt, zeigt Realite die offenen Punkte direkt im Profil an.

## Warum sieht niemand mein `#date`-Event?

`#date`-Events sind absichtlich nicht allgemein sichtbar.

Sie werden nur Nutzern angezeigt, die mit dir im Dating-Modus **gegenseitig** matchen.

Wenn du kein gegenseitiges Match mit jemandem hast, sieht diese Person das Event nicht.

## Warum fragt Realite bei Absage nach Gründen?

Du kannst mehrere Gründe angeben (z. B. keine Zeit und zu weit entfernt).

Diese Informationen werden gespeichert und für zukünftige Vorschläge genutzt, damit Ergebnisse besser passen.

Wenn du **Nicht mit dieser Person** auswählst, wird diese Person zusätzlich auf eine Blockliste gesetzt.
Wenn du **Nicht diese Aktivität** auswählst, blockiert Realite die betroffenen Aktivitäts-Tags (z. B. Karaoke).

Beides kannst du später in **Profil & Einstellungen** wieder entfernen.

## Wo stelle ich Limits für Vorschläge ein?

In **Profil & Einstellungen** unter **Vorschlags-Einstellungen**:

- **Maximal pro Tag**
- **Maximal pro Woche**

Realite priorisiert dann die bestbewerteten passenden Optionen innerhalb dieser Limits.

## Wie nutze ich Smart Meetings schnell aus der normalen Event-Erstellung?

Du kannst Smart-Meeting-Parameter direkt in den Titel schreiben.

Beispiel:

- `Projekt-Checkin !min=3 !frist=24h !fenster=24h`

Wichtige Shortcuts:

- `!min=3` oder `!min3`: benötigte Mindestzusagen
- `!frist=24h`: Frist für Zusagen
- `!fenster=24h`: Suchfenster für Terminfindung
- `!versuche=3`: maximale automatische Neuversuche
- `!interval=30m`: Abstand der geprüften Zeitslots

Hinweis:

- Für Smart-Meeting-Shortcuts muss eine Gruppe ausgewählt sein.

## Warum wurde mein Smart Meeting automatisch entfernt?

Realite entfernt den aktiven Termin automatisch, wenn:

- bis zur gesetzten Frist die Mindestteilnehmerzahl nicht erreicht wurde oder
- alle eingeladenen Teilnehmer abgesagt haben.

Danach erstellt Realite automatisch einen neuen Vorschlag, solange noch Versuche verfügbar sind.

## Wie lösche ich meinen Account?

In **Profil & Einstellungen** findest du unten den Bereich **Account löschen**.

Ablauf:

- auf **Account endgültig löschen** klicken
- den Bestätigungsdialog akzeptieren

Danach entfernt Realite:

- von Realite erstellte Kalendereinträge aus deinem Kalender
- dein Profil und zugehörige Daten aus der Datenbank

## Was bedeuten die neuen kurzen Links (`/s/...` und `/e/...`)?

- `/s/<shortUUID>` öffnet die Seite zur Zusage/Absage für neue Vorschläge.
- `/e/<shortUUID>` öffnet die Eventseite für angenommene bzw. bestätigte Termine.

Diese Links findest du in von Realite angelegten Kalendereinträgen. Bei aus Google importierten Events ergänzt Realite den `/e/...`-Link in der Google-Beschreibung automatisch und ignoriert diesen Zusatztext beim erneuten Import in Realite.

## Warum sehe ich beim Teilen manchmal noch eine alte Link-Vorschau?

Viele Messenger und soziale Netzwerke speichern Vorschauen (Titel, Beschreibung, Bild) für eine URL für einige Zeit im Cache.

Das heißt:

- Realite liefert aktuelle OG-Metadaten inklusive Vorschaubild
- einzelne Plattformen zeigen trotzdem vorübergehend noch ältere Vorschauen
- nach Ablauf des Plattform-Caches wird die Vorschau automatisch aktualisiert

## Warum sehe ich im Google Kalender keine direkten Zusage/Absage-Buttons?

Das ist beabsichtigt.

Realite setzt im Kalendereintrag einen einzelnen Link auf die passende Realite-Seite (`/s/...` oder `/e/...`).
Zu- und Absage laufen zentral über diese Seite, damit der Entscheidungs-Flow einheitlich bleibt.
Außerdem entfernt Realite Hashtags aus dem Kalendertitel und nutzt klare Präfixe:
`[Realite Vorschlag] ...` vor Zusage, `[Realite] ...` nach Zusage.

## Warum kann ich manche Gruppen nicht löschen?

Synchronisierte Gruppen können nicht endgültig gelöscht werden.

Du kannst sie aber ausblenden und später wieder einblenden.

## Wo verwalte ich Gruppen und Mitglieder?

In der Gruppenansicht:

- neue Gruppen erstellen
- Mitglieder hinzufügen
- Einladungslink teilen
- Hashtags bearbeiten
- Gruppe löschen oder ausblenden

## Warum sehe ich bei manchen Kontakten kein Profilbild?

Realite zeigt Profilbilder, wenn entweder:

- beim Kontakt in Google Kontakte ein Foto hinterlegt ist oder
- für diesen Kontakt ein bekanntes Realite-Nutzerprofil vorhanden ist.

Wenn kein Bild verfügbar ist, zeigt Realite stattdessen Initialen an.

## Warum wird ein Kontakt mit mehreren E-Mail-Adressen nur einmal angezeigt?

Das ist beabsichtigt.

Realite fasst mehrere E-Mail-Adressen derselben Kontaktperson zu einem Eintrag zusammen:

- der Kontakt wird nur einmal angezeigt
- der Kontakt wird nur einmal gezählt
- die E-Mail-Adressen werden kommagetrennt dargestellt

## Wo finde ich Datenschutz, AGB und Impressum?

Die rechtlichen Seiten findest du jederzeit im Footer:

- Datenschutz: `/datenschutz`
- AGB: `/agb`
- Impressum: `/impressum`
