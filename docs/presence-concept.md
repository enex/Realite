# Presence-/Vor-Ort-Konzept

Stand: 26.03.2026

## Ziel

Presence ist in Realite kein eigener sozialer Feed, sondern ein optionaler Zusatzlayer auf einem bestehenden Event.

Das Konzept soll den sekundären Use Case "On-Site-Socializing" ermöglichen, ohne den Produktkern von Aktivitäten, Relevanz und Privatsphäre zu verlassen.

## Produktentscheidung

Presence wird für V1.x wie folgt definiert:

- Presence ist immer an ein konkretes Event oder einen konkreten Ort-/Zeit-Kontext gebunden
- Presence ist niemals global, öffentlich oder eventübergreifend
- Presence ist immer opt-in
- Presence darf nur innerhalb einer bereits erlaubten Event-Sichtbarkeit stattfinden
- Presence ist Relevanz-gestützt, nicht people-first

## Aktueller Implementierungsstand

Heute existiert in der App bereits die Event-Eigenschaft `allowOnSiteVisibility`.

Sie bedeutet:

- Der Event-Ersteller kann pro Event erlauben, dass für dieses Event grundsätzlich freiwillige Vor-Ort-Sichtbarkeit zulässig ist.
- Diese Freigabe ist getrennt von der normalen Event-Sichtbarkeit.
- UI und Nutzer-Doku kommunizieren bereits, dass dabei nichts automatisch geteilt wird.

Noch nicht implementiert ist:

- ein echter "Ich bin jetzt da"-Status
- ein Zeitfenster für Anwesenheit
- eine Liste tatsächlich anwesender Personen
- ein Interaktions-Flow für Vor-Ort-Kontakt

Damit ist der aktuelle Stand bewusst ein Schutz- und Produktmodell, noch kein fertiger Presence-Feed.

## Gewünschter Nutzer-Flow

1. Ein Event existiert bereits.
2. Der Ersteller entscheidet, ob dieses Event freiwillige Vor-Ort-Sichtbarkeit überhaupt erlauben darf.
3. Nur innerhalb dieses Event-Kontexts könnte ein Nutzer später bewusst "ich bin da" oder "für kurze Zeit sichtbar" setzen.
4. Sichtbar würden dann nur Personen, die den Event-Kontext ohnehin sehen dürfen und für die eine relevante soziale Beziehung besteht.

## Was Presence ausdrücklich nicht sein soll

- keine Karte mit frei browsebaren Personen
- kein permanenter Live-Standort
- keine automatische Sichtbarkeit durch Kalender, GPS oder Event-Zusage
- kein stranger-first Dating-Feed
- keine Sichtbarkeit ohne gemeinsamen Event-Anker

## UX-Regeln

- Event zuerst, Presence danach
- Schutzcopy immer explizit formulieren: nichts automatisch teilen
- Presence nur als Zusatzhinweis innerhalb eines Event-Kontexts darstellen
- keine UI, die Nutzer wie "in der Nähe verfügbare Personen" ohne Event-Bezug auflistet
- Dating bleibt nur ein Unterfall derselben Presence- und Relevanzlogik

## Nächste Produkt-/Implementierungsschritte

- expliziten Presence-Status als eigenen Domain-Zustand modellieren
- Zeitfenster und Sichtbarkeitsdauer definieren
- Eventgebundene Darstellung "wer ist gerade da" nur im erlaubten Kontext ergänzen
- low-pressure Interaktion für Presence separat und bewusst formulieren
