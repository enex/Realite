# Realite Project Tracker

## Zweck

Dieses Dokument trackt den aktuellen Produktstand, offene Lücken, Milestones und konkrete Aufgaben.

Es ist **interne Projekt-Doku** für Produkt, Design, Engineering und Agenten.

## Produktziel

Realite soll echte gemeinsame Aktivitäten leichter machen:

- weniger Abstimmung
- mehr spontane Erlebnisse
- bessere Sichtbarkeit, was bei relevanten Leuten gerade geht

Der Kern bleibt:

- Aktivitäten statt Chat
- explizite Freigabe
- Privatsphäre zuerst
- Kontakte für Relevanz, nicht für Spam

Ein sekundärer Use Case ist On-Site-Socializing auf bestehenden Veranstaltungen:

- sehen, welche bekannten oder interessanten Leute auch da sind
- spontan dazustoßen
- optional Dating-Kontext, wenn beide Seiten sichtbar und offen sind

Dieser Use Case ist **Zusatz**, nicht Produktzentrum.

## Aktueller Stand

Zuletzt umgesetzt am 27.03.2026:

- `Gruppen` rahmt die Verwaltungsansicht jetzt deutlicher als aktives Steuerpult statt als flache Liste: mit Fokusblock für den nächsten Pflege-Schritt, priorisiertem Überblick zu sichtbaren, synchronisierten und öffentlichen Kreisen sowie klarem Pflegebedarf
- sichtbare Gruppen werden in `Gruppen` jetzt nach Verwaltungsrelevanz sortiert: erst aktiv genutzte Kreise, dann gepflegte Kontaktkreise, dann Gruppen mit offenem Pflegebedarf
- die visuelle Sprache von `Gruppen` zieht Verwaltung, Sync-Zustand und Pflegebedarf damit klarer auseinander, ohne den Bereich in einen Discovery-Feed zu kippen
- Gruppenkarten in `Gruppen` tragen jetzt explizite Verwaltungszustände wie `Aktiv genutzt`, `Kreis steht` oder `Wartet auf Pflege`, damit Pflegebedarf nicht mehr zwischen allen Kreisen gleich aussieht
- unter der Hauptnavigation gibt es jetzt auf allen Kernseiten einen kompakten Bereichswechsel, der `Jetzt`, `Vorschläge`, `Events` und `Gruppen` produktlogisch zusammenbindet statt nur als isolierte Tabs zu zeigen
- die Sekundärnavigation hält damit Begriffe und Rollen über alle Hauptbereiche konsistenter: `Entdecken`, `Reagieren` und `Verwalten` bleiben nicht nur Seitenlabels, sondern auch direkte Wechsel- und Orientierungslogik
- Smart-Treffen-Bereich in `Events` rahmt Gruppenkoordination jetzt noch expliziter als Orga-Flow statt als zweite Eventliste
- jeder Smart-Treffen-Lauf zeigt jetzt einen klaren nächsten Orga-Schritt sowie Phasenlabels wie `Freigabe offen`, `Suche läuft`, `Warten auf Zusagen` oder `Gesichert`
- Navigation und Nutzer-Doku benennen `Events`/`Smart Treffen` damit konsequenter als Sozialkalender plus Gruppen-Orga statt als Discovery-Fläche
- `Vorschläge` rahmt die Reaktionsansicht jetzt auch im normalen Flow explizit ein: mit eigenem Einordnungsblock statt direktem Sprung nur in Zahlen und Listen
- klare Rückwege aus `Vorschläge` nach `Jetzt`, `Events` und `Gruppen` sind damit nicht mehr nur im Leerzustand sichtbar, sondern als dauerhafte Orientierung im Reaktionsfluss
- die Trennung zwischen entdecken, reagieren und verwalten bleibt dadurch auch bei vorhandenen Empfehlungen im Seitenkopf konkret statt nur über die globale Navigation
- `Jetzt` benennt die erste relevante Aktivität in ruhigen Phasen jetzt präziser: bestätigte eigene Beteiligung wird als Zusage, verbleibende eigene Termine als Planung statt generisch als offene Aktivität beschrieben
- der Block `Nächster Schritt` und die Frage `Was passiert gerade?` laufen damit auch bei wenig neuem Momentum nicht mehr in eine Discovery-Sprache hinein, wenn real nur bestehende Beteiligung oder Verwaltung übrig ist
- ruhige Dashboard-Zustände bleiben dadurch produktklarer getrennt: entdecken, bestehende Beteiligung prüfen und eigene Planung verwalten
- `Events` führt jetzt nicht nur im Leerzustand, sondern auch im normalen Verwaltungsflow mit einem eigenen Rückwege-Block gezielt zurück nach `Jetzt`, `Vorschläge` und `Gruppen`
- die persönliche Sozialkalender-Ansicht bleibt damit klar von Discovery getrennt: Planung, Kalenderkontext und Freigabepflege haben explizite Rückwege in den Hauptfluss
- leerer `Events`-Sozialkalender trennt nächste Schritte jetzt explizit nach `Jetzt`, `Vorschläge`, `Gruppen` und eigener Planung statt nur generisch zum Erstellen zu drängen
- die Informationsarchitektur bleibt damit auch ohne sichtbare Termine verständlich: entdecken, reagieren, verwalten und planen werden im leeren Zustand klar auseinandergezogen
- Smart-Treffen-Bereich in `Events` jetzt deutlicher als Orga- und Planungsfläche statt Discovery-Feed markiert
- eigener Statusüberblick für Freigaben, laufende Suchen, gesicherte Termine sowie pausierte/beendete Läufe ergänzt
- direkte Rückwege aus dem Smart-Treffen-Bereich nach `Jetzt`, `Vorschläge` oder zurück in den Sozialkalender eingebaut, damit Verwaltungswege nicht hängen bleiben
- leere Zustände in `Vorschläge` führen jetzt klarer aus der reinen Reaktionsansicht heraus: mit getrennten nächsten Wegen nach `Jetzt`, `Events` oder direkt zu neuem Matching statt bloßer Statusmeldung
- die Abgrenzung zwischen entdecken, reagieren und verwalten wird damit nicht nur in der Navigation, sondern auch im leeren Zustand der Vorschlags-Queue konkret
- `Jetzt` erklärt leere Zustände jetzt gezielter statt generisch: getrennt nach fehlendem Momentum, fehlender eigener Beteiligung, nur eigener Planung in `Events` oder komplett ohne offene Aktivitäten
- die vorgeschlagene nächste Aktion im leeren Zustand passt jetzt zum tatsächlichen Kontext: Fokus zurücksetzen, Planung öffnen, Gruppen öffnen oder direkt selbst etwas starten
- Eventkarten in `Jetzt` und `Events` sowie die Eventseite zeigen bei aktivierter Vor-Ort-Sichtbarkeit jetzt direkt, wer aktive Check-ins sehen kann
- der Freigabekreis für Presence ist damit nicht mehr nur im separaten Vor-Ort-Panel versteckt, sondern schon vor dem eigentlichen Check-in-Flow sichtbar
- Presence-Panel bleibt nach Ablauf des eigenen Vor-Ort-Zeitfensters jetzt auch im Hauptstatus konsistent: kein irreführendes `Du bist vor Ort sichtbar`, sondern klarer Schutz-Zustand mit bewusstem Neustart
- Event-Erstellformular zeigt vor dem Speichern jetzt eine klare Sichtbarkeits-Vorschau: getrennt für Event-Freigabe und spätere aktive Vor-Ort-Check-ins
- Trust-/Privacy-Regeln für neue Sichtbarkeit damit auch direkt im Erstellflow geschärft statt erst nach dem Speichern auf der Eventseite
- `Jetzt` zeigt oberhalb der drei Orientierungsfragen jetzt einen dominanten Block `Nächster Schritt`, der bewusst genau eine priorisierte Aktion empfiehlt: zuerst reagieren, dann bei Momentum mitmachen, sonst nächste relevante Aktivität öffnen oder selbst starten
- Milestone 1 ist damit vollständig erfüllt und nicht mehr nur geplant: Dashboard priorisiert relevante Aktivitäten, Vorschläge und spontane Einstiege jetzt inklusive klarer erster Aktion
- `Jetzt` priorisiert offene Aktivitäten im Feed jetzt explizit nach Momentum statt nur nach Zeit und bietet dafür die Fokus-Modi `Priorisiert`, `Mit Momentum` und `Meine Beteiligung`
- Zusagen- und Presence-Listen zeigen ohne gepflegten Namen jetzt bewusst neutrale Personenlabels statt E-Mail-Adressen offenzulegen
- abgelaufene eigene Presence-Zeitfenster bleiben auf der Eventseite jetzt auch nach Reload/API-Roundtrip als Schutz-Zustand `Zeitfenster abgelaufen` erkennbar statt wie nie aktiviert zu wirken
- öffentliche Event-Links geben in Gastansichten keine E-Mail-Adressen von Erstellern oder Kommentierenden mehr preis; Namen bleiben optional, sonst neutral
- Presence-Panel erklärt jetzt direkt je Event-Sichtbarkeit, wer aktive Vor-Ort-Check-ins sehen kann, statt nur allgemein auf "Event-Zugriff" zu verweisen
- Presence-/Vor-Ort-Status auf der Eventseite um klarere Schutz-Zustände erweitert: vor dem Fenster, nach Eventende und nach abgelaufenem eigenem Zeitfenster wird jetzt explizit erklärt, warum niemand sichtbar ist
- `Jetzt` beantwortet die drei Kernfragen jetzt direkt im UI: nächst relevante Aktivität, offene Reaktion und schnellster Mitmach-Einstieg stehen als eigener Orientierungsblock über dem Feed
- Sichtbarkeitsmodell für V1.5/V2 explizit entschieden und zentralisiert: vier Kernstufen für normale Events, geschützte Sonderfälle separat
- Event-Formular erklärt jetzt direkt, dass Realite das Standardmodell bewusst klein hält statt weitere Freigabe-Zwischenstufen einzuführen
- Nutzer-Doku zu Sichtbarkeit/Relevanz um die klare V1.5/V2-Abgrenzung ergänzt
- Presence an ein klares Event-Zeitfenster gekoppelt: Check-in erst 90 Minuten vor Start, automatisches Ende mit Eventschluss
- Eventseite kommuniziert das Presence-Zeitfenster jetzt explizit statt unbegrenzter Vor-Ort-Sichtbarkeit
- Nutzer-Doku und FAQ für die begrenzte Vor-Ort-Sichtbarkeit ergänzt
- Presence-Check-ins sind jetzt zusätzlich mit bewusst wählbaren Sichtbarkeitsfenstern begrenzt statt nur mit einem offenen Eventfenster
- Eventseite zeigt aktive Vor-Ort-Sichtbarkeit jetzt konsistent als `sichtbar bis …` für die eigene Freigabe und andere sichtbare Personen
- ideales Home-Erlebnis für `Jetzt` in einem Satz festgezogen: sofort sehen, was gerade relevant ist, wo Reaktion fehlt und wie man ohne Verwaltungsballast direkt ins gemeinsame Erleben kommt
- die drei Kernfragen der Startansicht explizit festgehalten, damit `Jetzt` produktseitig klar gegen `Events` und `Gruppen` abgegrenzt bleibt
- primäre Produktobjekte festgelegt: Aktivität zuerst, Vorschlag als Reaktionsobjekt, Presence als optionaler Event-Layer, Gruppe als Relevanz- und Sichtbarkeitskontext
- High-Level-Domain-Dokument für Sichtbarkeit und Relevanz unter `/docs` ergänzt und im Docs-Index verankert
- Überblicks-Doku jetzt mit direktem Verweis auf das gemeinsame Modell aus Relevanz, Sichtbarkeit, Gruppen, Kontakten und geschützten Sonderfällen
- Typografie- und Spacing-Hierarchie der Kernviews vereinheitlicht: gemeinsame Header-, Section- und Detailrhythmen für `Jetzt`/`Events`, `Vorschläge`, `Gruppen`, Event-Details, Settings und Shell-Kontext
- wiederholte Eyebrow-, Titel-, Meta- und Lead-Styles in eine zentrale UI-Hierarchie gezogen statt verteilter Einzelklassen
- Dating-Use-Case in UI-Texten und Nutzer-Doku als geschützter Unterfall des Relevanz- und Sichtbarkeitsmodells geschärft
- `#date` wird jetzt konsequenter als Aktivitätsfilter statt als separater Produktkern beschrieben
- gemeinsames Card-System für Kernflächen definiert und auf Vorschläge, Smart Treffen, Event-Details sowie Vor-Ort-Status angewendet
- Handlungs-Queue, Verlauf, Smart-Treffen-Planung und Presence nutzen jetzt dieselbe Surface-Hierarchie für Section-, Item- und Inset-Karten
- Event-Detailseite übernimmt dieselbe Kartenlogik jetzt auch für Zusagen und den persönlichen Vorschlags-Flow
- visuelle Prioritätsstufen für Kernflächen definiert und in `Jetzt`, `Events` sowie Event-Details als gemeinsame Surface-Logik verankert
- offene Reaktionen, Momentum und Planung nutzen jetzt konsistente Card-/Inset-/Badge-Gewichtung statt verstreuter Einzelklassen
- echter Presence-/Check-in-Status für Events eingeführt: auf der Eventseite bewusst ein- und ausblendbar statt nur als abstrakte Freigabe
- Presence jetzt als eigenes Domain-Objekt mit explizitem Nutzerstatus pro Event modelliert
- Eventseite zeigt bei erlaubter Vor-Ort-Sichtbarkeit jetzt, wer sich aktuell bewusst als vor Ort sichtbar markiert hat
- Nutzer-Doku für den neuen Check-in-Flow ergänzt
- Presence-/Vor-Ort-Konzept jetzt sauber dokumentiert: eventgebunden, opt-in, getrennt von Event-Sichtbarkeit und ohne automatischen Live-Status
- neue Nutzer-Doku unter `/docs` erklärt den aktuellen Vor-Ort-Layer und grenzt klar ab, was noch nicht automatisch passiert
- Event-Modell um explizites Opt-in `Vor Ort sichtbar` erweitert, getrennt von der eigentlichen Event-Sichtbarkeit
- Event-Formular, Eventkarten und Eventseite zeigen jetzt klar, ob Vor-Ort-Sichtbarkeit für ein Event überhaupt erlaubt ist
- Nutzer-Doku für den neuen opt-in Presence-Baustein ergänzt
- Gruppenansicht klar als Verwaltungsbereich geschärft: erst Rückwege in `Jetzt`, `Vorschläge` und `Events`, dann Verwaltungslogik, dann Gruppenlisten
- Event-Sichtbarkeiten um **Freunde** und **Freunde von Freunden** erweitert
- Kontakte-Events über den bestehenden `#kontakte`-Graphen als echte Freundes-Sichtbarkeit modelliert statt nur als Gruppen-Scope
- Event-Formular, Eventseiten und Nutzer-Doku um klare Sichtbarkeitsbeschreibungen ergänzt
- explizite Join-Mechaniken für Events eingeführt: **Direkt beitreten**, **Anfrage senden**, **Interesse zeigen**
- Join-Modus ist jetzt Teil des Event-Modells, im Erstellformular wählbar und auf Karten/Eventseiten sichtbar
- `#date` nutzt aus Privatsphäre-Gründen automatisch den low-pressure Modus **Interesse zeigen**
- Nutzer-Doku für Mitmach-Modi ergänzt
- `Jetzt` zeigt den Sozialkalender nur noch als kompakte Vorschau; die ausführliche Event-Struktur bleibt ausschließlich in `Events`
- mobile und desktop Informationshierarchie der Hauptviews geprüft und geschärft: erst reagieren und mitmachen, dann Verwaltung
- visuelle Patterns und Statuslabels für Vorschläge, offene Aktivitäten und eigene Planung vereinheitlicht
- Karten in `Jetzt` und `Events` zeigen konsistente Pattern-Badges wie `Jetzt reagieren`, `Offene Aktivität`, `Deine Planung` und `Du dabei`
- Nutzer-Doku für die neuen Kartenmuster und Statushinweise ergänzt
- Smart Treffen in `Events` als sekundären Planungsbereich mit eigener Bereichs-Navigation verankert statt als stärkere Hauptnavigation
- eigene Events ohne Zusagen aus dem `Jetzt`-Feed herausgenommen und klar in `Events` als Planung verortet
- offene Vorschläge mit Handlungsbedarf in `Jetzt` als eigene Reaktions-Section vor den Aktivitätsfeed gezogen
- offene Aktivitäten mit vorhandenen Zusagen in `Jetzt` und `Events` sichtbarer gemacht
- "Wer ist dabei?" in Aktivitätskarten prominenter dargestellt
- Nutzer-Doku für Zusagen/Momentum in den Übersichten ergänzt
- `Events` klarer als Sozialkalender segmentiert: bestätigte Aktivitäten, eigene Planung und Kalenderkontext
- Vorschlagskarten so geschärft, dass Zeitpunkt, Relevanzgrund und nächste Aktion direkt sichtbar sind
- CTA-Hierarchie in `Jetzt` festgelegt und umgesetzt: zuerst reagieren, dann mitmachen, dann erstellen
- Gruppen-Seite und Nutzer-Doku klarer als Relevanz- und Sichtbarkeitslayer positioniert statt als eigener Aktivitätsfeed

Bereits vorhanden:

- Google Login
- Kalender-Integration
- Kontakte-Sync
- Gruppen und Invite-Links
- Events mit Sichtbarkeit und Tags
- Vorschläge / Matching
- Zusage / Absage mit Lernlogik
- Smart Meetings
- Event-Kommentare
- öffentliche Event-Seiten und Nutzerprofile
- MCP-Server + OAuth
- PWA-Basis

Noch nicht sauber ausgearbeitet:

- explizite Join-Mechaniken jenseits von Vorschlagsentscheidung
- Presence über den aktuellen eventgebundenen Opt-in hinaus auf Folgefälle und Relevanzlogik weiter ausarbeiten
- die visuelle Sprache nach der aktuellen Hierarchie-Arbeit weiter vereinheitlichen und mutiger machen
- offene Vertrauens- und Safety-Regeln für spätere Socializing-/Festival-Kontexte konkretisieren

## Wichtigste Produktprobleme aktuell

### 1. Einstieg / Dashboard ist nicht klar genug

Die Kernhierarchie von `Jetzt` ist inzwischen deutlich klarer, aber zwei Punkte brauchen weiter Produktpflege:

- Ranking und Copy für Grenzfälle mit wenig Aktivität oder wenig Momentum
- klare leere Zustände, wenn weder Vorschläge noch joinbare Aktivitäten vorliegen

Der Kernnutzen ist damit sichtbar, aber noch nicht in allen Tagesformen gleich stark.

Das schwächt den Kernnutzen:

- "Was geht gerade?"
- "Wem kann ich mich anschließen?"
- "Wo sollte ich jetzt reagieren?"

### 2. Informationsarchitektur ist noch nicht produktzentriert genug

Die Hauptviews folgen jetzt weitgehend dem Produktfluss, aber die Sekundärnavigation und einige Begriffe sind noch nicht vollständig aus einem Guss.

Weiter sauber zu schärfen:

1. wie Planungs- und Verwaltungswege in Randfällen zurück nach `Jetzt` führen
2. wie `Events`, `Vorschläge` und `Gruppen` in Copy und Empty States noch klarer getrennt werden

### Produktentscheidung festgehalten

Bereits entschieden:

- `Events` soll nicht die primäre "Was geht gerade?"-Ansicht sein
- `Events` ist eher die persönliche Kalender-/Sozialkalender-Ansicht
- `Smart Meetings` sollen aus der zentralen Hauptansicht ausgegliedert werden
- `Smart Meetings` passen in einen sekundären Planungs-/Verwaltungsbereich unter `Events`

Offen bleibt nur noch, wie stark dieser Bereich künftig im UI hervorgehoben werden soll, ohne den Discovery-Flow wieder zu verwässern.

### 3. Visuelle Sprache ist noch nicht stark genug

Die App ist funktional, aber noch nicht auf einem klaren, markanten Produktniveau.

Verbesserungsfelder:

- stärkere visuelle Priorisierung
- bessere Scannability
- weniger Gleichgewichtung von wichtig und unwichtig
- klarerer Fokus auf Aktivität, Personen, Momentum
- mutigere, konsistentere Oberfläche

### 4. Presence-/Vor-Ort-Layer fehlt noch

Der eventgebundene Presence-Layer ist als Produktfunktion inzwischen vorhanden, aber der weitergehende Socializing-Use-Case ist noch nicht vollständig ausmodelliert.

Es fehlt bisher:

- Relevanzlogik für bekannte, interessante oder gegenseitig relevante Personen jenseits des aktuellen Event-Kontexts
- Schutzregeln für spätere Festival-/On-Site-Szenarien, die über das heutige Check-in-Modell hinausgehen
- sichere low-pressure Interaktion

## Priorisierungslogik

Bei Entscheidungen gilt:

1. Aktivität vor Verwaltung
2. Relevanz vor Vollständigkeit
3. Sichtbarkeit nur mit Kontrolle
4. Reaktion vor Konfiguration
5. Momentum vor Feature-Masse

## Milestones

### Milestone 1: Core UX schärfen

Ziel:
Der Kernnutzen von Realite wird beim ersten App-Einstieg sofort verständlich und nutzbar.

Definition of done:

- Dashboard priorisiert relevante Aktivitäten statt bloßer Verwaltung
- Vorschläge und spontane Join-Möglichkeiten sind sichtbar prominent
- Smart Meetings sind nicht mehr versteckt
- wichtigste nächste Aktion ist auf den ersten Blick klar

Status: `done`

### Milestone 2: Informationsarchitektur vereinfachen

Ziel:
Die Hauptnavigation und Seitenstruktur folgen einer klaren Produktlogik.

Definition of done:

- klare Reihenfolge der Hauptbereiche
- weniger kognitive Last zwischen Events, Vorschlägen, Gruppen und Smart-Funktionen
- bessere Trennung zwischen "entdecken / reagieren" und "verwalten"

Status: `planned`

### Milestone 3: Visual Refresh der Kernviews

Ziel:
Die wichtigsten Screens wirken intentional, priorisiert und deutlich hochwertiger.

Definition of done:

- konsistente visuelle Sprache
- klare visuelle Gewichtung wichtiger Inhalte
- bessere mobile und desktop hierarchy
- Cards, Status, CTAs und Listen sind leichter scanbar

Status: `planned`

### Milestone 4: Join- und Presence-Layer

Ziel:
Realite unterstützt nicht nur Planung, sondern auch spontane Koordination und optional Sichtbarkeit vor Ort.

Definition of done:

- explizite Join-States
- optionales "bin da" / "sichtbar vor Ort"
- klar begrenzte Sichtbarkeit
- Relevanz statt People-Browsing

Status: `planned`

### Milestone 5: Trust, Privacy, Safety

Ziel:
Neue Sichtbarkeits- und Socializing-Funktionen bleiben kontrolliert und vertrauenswürdig.

Definition of done:

- opt-in Presence
- klare Sichtbarkeitsregeln
- verständliche Zustände im UI
- keine überraschende Offenlegung

Status: `planned`

## Task Backlog

### P0

- [x] Dashboard neu strukturieren: erst relevante Aktivitäten, dann Vorschläge, dann Smart Meetings, dann eigene Verwaltung
- [x] neue primäre Home-/Now-Ansicht definieren, die nicht mit `Events` identisch ist
- [x] `Events` als persönliche Kalender-/Sozialkalender-Ansicht neu positionieren
- [x] `Smart Meetings` aus der Hauptansicht herauslösen und in einen sekundären Bereich verschieben
- [x] klare CTA-Hierarchie definieren: zuerst reagieren, dann mitmachen, dann erstellen
- [x] bestehende Hauptviews auf mobile und desktop Informationshierarchie prüfen
- [x] in `Jetzt` einen dominanten Block `Nächster Schritt` ergänzen, damit die erste priorisierte Aktion ohne Scrollen klar ist

### P1

- [x] Navigation überprüfen: ob `Events`, `Vorschläge`, `Gruppen` die richtige Reihenfolge und Benennung haben
- [x] unterscheiden zwischen `Entdecken`, `Reagieren`, `Verwalten`
- [x] globale Bereichs-Navigation unter der Hauptnavigation ergänzen, damit Bereichswechsel zwischen `Jetzt`, `Vorschläge`, `Events` und `Gruppen` überall gleich gerahmt sind
- [x] `Events` auch außerhalb leerer Zustände mit klaren Rückwegen nach `Jetzt`, `Vorschläge` und `Gruppen` in den Hauptfluss anbinden
- [x] Copy und leere Zustände in `Vorschläge` klarer gegen `Jetzt` und `Events` trennen, inklusive direkter Rückwege bei leerer Handlungs-Queue
- [x] Grenzfall-Copy in `Jetzt` schärfen: bei wenig neuem Momentum bestätigte Beteiligung und eigene Planung nicht generisch als offene Aktivität benennen
- [x] visuelle Patterns für offene Aktivitäten, persönliche Vorschläge, eigene Aktivitäten und Smart Meetings definieren
- [x] Event-/Suggestion-Karten auf Scannability und Priorisierung überarbeiten
- [x] leere Zustände produktnäher formulieren
- [x] leere Zustände in `Jetzt` für kein Momentum, keine direkte Beteiligung, nur eigene Planung und komplett fehlende offene Aktivitäten explizit unterscheiden

### P2

- [x] Event-Erstellformular zeigt vor dem Speichern klar, wer das Event und spätere aktive Vor-Ort-Check-ins je nach Sichtbarkeit sehen kann
- [x] öffentliche Event-Links privacy-härten: in Gastansichten keine E-Mail-Adressen von Erstellern oder Kommentierenden zeigen
- [x] explizite Join-Mechaniken modellieren: direkt beitreten, anfragen, Interesse zeigen
- [x] Sichtbarkeitsstufen `Freunde` und `Freunde von Freunden` im Event-Modell, Formular und UI ergänzen
- [x] Sichtbarkeitsmodell erweitern: Freunde, Freunde von Freunden, offen, optional vor Ort sichtbar
- [x] Presence-/Vor-Ort-Konzept definieren
- [x] Dating-Use-Case als Unterfall des Relevanzmodells schärfen, nicht als separaten Produktkern
- [x] echten Presence-/Check-in-Status über die reine Event-Freigabe hinaus modellieren
- [x] Zeitfenster für Anwesenheit definieren und Vor-Ort-Sichtbarkeit an das Event koppeln
- [x] Presence-Check-in auf begrenzte Sichtbarkeitsdauer pro Eventseite erweitern
- [x] Presence-Zustände im UI klar erklären: noch geschlossen, eigenes Zeitfenster abgelaufen, Event beendet
- [x] Presence-Panel erklärt je Event-Sichtbarkeit konkret, wer aktive Vor-Ort-Check-ins sehen kann
- [x] Eventkarten und Eventseite zeigen bei aktivierter Vor-Ort-Sichtbarkeit direkt, wer aktive Check-ins sehen kann
- [x] abgelaufenes eigenes Presence-Zeitfenster nach Reload/API-Roundtrip weiter als Schutz-Zustand zeigen statt wie nie aktiviert
- [x] Presence-Panel hält auch nach Ablauf des eigenen Zeitfensters Headline, CTA und Ausblend-Logik konsistent im Schutz-Zustand
- [x] Zusagen- und Presence-Listen privacy-härten: ohne gepflegten Namen keine E-Mail-Fallbacks in sichtbaren Personenlisten zeigen

## Konkret bekannte UX-/View-Aufgaben

### Dashboard / Events

- [x] Entscheidung: `/events` ist nicht die primäre Startansicht
- [x] neue Startansicht für "Was geht gerade?" definieren
- [x] die drei Kernfragen der Startansicht direkt in `Jetzt` als eigenen Orientierungsblock beantworten
- [x] offenen Aktivitäten-Feed in `Jetzt` mit Fokus-Modi und Momentum-Priorisierung schärfen statt nur chronologisch zu sortieren
- [x] prüfen, ob eigene Events zu viel Platz einnehmen
- [x] Vorschläge mit Handlungsbedarf nach oben ziehen
- [x] CTA-Reihenfolge in `Jetzt` sichtbar machen: reagieren, mitmachen, erstellen
- [x] offene Aktivitäten mit vorhandenen Zusagen sichtbarer machen
- [x] "Wer ist dabei?" prominenter machen
- [x] `Events` als Sozialkalender klar definieren: eigene Pläne, bestätigte Aktivitäten, Kalenderkontext
- [x] leeren `Events`-Sozialkalender mit klaren Wegen nach `Jetzt`, `Vorschläge`, `Gruppen` und zur eigenen Planung schärfen
- [x] normalen `Events`-Verwaltungsflow ebenfalls mit klaren Rückwegen in `Jetzt`, `Vorschläge` und `Gruppen` ergänzen

### Smart Meetings

- [x] Entscheidung: Smart Meetings sollen nicht im Hauptfeed der Startansicht bleiben
- [x] bevorzugte Zielposition entscheiden: sekundärer Verwaltungsbereich unter `Events`
- [x] Smart Meetings als Planungs-/Orga-Tool positionieren statt als primären Discovery-Feed
- [x] prüfen, wie viel Prominenz Smart Meetings in der Navigation wirklich brauchen
- [x] Smart-Treffen-Bereich in `Events` mit Statusüberblick und klaren Rückwegen nach `Jetzt`/`Vorschläge` als Orga-Fläche schärfen
- [x] Smart-Treffen-Läufe mit klaren Orga-Phasen und nächstem Schritt kennzeichnen statt wie eine zweite Eventliste darzustellen

### Suggestions

- [x] Suggestions stärker als Handlungs-Queue inszenieren
- [x] Gründe, Relevanz und nächste Aktion schneller erfassbar machen
- [x] accepted / pending / declined Zustände visueller differenzieren
- [x] `Vorschläge` auch im normalen Flow mit eigener Reaktions-Einordnung und klaren Rückwegen nach `Jetzt`, `Events` und `Gruppen` rahmen

### Groups

- [x] Gruppen stärker als Relevanz- und Sichtbarkeitslayer erklären
- [x] Gruppenverwaltung vom eigentlichen Aktivitätsfluss entkoppeln
- [x] `Gruppen` als priorisierte Verwaltungsfläche schärfen: Fokus auf nächsten Pflege-Schritt, Sync-Überblick und Statuslabels statt flacher Gleichgewichtung aller Kreise
- [x] sichtbare Gruppenkarten nach Verwaltungszustand priorisieren und mit klaren Pflege-Labels markieren

### Design System / UI

- [x] visuelle Prioritätsstufen definieren
- [x] Typografie- und Spacing-Hierarchie vereinheitlichen
- [x] Card-System für Aktivitäten, Vorschläge, Presence und Smart Meetings definieren
- [x] konsistente Statusfarben und Statuslabels definieren

## Product Discovery Tasks

- [x] gewünschtes ideales Home-Erlebnis in 1 Satz definieren
- [x] definieren, welche drei Fragen die Startansicht beantworten muss
- [x] festlegen, welche Objekte produktseitig primär sind: Aktivität, Vorschlag, Presence, Gruppe
- [x] Presence-/On-Site-Use-Case als opt-in Flow beschreiben
- [x] Sichtbarkeit und Relevanzmodell als High-Level-Domain-Dokument festhalten

### Discovery-Entscheidungen für die Startansicht

**Ideales Home-Erlebnis in 1 Satz**

`Jetzt` soll in wenigen Sekunden zeigen, was gerade sozial relevant ist, wo eine bewusste Reaktion von dir fehlt und welcher nächste Schritt dich mit minimaler Koordination ins echte gemeinsame Erleben bringt.

**Die drei Fragen, die `Jetzt` beantworten muss**

1. Was passiert gerade oder in Kürze, das für mich konkret relevant ist?
2. Wo wartet gerade eine Entscheidung oder Reaktion von mir?
3. Wo kann ich mit wenig Abstimmung direkt einsteigen oder Momentum aufnehmen?

**Primäre Produktobjekte**

1. **Aktivität** ist das primäre Produktobjekt: der konkrete, joinbare Anlass.
2. **Vorschlag** ist das primäre Reaktionsobjekt: ein relevanter Anlass, der bewusst deine Entscheidung braucht.
3. **Presence** ist ein optionaler, eventgebundener Zusatzlayer: sichtbar nur mit explizitem Opt-in und nie eigenständig vor der Aktivität.
4. **Gruppe** ist Kontext für Relevanz und Sichtbarkeit, aber kein eigener Feed-Kern.

## Entscheidungen offen

- [x] `Events` bleibt nicht die zentrale Startansicht
- [x] `Smart Meetings` bleiben nicht Teil der primären Hauptaktivitätsansicht
- [x] Die primäre Home-/Now-Ansicht priorisiert Reaktion und offene Aktivitäten vor Verwaltung
- [x] Smart Meetings bleiben als sekundärer Verwaltungsbereich unter `Events`
- [x] Eigene Events ohne Zusagen bleiben in `Events`; relevante fremde Aktivitäten und offene Reaktionen stehen in `Jetzt` vorn
- [x] Wie wird Presence vor Ort dargestellt, ohne creepy oder zu offen zu wirken?
- [x] Welche Sichtbarkeitsstufen sind wirklich nötig für V1.5 / V2?

## Empfohlene Reihenfolge

1. Dashboard / Startansicht neu priorisieren
2. `Events` klar als Sozialkalender positionieren
3. `Smart Meetings` in einen sekundären Bereich verschieben
4. Hauptnavigation und IA schärfen
5. visuelle Sprache der Kernviews verbessern
6. Join-Modell erweitern
7. Presence-/Vor-Ort-Layer als opt-in Zusatz einführen
8. Trust-/Privacy-Regeln für neue Sichtbarkeit finalisieren

## Arbeitsweise

Bei jeder größeren Änderung festhalten:

- Problem
- gewünschtes Nutzerergebnis
- betroffene Views
- betroffene APIs / Domain-Objekte
- Doku-Update nötig: ja/nein
- Testbedarf: Logik / UI / E2E

## Update-Regel

Dieses Dokument soll aktualisiert werden, wenn:

- neue Produktprioritäten festgelegt werden
- Milestones verschoben oder abgeschlossen werden
- zentrale UX-Probleme neu erkannt werden
- Presence-/Socializing-Konzept konkretisiert wird
