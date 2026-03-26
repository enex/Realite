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
- echter Presence-/Vor-Ort-Layer
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
- [ ] Dating-Use-Case als Unterfall des Relevanzmodells schärfen, nicht als separaten Produktkern
- [ ] echten Presence-/Check-in-Status über die reine Event-Freigabe hinaus modellieren

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

- [ ] visuelle Prioritätsstufen definieren
- [ ] Typografie- und Spacing-Hierarchie vereinheitlichen
- [ ] Card-System für Aktivitäten, Vorschläge, Presence und Smart Meetings definieren
- [x] konsistente Statusfarben und Statuslabels definieren

## Product Discovery Tasks

- [ ] gewünschtes ideales Home-Erlebnis in 1 Satz definieren
- [ ] definieren, welche drei Fragen die Startansicht beantworten muss
- [ ] festlegen, welche Objekte produktseitig primär sind: Aktivität, Vorschlag, Presence, Gruppe
- [x] Presence-/On-Site-Use-Case als opt-in Flow beschreiben
- [ ] Sichtbarkeit und Relevanzmodell als High-Level-Domain-Dokument festhalten

## Entscheidungen offen

- [x] `Events` bleibt nicht die zentrale Startansicht
- [x] `Smart Meetings` bleiben nicht Teil der primären Hauptaktivitätsansicht
- [x] Die primäre Home-/Now-Ansicht priorisiert Reaktion und offene Aktivitäten vor Verwaltung
- [x] Smart Meetings bleiben als sekundärer Verwaltungsbereich unter `Events`
- [x] Eigene Events ohne Zusagen bleiben in `Events`; relevante fremde Aktivitäten und offene Reaktionen stehen in `Jetzt` vorn
- [x] Wie wird Presence vor Ort dargestellt, ohne creepy oder zu offen zu wirken?
- [ ] Welche Sichtbarkeitsstufen sind wirklich nötig für V1.5 / V2?

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
