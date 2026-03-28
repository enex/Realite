# FAQ

## Was bringt mir Realite im Vergleich zu Google Kalender und direktem Einladen?

Mit Google Kalender erstellst du einen Termin und lädst konkret bestimmte Leute per E-Mail ein. Realite ergänzt das um Sichtbarkeit, Relevanz und weniger Abstimmungsaufwand:

- **Aktivitäten statt Chat-Koordination**: Realite fokussiert auf joinbare Aktivitäten statt auf lange Abstimmung in Messenger-Chats.
- **Passende Vorschläge statt breiter Einladung**: Realite zeigt Aktivitäten gezielt dort an, wo sie sozial und zeitlich relevant sind.
- **Kalender als Kontext**: Realite nutzt Verfügbarkeit und markierte Termine als Input. Es wird aber nichts automatisch veröffentlicht.
- **Kontrollierte Sichtbarkeit**: Du steuerst, wie weit sich eine Aktivität öffnet, statt direkt wahllos Einladungen zu verschicken.
- **Einfacher Reaktions-Flow**: Beitreten, anfragen oder Interesse zeigen ist schneller als manuelle Abstimmung mit vielen Einzelpersonen.

Kurz: Google Kalender bleibt deine Quelle für Termine und Verfügbarkeit. Realite nutzt das als Kontext, damit du weniger organisierst und leichter echte gemeinsame Aktivitäten zustande kommen.

## Werden Kalenderänderungen sofort in Realite übernommen?

Realite nutzt Google-Kalender-Webhooks: Sobald sich in deinen ausgewählten Kalendern etwas ändert (Termin anlegen, ändern, löschen), meldet Google das an Realite und der Sync läuft automatisch. Du musst nicht mehr manuell synchronisieren oder auf den nächsten Dashboard-Besuch warten. Die Webhooks werden beim Öffnen des Dashboards und beim Speichern der Kalender-Einstellungen eingerichtet.

Wichtig: Auch dabei werden Kalenderdaten nicht automatisch öffentlich gemacht. Sichtbar wird nur, was du in Realite ausdrücklich freigibst.

## Ich sehe meine Kalender-Events nicht

Prüfe bitte:

- ob dein Kalenderzugriff in Realite noch aktiv ist
- ob der Termin den richtigen Hashtag enthält (z. B. `#alle`)
- ob der Termin im richtigen Kalender liegt, den du in den Einstellungen ausgewählt hast

Wenn es weiter nicht klappt: einmal abmelden und neu anmelden.

## Was bedeuten in den Einstellungen `Später verbinden` und `Kalenderzugriff prüfen`?

Realite unterscheidet dort jetzt bewusst drei Zustände:

- **Kalenderzugriff aktiv**: dein Kalender ist verbunden und nutzbar
- **Später verbinden**: du nutzt Realite gerade ohne Kalender; Planung, Gruppen und Vorschläge laufen weiter manuell
- **Kalenderzugriff prüfen**: Realite kennt zwar schon eine Kalender-Verbindung, kann sie aber gerade nicht mehr nutzen, etwa nach entzogener oder abgelaufener Berechtigung

Im dritten Fall bleiben deine übrigen Flows nutzbar, aber Kalender-Vormerkungen und Verfügbarkeitsabgleich pausieren, bis du den Zugriff erneut freigibst. Dafür zeigt Realite auf den betroffenen Hauptflächen direkt den Button **Kalenderzugriff erneut freigeben**, zusätzlich in den **Vorschlags-Einstellungen**.

Wenn du Realite bewusst ohne Kalender nutzen willst, findest du die einzelnen Schritte unter **[Ohne Kalender starten](/docs/ohne-kalender-starten)**.

Wenn du genauer trennen willst, welche Funktionen nur dein Realite-Konto brauchen und welche heute zusätzlichen Kalenderzugriff oder einen bestimmten Provider voraussetzen, hilft **[Login, Kalender und Provider](/docs/login-kalender-und-provider)**.

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

Wenn dein Kalender gerade gar nicht verbunden oder nicht mehr lesbar ist, bleiben Vorschläge in Realite trotzdem möglich.
Sie werden dann nur vorsichtiger priorisiert, als Schätzung ohne Kalenderabgleich markiert und nicht automatisch in deinen
Kalender übernommen.

## Warum sehe ich den Dating-Modus / #date gar nicht?

Der Dating-Modus wird per Feature-Flag gesteuert und kann standardmäßig ausgeblendet sein. Wenn du weder auf der Startseite noch unter Einstellungen oder Gruppen etwas zu Dating oder `#date` siehst, ist die Funktion derzeit deaktiviert.

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

## Bedeutet `Vor Ort sichtbar möglich`, dass ich automatisch live sichtbar bin?

Nein.

`Vor Ort sichtbar möglich` heißt aktuell nur:

- der Event-Ersteller hat für dieses konkrete Event freiwillige Vor-Ort-Sichtbarkeit grundsätzlich erlaubt
- die normale Event-Sichtbarkeit bleibt davon getrennt
- Realite veröffentlicht dadurch noch keinen automatischen Live-Status

Wichtig:

- kein automatischer Standort-Share
- keine offene Personenliste außerhalb des Events
- keine Sichtbarkeit ohne bewussten Event-Kontext
- Check-in erst 90 Minuten vor Beginn, nur bis zum gewählten Zeitfenster und spätestens bis Eventende sichtbar

Mehr dazu steht unter **[Vor-Ort-Sichtbarkeit](/docs/vor-ort-sichtbarkeit)**.

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

## Wie nutze ich Smart Treffen schnell aus der normalen Event-Erstellung?

Du kannst Smart-Treffen-Parameter direkt in den Titel schreiben.

Beispiel:

- `Projekt-Checkin !min=3 !frist=24h !fenster=24h`

Wichtige Shortcuts:

- `!min=3` oder `!min3`: benötigte Mindestzusagen
- `!frist=24h`: Frist für Zusagen
- `!fenster=24h`: Suchfenster für Terminfindung
- `!versuche=3`: maximale automatische Neuversuche
- `!interval=30m`: Abstand der geprüften Zeitslots

Hinweis:

- Für Smart-Treffen-Shortcuts muss eine Gruppe ausgewählt sein.

## Warum wurde mein Smart Treffen automatisch entfernt?

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

**Event-Link ohne Login:** Öffentliche Event-Links (`/e/...`) kannst du auch ohne Anmeldung öffnen. Zum Ansehen reicht der Link; für Zusagen, Absagen oder Kommentare musst du dich einmal anmelden. Danach wählst du den verfügbaren Login für dieses Deployment selbst aus. In dieser Gastansicht zeigt Realite keine E-Mail-Adressen von Erstellern oder Kommentierenden öffentlich an.

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

## Warum spricht die Doku von Providerunabhängigkeit, obwohl ich aktuell nur Google sehe?

Weil Realite den Produktkern und die heutige Technik bewusst trennt.

Heute gilt:

- der Kontologin haengt vom aktuell konfigurierten Deployment ab
- Kalenderkontext und Kontakte-Sync hängen aktuell an Google-Verbindungen
- der eigentliche Kernflow mit Events, Gruppen, Sichtbarkeit und Vorschlägen bleibt davon im Produkt getrennt

Wenn du die einzelnen Abhängigkeiten sauber nachlesen willst, findest du die aktuelle Übersicht unter **[Login, Kalender und Provider](/docs/login-kalender-und-provider)**.

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

## Nutzt Realite Analytics, Session Replay und Feature Flags?

Ja. Realite nutzt PostHog für:

- Produkt-Analytics (z. B. welche Bereiche häufig genutzt werden)
- Session Replay zur Fehleranalyse und Verbesserung der Bedienung
- Feature Flags, um neue Funktionen kontrolliert auszurollen

Wichtig:

- Realite respektiert die Browser-Einstellung `Do Not Track`.
- Details zur Datenverarbeitung findest du unter **Datenschutz**.

## Kann ich Realite als App installieren?

Ja. Realite ist als PWA (Progressive Web App) nutzbar:

- **Android / Chrome (Desktop oder Handy):** Beim Besuch von Realite kannst du einen Hinweis „App installieren“ sehen. Du kannst auch im Browser-Menü (⋮) **App installieren** bzw. **Zum Startbildschirm hinzufügen** wählen.
- **iOS / Safari:** In Safari **Teilen** tippen und **Zum Home-Bildschirm** wählen. Realite erscheint dann wie eine App und kann aus dem Home-Bildschirm geöffnet werden.
- **Edge / andere Browser:** Über das Menü nach **App installieren** oder **An Startmenü anheften** suchen.

Nach der Installation öffnest du Realite wie eine normale App; Login und Nutzung bleiben gleich. Ohne Internetverbindung zeigt Realite eine Offline-Seite an.

## Wo finde ich Datenschutz, AGB und Impressum?

Die rechtlichen Seiten findest du jederzeit im Footer:

- Datenschutz: `/datenschutz`
- AGB: `/agb`
- Impressum: `/impressum`
