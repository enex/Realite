# Konzept zur Verwaltung von Wiederholungsevents

1. SeriesID

- Jedes Ereignis mit einer Wiederholungsregel erhält eine eindeutige seriesID.
- Diese seriesID bleibt konstant, auch wenn das Ereignis gesplittet wird.

2. Eindeutige Instanz-IDs

- Instanz-IDs werden aus der seriesID und spezifischen Attributen wie Datum und optional Ort abgeleitet.
- Verwende uuidv5, um diese IDs zu generieren.

3. Datenbankstruktur

- Speichere nur die ursprüngliche Serie und materialisiere Instanzen nur bei Bedarf (z. B. bei Änderungen).
- Jedes Ereignis enthält ein Feld, das auf die seriesID verweist.

4. Abfrage und Verarbeitung

- Suche nach Ereignissen, die den relevanten Zeitraum überlappen.
- Materialisiere Wiederholungen bei der Abfrage, um sie anzuzeigen oder zu bearbeiten.

5. Änderungen und Splits

- Bei Änderungen an einzelnen Instanzen bleibt die seriesID erhalten.
- Bei Splits erstelle neue Serien für zukünftige Instanzen, behalte jedoch die seriesID zur Nachverfolgbarkeit bei.

6. Ersetzen von Instanzen

- Wenn eine geänderte Instanz wieder der ursprünglichen Serie entspricht, ersetze sie, um Redundanz zu vermeiden.

## Berechnung der UUIDv5 für Wiederholungsevents

Namespace

- Verwende einen festen Namespace-UUID, der spezifisch für dein System ist.

Basis für UUIDv5

- SeriesID: Die eindeutige ID der Serie.
- Datum/Zeit: Das spezifische Datum und die Uhrzeit der Instanz.
- Ort (optional): Wenn relevant, füge den Ort als zusätzlichen Faktor hinzu.

Kombination

- Kombiniere die seriesID, das Datum/Zeit und optional den Ort zu einem String.
- Beispiel: seriesID + "-" + datum + "-" + uhrzeit + "-" + ort.

UUIDv5-Generierung

- Verwende die kombinierte Zeichenkette und den festen Namespace, um die UUIDv5 zu generieren.

Dieses Konzept ermöglicht eine effiziente und flexible Verwaltung von wiederkehrenden Ereignissen mit klarer Identifizierung und einfacher Nachverfolgbarkeit.
