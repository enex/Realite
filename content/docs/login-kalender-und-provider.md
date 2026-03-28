# Login, Kalender und Provider

Realite soll echte Aktivitäten leichter machen, nicht einen einzelnen Login- oder Kalenderanbieter in den Mittelpunkt stellen.

Wichtig ist deshalb die Trennung:

- dein **Konto** gibt dir Zugang zu Realite
- dein **Kalenderzugriff** liefert optional mehr Kontext
- ein konkreter **Provider** ist nur die technische Verbindung dahinter

So bleibt der Kernflow verständlich: erst Aktivitäten, Sichtbarkeit und Reaktionen, dann optional zusätzlicher Kontext.

## Was sofort nach dem Login funktioniert

Sobald du in Realite eingeloggt bist, kannst du den Kern des Produkts nutzen:

- Aktivitäten anlegen
- Sichtbarkeit wählen
- Gruppen anlegen und pflegen
- Personen einladen
- Vorschläge beantworten
- Events direkt beitreten, anfragen oder Interesse zeigen
- öffentliche Eventseiten öffnen

Dafür brauchst du **keinen verbundenen Kalender**.

Wenn du Realite bewusst erst ohne Kalender nutzen willst, hilft dir zusätzlich **[Ohne Kalender starten](/docs/ohne-kalender-starten)**.

## Was zusätzlichen Kalenderzugriff braucht

Ein verbundener Kalender erweitert Realite um Planungskontext, ist aber nicht die Voraussetzung für den Kernflow.

Mit aktivem Kalenderzugriff kommen heute vor allem diese Funktionen dazu:

- Verfügbarkeitsabgleich über deine ausgewählten Kalender
- automatische Kalender-Vormerkungen für Vorschläge, wenn du das einschaltest
- Import markierter oder relevanter Kalendertermine nach Realite
- direkte Bearbeiten-im-Kalender-Links aus Realite heraus
- Smart-Treffen-Versand über Kalendereinladungen nach deiner ausdrücklichen Freigabe

Ohne Kalenderzugriff bleiben Events, Gruppen, Sichtbarkeit und Vorschläge weiter nutzbar. Nur dieser zusätzliche Planungskontext fehlt dann.

## Capability-Matrix

Die folgende Übersicht trennt bewusst zwischen Konto, Kalenderzugriff und heutiger technischer Verbindung:

| Produktfunktion | Reines Realite-Konto | Kalenderzugriff nötig | Heutiger Technikstand |
| --- | --- | --- | --- |
| Events anlegen, teilen und verwalten | Ja | Nein | providerunabhängig im Produkt |
| Gruppen, Kontakte im Produkt und Sichtbarkeit pflegen | Ja | Nein | Kontakte-Sync aktuell noch Google-gebunden |
| Vorschläge in Realite beantworten | Ja | Nein | providerunabhängig im Produkt |
| Öffentliche Eventseite ansehen | Nein, nur für Reaktion/Login nötig | Nein | providerunabhängig im Produkt |
| Verfügbarkeit aus Kalendern berücksichtigen | Ja | Ja | aktuell Google Kalender |
| Vorschläge automatisch im Kalender vormerken | Ja | Ja | aktuell Google Kalender |
| Kalendertermine nach Realite übernehmen | Ja | Ja | aktuell Google Kalender |
| Smart-Treffen per Kalendereinladung verschicken | Ja | Ja | aktuell Google Kalender |

## Was heute noch providergebunden ist

Produktlogisch ist Realite schon breiter gedacht. Technisch gibt es heute aber noch Verbindungen, die nicht gleichwertig ausgebaut sind.

Aktuell gilt:

- der sichtbare Standard-Login laeuft heute ueber Google
- in lokaler Entwicklung gibt es zusaetzlich einen dev-only Test-Login
- Kalenderkontext ist heute an Google Kalender angebunden
- Kontakte-Sync ist heute an Google Kontakte angebunden

Wichtig dabei:

- diese Kopplung beschreibt den **aktuellen Technikstand**
- sie definiert **nicht** den eigentlichen Produktkern
- du veröffentlichst dadurch weiterhin nichts automatisch

## Was bewusst noch nicht aktiv ist

Diese Pfade sind im aktuellen Produkt noch **nicht** allgemein freigeschaltet:

- Apple Login ausserhalb interner Tests
- Microsoft Login ausserhalb interner Tests
- Apple Kalender als angebundener Planungskontext
- Microsoft Kalender als angebundener Planungskontext

Solange diese Pfade noch fehlen, bleibt der wichtigste Unterschied:

- der Kernflow in Realite funktioniert schon heute ohne Kalender
- zusätzlicher Verfügbarkeits- und Kalenderkontext kommt derzeit nur über Google

## Woran du deinen aktuellen Zustand erkennst

Unter **Profil & Einstellungen** zeigt Realite den Kalenderstatus bewusst getrennt an:

- **Kalenderzugriff aktiv**
- **Später verbinden**
- **Kalenderzugriff prüfen**

So siehst du direkt, ob gerade nur der optionale Kalenderkontext fehlt oder ob du ihn aktiv neu freigeben musst.

## Was nicht automatisch passiert

Auch mit verbundenem Provider gilt:

- kein automatischer öffentlicher Kalender-Feed
- keine automatische Veröffentlichung deiner Verfügbarkeit
- keine automatische Sichtbarkeit ohne deine Freigabe
- keine Massenansprache an importierte Kontakte

Realite nutzt Verbindungen als Kontext und Hilfsmittel, nicht als automatische Veröffentlichungsschicht.
