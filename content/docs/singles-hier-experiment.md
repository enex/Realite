# Singles-hier Experiment

## Worum es geht

Das Singles-hier Experiment ist eine einfache Event-Unterseite für Orte, an denen Menschen bereits physisch anwesend sind.

Eine Person legt ein Event mit eindeutigem Slug an. Realite erzeugt daraus eine URL und einen QR-Code. Wer den Code scannt, kommt auf dieselbe Eventseite.

## Was Teilnehmende tun

1. Event-QR-Code scannen.
2. Anmelden.
3. Name, Bild und Single-Infos ausfuellen.
4. Bewusst **Ich bin hier** wählen.
5. Die Seite zeigt passende andere Personen, die ebenfalls eingecheckt sind.

Passend bedeutet hier: Beide Dating-Profile akzeptieren gegenseitig Geschlecht und Altersbereich.

## Was nicht automatisch passiert

- Der Scan macht dich nicht automatisch sichtbar.
- Dein Standort wird nicht live geteilt.
- Andere sehen dich erst, wenn du **Ich bin hier** wählst.
- Deine Sichtbarkeit endet mit dem gewählten Zeitfenster oder spätestens mit dem Eventende.
- Wenn du **Nicht mehr da** wählst, verschwindest du aus der Vor-Ort-Liste.

## Wer Events erstellen kann

Nur angemeldete Nutzer können unter `/singles/new` ein Experiment-Event anlegen.

Beim Erstellen werden vorhandene Realite-Event-Strukturen genutzt:

- Event
- eindeutiger Slug
- Vor-Ort-Sichtbarkeit
- Dating-Profil
- QR-Code für die Event-URL

## Datenschutz und Sichtbarkeit

Das Experiment bleibt an ein konkretes Event gebunden. Realite zeigt keine offene Personenliste. Sichtbar werden nur Personen, die:

- für dieses Event aktiv eingecheckt sind
- ein vollstaendiges Single-Profil gespeichert haben
- gegenseitig zu deinen Suchangaben passen

Damit bleibt Presence ein ausdruecklicher Event-Check-in und kein allgemeines People-Browsing.
