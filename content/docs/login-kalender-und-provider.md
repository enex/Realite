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

Wenn dein Login-Anbieter ein Profilbild liefert, übernimmt Realite es als Startwert, solange du noch kein eigenes Realite-Profilbild gespeichert hast. Ein später hochgeladenes Profilbild wird im konfigurierten S3-kompatiblen Speicher abgelegt und im Realite-Profil gespeichert.

Für einen schnellen ersten Blick gibt es zusätzlich **Ohne Konto starten**. Das ist ein temporärer Gastzugang ohne Google, Apple oder Microsoft. Er verbindet keinen Kalender und keine Kontakte; du solltest später einen echten Login verbinden, wenn du Realite dauerhaft nutzen willst.

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

Den gleichen Unterschied zwischen gemeinsamem Kalender-Kern und provider-spezifischen Extras siehst du auch unter
**Profil & Einstellungen** direkt in der Karte **Kalender-Kern und Provider-Pfade**.

## Gemeinsamer Kalender-Kern

Damit mehrere Kalenderanbieter später anschließen können, behandelt Realite diese drei Bausteine als gemeinsamen Kern aller Kalenderadapter:

1. **Verfügbarkeits- und Timing-Kontext** für Vorschläge und Planung
2. **Kalenderkopien von Realite-Aktivitäten** zurück in deinen verbundenen Kalender
3. **Import relevanter Kalendereignisse nach Realite** als zusätzlicher Planungskontext

Wichtig dabei:

- wenn ein Provider diesen Kern noch nicht technisch anbietet, bleibt Realite trotzdem nutzbar
- dann fällt der Flow auf Realite selbst zurück: Event-Link, Sichtbarkeit, Join-Mechaniken und manuelle Planung
- der Produktkern wird dadurch nicht neu verdrahtet, nur der zusätzliche Kalenderkontext fehlt

## Was bewusst Provider-Capability bleibt

Nicht jede Kalenderfunktion muss bei allen Providern gleich aussehen. Diese Punkte bleiben bewusst an der Provider-Schicht:

- **Kalendereinladungen und Teilnehmerpflege** über den externen Kalender
- **Bearbeiten-im-Kalender-Links** oder Deep-Links zurück in den Quellkalender

Heute heißt das konkret:

- Google trägt beide Pfade bereits
- Apple soll bei fehlender Gleichwertigkeit zuerst sauber auf Event-Link und Realite-Join-Flow zurückfallen
- Microsoft darf Einladungen oder Edit-Links später tiefer integrieren, aber nicht als Produktvoraussetzung erzwingen

## Was heute noch providergebunden ist

Produktlogisch ist Realite schon breiter gedacht. Technisch gibt es heute aber noch Verbindungen, die nicht gleichwertig ausgebaut sind.

Aktuell gilt:

- ein temporärer Gastzugang kann ohne Provider gestartet werden
- Google und Apple können als sichtbare Login-Pfade parallel erscheinen, sobald das jeweilige Deployment beide technisch freigeschaltet hat
- in lokaler Entwicklung gibt es zusätzlich einen dev-only Test-Login
- Kalenderkontext ist heute an Google Kalender angebunden
- Kontakte-Sync ist heute an Google Kontakte angebunden

Wichtig dabei:

- diese Kopplung beschreibt den **aktuellen Technikstand**
- sie definiert **nicht** den eigentlichen Produktkern
- du veröffentlichst dadurch weiterhin nichts automatisch

## Was bewusst noch nicht aktiv ist

Diese Pfade sind im aktuellen Produkt noch **nicht** allgemein freigeschaltet:

- Microsoft Login außerhalb interner Tests
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
