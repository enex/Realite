# Platzhalter-QR-Codes

Mit Platzhalter-QR-Codes kannst du QR-Codes einmal drucken und täglich mit einem anderen „Singles hier"-Event verknüpfen – ohne neue Codes drucken zu müssen.

## Wofür sind Platzhalter-QR-Codes?

Jemanden ansprechen, ohne zu wissen, ob sie offen dafür sind – das ist oft das eigentliche Problem. Platzhalter-QR-Codes lösen das: Du verteilst sie an einem Ort (Aufkleber, Flyer, Tischkarte) und wer den Code scannt, landet direkt auf der lokalen „Singles hier"-Seite – wo Leute bewusst sichtbar machen, dass sie ansprechbar sind.

**Beispiel:** Du klebst einen QR-Code an eine Bar-Theke. Heute zeigt er auf dein aktuelles Singles-Event, morgen auf ein anderes. Wer scannt, sieht wer dort gerade auch offen ist.

## Wie funktioniert es?

1. Gehe zu **Meine QR-Codes** unter `/q`.
2. Erstelle einen neuen QR-Code mit „Neuer QR-Code".
3. Vergib optional eine Bezeichnung, damit du den Code wiedererkennen kannst (z. B. Standort oder Charge).
4. Drucke den Code über „QR-Code drucken".
5. Verteile die Ausdrucke – physisch, als Aufkleber, auf Flyern etc.
6. Gehe jederzeit auf „Verwalten" und verknüpfe den Code mit einem deiner Singles-hier-Events.
7. Wer danach scannt, landet direkt auf der Event-Seite.

## Was passiert beim Scan?

| Situation | Was der Scanner sieht |
|---|---|
| Singles-Event verknüpft | Weiterleitung zur Singles-hier-Seite |
| Kein Event verknüpft, nicht eingeloggt | Weiterleitung zur Startseite |
| Kein Event verknüpft, eingeloggt | Verwalten-Seite (oder Beanspruchen-Dialog) |

## QR-Code beanspruchen

Wenn ein QR-Code noch niemandem gehört und gerade kein Event verknüpft ist, kann die erste eingeloggte Person ihn beanspruchen. Sie wird dann Admin und kann den Code verwalten.

Das ist nützlich, wenn du Codes vordrucken oder verteilen möchtest, bevor du sie in Realite anlegst.

## Event verknüpfen oder trennen

Auf der Verwalten-Seite (`/q/{code}/manage`) kannst du:

- **Event verknüpfen:** Wähle eines deiner Singles-hier-Events aus und klicke „Verknüpfen".
- **Event trennen:** Klicke auf „Trennen", um die Verknüpfung zu lösen. Scans landen danach wieder auf der Startseite.
- **Bezeichnung vergeben:** Ein interner Name, der dir bei der Verwaltung hilft.

Du brauchst mindestens ein [Event](/events/new), um einen QR-Code zu verknüpfen.

## QR-Code drucken

Über „QR-Code drucken" öffnet sich ein QR- und Poster-Studio.

Du kannst dort:

- zwischen **Sticker-Bogen**, **Poster** und **A4-Poster (vollflächig zum Aushängen)** wechseln
- das Papierformat wählen (DIN A4 oder DIN A3; Vollbild-Poster ist DIN A4)
- mehrere Stil- und Textvarianten auswählen oder eigene Texte eintragen

Die Varianten helfen beim richtigen Erwartungsabgleich vor Ort, z. B. ob jemand eher für Dating oder eher für Social offen ist. Beim Scan sieht man nur Personen, die sich bewusst eingecheckt haben und im Moment sichtbar sind.

Jede Stilvariante hängt nur eine kurze Kennung wie `?s=a`, `?s=b` oder `?s=l` an die Scan-URL an. Der Code zeigt beim Scan immer auf die aktuelle Verknüpfung – nicht auf ein fest gedrucktes Ziel.

## QR-Code löschen

Auf der Verwalten-Seite gibt es am Ende einen „QR-Code löschen"-Button. Nach einer Bestätigung wird der Code dauerhaft entfernt. Bestehende Ausdrucke leiten danach auf die Startseite weiter.

## Sichtbarkeit und Datenschutz

- Platzhalter-QR-Codes zeigen keine persönlichen Informationen.
- Wer den Code scannt, sieht nur die verknüpfte Singles-hier-Seite – oder die Startseite.
- Es wird nicht gespeichert, wer einen Code scannt.
