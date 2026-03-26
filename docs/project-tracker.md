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

Zuletzt umgesetzt am 26.03.2026:

- Sichtbarkeitsmodell für V1.5/V2 explizit entschieden und zentralisiert: vier Kernstufen für normale Events, geschützte Sonderfälle separat
- Event-Formular erklärt jetzt direkt, dass Realite das Standardmodell bewusst klein hält statt weitere Freigabe-Zwischenstufen einzuführen
- Nutzer-Doku zu Sichtbarkeit/Relevanz um die klare V1.5/V2-Abgrenzung ergänzt
- Presence an ein klares Event-Zeitfenster gekoppelt: Check-in erst 90 Minuten vor Start, automatisches Ende mit Eventschluss
- Eventseite kommuniziert das Presence-Zeitfenster jetzt explizit statt unbegrenzter Vor-Ort-Sichtbarkeit
- Nutzer-Doku und FAQ für die begrenzte Vor-Ort-Sichtbarkeit ergänzt
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

- klare Home-/Dashboard-Informationsarchitektur
- bessere Priorisierung der wichtigsten Aktionen beim Einstieg
- explizite Join-Mechaniken jenseits von Vorschlagsentscheidung
- feinere Sichtbarkeit wie optional vor Ort sichtbar weiter ausarbeiten
- weitergehende Presence-Regeln über das Event-Zeitfenster hinaus
- konsistente, starke UI-Sprache über alle Hauptviews

## Wichtigste Produktprobleme aktuell

### 1. Einstieg / Dashboard ist nicht klar genug

Aktuell landet man zuerst in einer Struktur, in der eigene Events stark präsent sind, während wichtige Dinge wie:

- relevante Vorschläge
- spontane Möglichkeiten
- Smart Activities / Smart Meetings
- wer gerade dabei ist

nicht stark genug priorisiert sichtbar sind.

Das schwächt den Kernnutzen:

- "Was geht gerade?"
- "Wem kann ich mich anschließen?"
- "Wo sollte ich jetzt reagieren?"

### 2. Informationsarchitektur ist noch nicht produktzentriert genug

Die Hauptviews wirken eher wie einzelne Funktionsseiten als wie ein klar priorisierter Produktfluss.

Es fehlt eine eindeutige Hierarchie:

1. jetzt relevante Aktivitäten
2. Vorschläge, die Reaktion brauchen
3. spontane Optionen / offene Join-Möglichkeiten
4. eigene Planung und Verwaltung

### Produktentscheidung festgehalten

Bereits entschieden:

- `Events` soll nicht die primäre "Was geht gerade?"-Ansicht sein
- `Events` ist eher die persönliche Kalender-/Sozialkalender-Ansicht
- `Smart Meetings` sollen aus der zentralen Hauptansicht ausgegliedert werden
- `Smart Meetings` passen eher in einen sekundären Bereich, z. B. Profil oder einen separaten Management-Kontext

Offen bleibt nur noch, ob `Smart Meetings` dauerhaft:

- im Profil liegen
- einen eigenen Top-Level-Bereich bekommen
- oder in einem sekundären Planungs-/Verwaltungsbereich landen

### 3. Visuelle Sprache ist noch nicht stark genug

Die App ist funktional, aber noch nicht auf einem klaren, markanten Produktniveau.

Verbesserungsfelder:

- stärkere visuelle Priorisierung
- bessere Scannability
- weniger Gleichgewichtung von wichtig und unwichtig
- klarerer Fokus auf Aktivität, Personen, Momentum
- mutigere, konsistentere Oberfläche

### 4. Presence-/Vor-Ort-Layer fehlt noch

Der zusätzliche Socializing-Use-Case auf Stadtfesten, Festivals oder ähnlichen Events ist noch nicht als echte Produktfunktion modelliert.

Es fehlt bisher:

- opt-in Sichtbarkeit vor Ort
- Zeitfenster für Anwesenheit
- Relevanzlogik für bekannte, interessante oder gegenseitig relevante Personen
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

Status: `planned`

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

### P1

- [x] Navigation überprüfen: ob `Events`, `Vorschläge`, `Gruppen` die richtige Reihenfolge und Benennung haben
- [x] unterscheiden zwischen `Entdecken`, `Reagieren`, `Verwalten`
- [x] visuelle Patterns für offene Aktivitäten, persönliche Vorschläge, eigene Aktivitäten und Smart Meetings definieren
- [x] Event-/Suggestion-Karten auf Scannability und Priorisierung überarbeiten
- [x] leere Zustände produktnäher formulieren

### P2

- [x] explizite Join-Mechaniken modellieren: direkt beitreten, anfragen, Interesse zeigen
- [x] Sichtbarkeitsstufen `Freunde` und `Freunde von Freunden` im Event-Modell, Formular und UI ergänzen
- [x] Sichtbarkeitsmodell erweitern: Freunde, Freunde von Freunden, offen, optional vor Ort sichtbar
- [x] Presence-/Vor-Ort-Konzept definieren
- [x] Dating-Use-Case als Unterfall des Relevanzmodells schärfen, nicht als separaten Produktkern
- [x] echten Presence-/Check-in-Status über die reine Event-Freigabe hinaus modellieren
- [x] Zeitfenster für Anwesenheit definieren und Vor-Ort-Sichtbarkeit an das Event koppeln

## Konkret bekannte UX-/View-Aufgaben

### Dashboard / Events

- [x] Entscheidung: `/events` ist nicht die primäre Startansicht
- [x] neue Startansicht für "Was geht gerade?" definieren
- [x] prüfen, ob eigene Events zu viel Platz einnehmen
- [x] Vorschläge mit Handlungsbedarf nach oben ziehen
- [x] CTA-Reihenfolge in `Jetzt` sichtbar machen: reagieren, mitmachen, erstellen
- [x] offene Aktivitäten mit vorhandenen Zusagen sichtbarer machen
- [x] "Wer ist dabei?" prominenter machen
- [x] `Events` als Sozialkalender klar definieren: eigene Pläne, bestätigte Aktivitäten, Kalenderkontext

### Smart Meetings

- [x] Entscheidung: Smart Meetings sollen nicht im Hauptfeed der Startansicht bleiben
- [x] bevorzugte Zielposition entscheiden: sekundärer Verwaltungsbereich unter `Events`
- [x] Smart Meetings als Planungs-/Orga-Tool positionieren statt als primären Discovery-Feed
- [x] prüfen, wie viel Prominenz Smart Meetings in der Navigation wirklich brauchen

### Suggestions

- [x] Suggestions stärker als Handlungs-Queue inszenieren
- [x] Gründe, Relevanz und nächste Aktion schneller erfassbar machen
- [x] accepted / pending / declined Zustände visueller differenzieren

### Groups

- [x] Gruppen stärker als Relevanz- und Sichtbarkeitslayer erklären
- [x] Gruppenverwaltung vom eigentlichen Aktivitätsfluss entkoppeln

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
