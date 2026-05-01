# Singles-hier Experiment

## Worum es geht

Das Singles-hier Experiment ist eine einfache Event-Unterseite für Orte, an denen Menschen bereits physisch anwesend sind.

Eine Person legt ein Event mit eindeutigem Slug an. Realite erzeugt daraus eine URL und einen QR-Code. Wer den Code scannt, kommt auf dieselbe Eventseite.

Unter `/singles/<slug>/qr` gibt es zusätzlich eine Druckvorlage. Dort kannst du einstellen, wie viele QR-Codes nebeneinander und insgesamt auf dem Blatt stehen. Die Vorlage ist zum Ausdrucken und Ausschneiden gedacht; die einzelnen Codes verweisen weiterhin nur auf dieselbe `/singles/<slug>`-Eventseite. Der Pitch auf dem Schnipsel macht den Mehrwert klar: scannen, bewusst einchecken und nur gegenseitig passende Personen vor Ort sehen.

## Was Teilnehmende tun

1. Event-QR-Code scannen.
2. Anmelden.
3. Zuerst Name, Bild und Single-Infos ausfüllen.
4. Bewusst **Ich bin hier** wählen.
5. Die Seite zeigt passende andere Personen, die ebenfalls eingecheckt sind.

Passend bedeutet hier: Beide Dating-Profile akzeptieren gegenseitig Geschlecht und Altersbereich.

Erst nach dem gespeicherten Profil zeigt Realite die Vor-Ort-Ansicht mit passenden Personen. Darunter steht der QR-Code mit dem Hinweis, dass du damit weitere Personen aus deiner Gruppe oder vor Ort auf dieselbe Eventseite einladen kannst.

Wenn dein Profil gespeichert ist, bleibt es über den Profil-Button oben auf der Seite bearbeitbar. Das Formular steht dann nicht dauerhaft im Mittelpunkt.

Das Profilbild lädst du über eine gut sichtbare Fläche hoch — per Tipp oder indem du ein Bild dort ablegst. Am Handy kannst du dafür oft direkt ein Selfie aufnehmen oder ein Foto aus der Galerie wählen und den Ausschnitt noch anpassen. So können andere dich vor Ort leichter wiedererkennen. Nach dem Hochladen speicherst du dein Profil; passende eingecheckte Personen sehen dann dieses Bild. Wenn du dich über Google anmeldest und noch kein eigenes Realite-Profilbild gespeichert hast, übernimmt Realite zunächst das Google-Profilbild.

Die Druckvorlage erreichst du aus diesem QR-Bereich über **Druckvorlage öffnen**.

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
- ein vollständiges Single-Profil gespeichert haben
- gegenseitig zu deinen Suchangaben passen

Damit bleibt Presence ein ausdrücklicher Event-Check-in und kein allgemeines People-Browsing.
