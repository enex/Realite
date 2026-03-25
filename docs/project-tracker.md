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
- feinere Sichtbarkeit wie Freunde / Freunde von Freunden / vor Ort sichtbar
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

- [ ] Dashboard neu strukturieren: erst relevante Aktivitäten, dann Vorschläge, dann Smart Meetings, dann eigene Verwaltung
- [ ] Start-/Events-View als "Was geht gerade?"-Ansicht neu denken
- [ ] Smart Meetings auf der Hauptfläche sichtbarer machen
- [ ] klare CTA-Hierarchie definieren: mitmachen, reagieren, erstellen
- [ ] bestehende Hauptviews auf mobile und desktop Informationshierarchie prüfen

### P1

- [ ] Navigation überprüfen: ob `Events`, `Vorschläge`, `Gruppen` die richtige Reihenfolge und Benennung haben
- [ ] unterscheiden zwischen `Entdecken`, `Reagieren`, `Verwalten`
- [ ] visuelle Patterns für offene Aktivitäten, persönliche Vorschläge, eigene Aktivitäten und Smart Meetings definieren
- [ ] Event-/Suggestion-Karten auf Scannability und Priorisierung überarbeiten
- [ ] leere Zustände produktnäher formulieren

### P2

- [ ] explizite Join-Mechaniken modellieren: direkt beitreten, anfragen, Interesse zeigen
- [ ] Sichtbarkeitsmodell erweitern: Freunde, Freunde von Freunden, offen, optional vor Ort sichtbar
- [ ] Presence-/Vor-Ort-Konzept definieren
- [ ] Dating-Use-Case als Unterfall des Relevanzmodells schärfen, nicht als separaten Produktkern

## Konkret bekannte UX-/View-Aufgaben

### Dashboard / Events

- [ ] prüfen, ob `/events` der richtige primäre Einstieg ist
- [ ] prüfen, ob eigene Events zu viel Platz einnehmen
- [ ] Vorschläge mit Handlungsbedarf nach oben ziehen
- [ ] offene Aktivitäten mit vorhandenen Zusagen sichtbarer machen
- [ ] "Wer ist dabei?" prominenter machen
- [ ] Smart Meetings oberhalb oder direkt neben Kerninhalten platzieren

### Suggestions

- [ ] Suggestions stärker als Handlungs-Queue inszenieren
- [ ] Gründe, Relevanz und nächste Aktion schneller erfassbar machen
- [ ] accepted / pending / declined Zustände visueller differenzieren

### Groups

- [ ] Gruppen stärker als Relevanz- und Sichtbarkeitslayer erklären
- [ ] Gruppenverwaltung vom eigentlichen Aktivitätsfluss entkoppeln

### Design System / UI

- [ ] visuelle Prioritätsstufen definieren
- [ ] Typografie- und Spacing-Hierarchie vereinheitlichen
- [ ] Card-System für Aktivitäten, Vorschläge, Presence und Smart Meetings definieren
- [ ] konsistente Statusfarben und Statuslabels definieren

## Product Discovery Tasks

- [ ] gewünschtes ideales Home-Erlebnis in 1 Satz definieren
- [ ] definieren, welche drei Fragen die Startansicht beantworten muss
- [ ] festlegen, welche Objekte produktseitig primär sind: Aktivität, Vorschlag, Presence, Gruppe
- [ ] Presence-/On-Site-Use-Case als opt-in Flow beschreiben
- [ ] Sichtbarkeit und Relevanzmodell als High-Level-Domain-Dokument festhalten

## Entscheidungen offen

- [ ] Soll `Events` wirklich die zentrale Startansicht bleiben oder braucht es eine neue Home-/Now-Ansicht?
- [ ] Sollen Smart Meetings ein eigener Bereich bleiben oder Teil der Hauptaktivitätsansicht werden?
- [ ] Wie sichtbar sollen eigene Events im Vergleich zu relevanten fremden Aktivitäten sein?
- [ ] Wie wird Presence vor Ort dargestellt, ohne creepy oder zu offen zu wirken?
- [ ] Welche Sichtbarkeitsstufen sind wirklich nötig für V1.5 / V2?

## Empfohlene Reihenfolge

1. Dashboard / Startansicht neu priorisieren
2. Hauptnavigation und IA schärfen
3. visuelle Sprache der Kernviews verbessern
4. Join-Modell erweitern
5. Presence-/Vor-Ort-Layer als opt-in Zusatz einführen
6. Trust-/Privacy-Regeln für neue Sichtbarkeit finalisieren

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
