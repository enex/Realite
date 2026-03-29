# Sichtbarkeit und Relevanz

## Worum es geht

Realite soll echte Aktivitäten leichter koordinierbar machen, ohne Menschen oder Kalenderdaten unnötig offenzulegen.

Darum trennt Realite zwei Dinge sehr bewusst:

- **Relevanz:** Warum ist eine Aktivität für dich überhaupt interessant?
- **Sichtbarkeit:** Wer darf diese Aktivität oder einen Zusatzstatus sehen?

Beides hängt zusammen, ist aber nicht dasselbe.

## Das Grundmodell

Realite denkt jede Aktivität in fünf Schritten:

1. **Aktivität:** Was ist das konkrete Vorhaben?
2. **Kontext:** Welche privaten Signale helfen bei der Einordnung?
3. **Sichtbarkeit:** Wer darf die Aktivität sehen?
4. **Aktion:** Wie kann jemand reagieren oder mitmachen?
5. **Lernen:** Was verbessert spätere Vorschläge?

So bleibt der Kern immer dieselbe Frage: Wer soll bei welcher echten Aktivität zusammenkommen?

## Was Relevanz bedeutet

Relevanz entscheidet, warum Realite dir etwas bevorzugt zeigt oder vorschlägt.

Dabei nutzt Realite heute vor allem:

- deine Kontakte und Gruppen
- vorhandene Hashtags und Interessen-Signale
- deine Verfügbarkeit aus dem Kalender
- bisherige Zu- und Absagen
- bei `#date` zusätzlich gegenseitige Passung als geschützten Sonderfall

Wichtig:

- Relevanz ist zuerst ein internes Sortier- und Matching-Signal.
- Relevanz bedeutet nicht automatisch Sichtbarkeit.
- Kalender und Kontakte dienen als Kontext, nicht als automatische Veröffentlichung.

## Was Sichtbarkeit bedeutet

Sichtbarkeit entscheidet, wer eine Aktivität überhaupt sehen darf.

Realite nutzt dafür aktuell diese Stufen:

- **Privat oder nur Gruppe:** nur ein klar begrenzter Kreis
- **Freunde:** deine registrierten Kontakte
- **Freunde von Freunden:** dein erweiterter sozialer Kontext
- **Offen:** sichtbar für alle sichtbaren Nutzer in Realite

## Welche Stufen Realite bewusst klein hält

Für normale Events reicht Realite aktuell bewusst ein kompaktes Modell mit vier Standardstufen:

1. **Nur Gruppe**
2. **Freunde**
3. **Freunde von Freunden**
4. **Öffentlich**

Diese vier Stufen sind der Kern für V1.5:

- sie decken private Planung, bestehende Kontakte, erweiterten sozialen Kontext und offene Aktivitäten ab
- sie bleiben für Nutzer nachvollziehbar
- sie vermeiden eine wachsende Liste aus halb ähnlichen Freigaben

Realite führt deshalb aktuell **keine weiteren Standardstufen** wie „nur Kontakte ohne Gruppe“, „nur gleiche Stadt“, „nur gemeinsame Interessen“ oder ähnliche Zwischenmodelle ein.

## Was für V2 separat bleibt

Einige Fälle brauchen mehr Schutz, aber keine neue Standard-Sichtbarkeitsstufe:

- **`#date`** bleibt ein geschützter Sonderfall für konkrete Aktivitäten mit gegenseitiger Passung
- **Vor-Ort-Sichtbarkeit** bleibt ein zusätzlicher Opt-in-Layer pro Event
- weitere Spezialfälle sollen, wenn überhaupt, als klar benannte Zusatzregeln entstehen und nicht als immer feinere allgemeine Sichtbarkeitsleiter

Für spätere Festival- und On-Site-Fälle gelten dieselben Leitplanken:
**[Sicherheit bei Vor-Ort- und Festival-Kontexten](/docs/sicherheit-bei-vor-ort-und-festival-kontexten)**.

Damit bleibt das Basismodell klein, während sensible Kontexte trotzdem eigene Schutzlogik bekommen.

Zusätzlich gibt es optionale Schutzlayer:

- **Mitmach-Modus:** sichtbar Berechtigte können direkt beitreten, anfragen oder nur Interesse zeigen
- **Vor-Ort-Sichtbarkeit:** nur pro Event, nur wenn erlaubt und nur mit bewusstem Check-in

Wichtig:

- Nichts wird automatisch weiter geöffnet.
- Sichtbarkeit ist immer an eine konkrete Aktivität gebunden.
- Ein sichtbares Event macht dich nicht automatisch vor Ort sichtbar.

## Wie Gruppen und Kontakte dabei helfen

Gruppen und Kontakte sind in Realite kein eigener Feed. Sie helfen bei zwei Fragen:

1. Welche Personen oder Kreise sind für eine Aktivität zuerst relevant?
2. Für wen soll die Aktivität sichtbar sein?

Darum gehören Gruppen in Realite zum Verwaltungs- und Kontroll-Layer, nicht zum Hauptfluss aus **Jetzt**, **Vorschläge** und **Events**.

## Sonderfall `#date`

`#date` ist kein eigener Produktkern und kein offener Personenkatalog.

Der Tag ist nur ein zusätzlicher Schutz- und Relevanzfilter für konkrete Aktivitäten:

- Sichtbarkeit bleibt an eine Aktivität gebunden
- Relevanz basiert zusätzlich auf gegenseitiger Passung
- der Mitmach-Modus bleibt bewusst low-pressure
- es gibt keine automatische öffentliche Profilveröffentlichung

So bleibt Dating ein Unterfall derselben Realite-Logik statt einer separaten Stranger-App.

## Was nicht automatisch passiert

Realite macht ausdrücklich **nicht**:

- automatische Veröffentlichung deines Kalenders
- automatisches Anschreiben von Kontakten
- offene People-Discovery ohne gemeinsamen Event-Kontext
- automatische Vor-Ort-Sichtbarkeit
- automatische Freigabe sensibler Interessen

Wenn Realite Kontext nutzt, dann zuerst zur Einordnung und erst danach nur mit deiner bewussten Freigabe zur Sichtbarkeit.

## Kurz gesagt

**Relevanz entscheidet, was für dich sinnvoll ist. Sichtbarkeit entscheidet, wer es sehen darf. Realite trennt beides, damit spontane Koordination nützlich bleibt, ohne überraschend offen zu werden.**
