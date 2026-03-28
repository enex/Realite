# Login- und Onboarding-Pfade

Realite soll echte Aktivitäten leichter machen, nicht einen einzelnen Einstieg bevorzugen.

Darum gilt für den Produktfluss:

- der Kern startet mit deinem **Realite-Konto**
- der erste Nutzen entsteht über **Aktivitäten, Sichtbarkeit und Reaktionen**
- ein Kalender bleibt **optionaler Planungskontext**
- ein konkreter Login- oder Kalenderanbieter ist nur die **technische Verbindung**

## Der gemeinsame Kern nach jedem Login

Unabhängig vom Einstieg soll der erste sinnvolle Pfad gleich aussehen:

1. Konto anlegen oder anmelden
2. Profil kurz prüfen
3. ersten Kreis oder erste Sichtbarkeit festlegen
4. erstes Event anlegen, beitreten oder darauf reagieren
5. Kalender erst dann verbinden, wenn du mehr Planungskontext willst

Wichtig ist dabei:

- du musst nicht erst einen Kalender koppeln, um Realite sinnvoll zu nutzen
- nichts wird automatisch veröffentlicht
- Sichtbarkeit und Teilnahme bleiben immer ein bewusster Schritt

Wenn du den kompletten Standardfall ohne Kalender sehen willst, hilft dir zusätzlich **[Ohne Kalender starten](/docs/ohne-kalender-starten)**.

## Wie der Einstieg das schon im Onboarding zeigen soll

Der Einstieg soll den kalenderlosen Kernflow frueh sichtbar machen, ohne den spaeteren Nutzen einer Verbindung kleinzureden.

Darum ist die Reihenfolge im Onboarding bewusst:

1. zuerst klar sagen: Realite funktioniert bereits mit Aktivitaet, Sichtbarkeit, Gruppen und Vorschlaegen
2. danach den technischen Login-Schritt zeigen
3. erst anschliessend Kalender und Kontakte als optionalen Ausbau erklaeren

Das bedeutet fuer die Copy:

- kein Einstiegstext darf so klingen, als waere Kalenderzugriff Voraussetzung fuer den ersten Nutzen
- gleichzeitig soll sichtbar bleiben, dass Kalender spaeter mehr Timing-, Verfuegbarkeits- und Planungs-Kontext geben kann
- der spaetere Upgrade-Pfad wird erklaert, aber nicht als Huerde vor den ersten Event-, Gruppen- oder Vorschlags-Flow gesetzt

So bleibt der Onboarding-Pfad ehrlich:

- du kannst sofort starten
- du kannst spaeter bewusst mehr Kontext verbinden
- nichts davon passiert automatisch

## Google

Google ist ein voll unterstuetzter Login-Pfad und heute auch der einzige ausgebaute Kalender- und Kontakte-Kontext.

Das bedeutet aktuell:

- Google kann als Login genutzt werden
- Google Kalender kann optional als Planungskontext verbunden werden
- Google Kontakte koennen als Relevanz- und Gruppenkontext synchronisiert werden

Produktlogisch bleibt aber auch hier derselbe Kern:

- zuerst Aktivitäten, Kreise und Reaktionen
- danach optional Kalender- und Kontaktkontext

## Apple

Apple ist als interner Testpfad vorbereitet, aber noch nicht allgemein im Login freigeschaltet.

Sobald dieser Pfad oeffentlich aktiviert wird, soll er denselben Kern tragen:

- mit Apple anmelden
- direkt in Realite starten
- Events, Gruppen und Vorschläge ohne Pflicht-Kalender nutzen
- Apple Kalender spaeter optional als Planungskontext verbinden

Was sich dabei **nicht** ändern soll:

- keine Sonderlogik nur für Apple im Produktkern
- kein anderer Sichtbarkeits- oder Teilnahmefluss
- kein impliziter Veröffentlichungs-Schritt

## Microsoft

Microsoft ist als interner Testpfad vorbereitet, aber noch nicht allgemein im Login freigeschaltet.

Sobald dieser Pfad oeffentlich aktiviert wird, soll derselbe Kern gelten:

- mit Microsoft anmelden
- direkt erste Aktivitaet oder ersten Kreis anlegen
- Vorschlaege und Join-Mechaniken ohne Pflicht-Kalender nutzen
- Microsoft Kalender spaeter optional als Planungskontext verbinden

## Dev-Login

In lokaler Entwicklung gibt es zusaetzlich einen speziellen Dev-Login.

Er ist nur fuer Entwicklung, E2E-Tests und Agent-Arbeit gedacht:

- nur ausserhalb von Production sichtbar
- legt bei Bedarf automatisch einen lokalen Testnutzer an
- darf nicht als normaler Nutzerpfad verstanden werden

## Was über alle Pfade gleich bleiben muss

Diese Regeln gelten unabhaengig davon, ob du ueber Google startest oder spaeter ueber Apple oder Microsoft:

- Events anlegen, teilen und verwalten
- Sichtbarkeit wählen
- Gruppen pflegen
- Join-Modus nutzen: direkt beitreten, anfragen oder Interesse zeigen
- Vorschläge beantworten
- öffentliche Eventseiten öffnen

## Was sich nur technisch unterscheiden darf

Unterschiede zwischen Providern dürfen nur dort sichtbar sein, wo echte Integrationen beteiligt sind:

- Login-Verbindung selbst
- Kalender-Sync
- Kontakte-Sync
- Bearbeiten-im-Kalender-Links
- Einladungsversand über angebundene Kalender

Der Produktkern darunter bleibt gleich:

- Aktivität zuerst
- Kontext optional
- Sichtbarkeit bewusst
- keine automatische Veröffentlichung

## Woran du den aktuellen Stand erkennst

Wenn ein Pfad noch nicht vollstaendig aktiv ist, sollte Realite das als Technikstand markieren und nicht als fehlenden Produktzugang.

Das heisst:

- Google ist heute technisch und in der Sichtbarkeit weiter ausgebaut als Apple oder Microsoft
- der Kernflow bleibt trotzdem providerunabhaengig beschrieben
- fehlende Kalenderverbindung ist ein optionaler Upgrade-Unterschied, kein Produktbruch

Für die aktuelle Trennung zwischen Konto, Kalenderzugriff und heutigem Technikstand hilft auch **[Login, Kalender und Provider](/docs/login-kalender-und-provider)**.
