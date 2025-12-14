# Screenshot Generator

Dieses Verzeichnis enthält die Screenshots für Apple App Store und Google Play Store.

## Verwendung

### Option 1: Automatische Screenshots von der Web-App (Empfohlen)

1. **Starte die Web-App** (in einem separaten Terminal):

   ```bash
   bun run web
   ```

2. **Erstelle automatisch Screenshots**:

   ```bash
   bun run screenshots:capture
   ```

   Dies erstellt Screenshots von verschiedenen Screens direkt in allen benötigten App Store Größen (Apple & Google) und speichert sie in `screenshots/source/`.

   **Hinweis**: Die Screenshots werden bereits in den exakten Größen erstellt, die für Apple App Store und Google Play Store benötigt werden. Keine weitere Konvertierung nötig!

### Option 2: Manuelle Screenshots

1. **Quell-Screenshots erstellen**

   Erstelle deine Screenshots (z.B. manuell im Simulator/Emulator oder mit einem Tool) und speichere sie in `screenshots/source/`.

   **Tipps:**
   - Verwende hochauflösende Screenshots (mindestens 1080p)
   - Screenshots sollten das App-Interface ohne Rahmen zeigen
   - PNG oder JPEG Format

2. **Screenshots generieren**

   Führe das Script aus:

   ```bash
   bun run screenshots
   ```

   Das Script konvertiert automatisch alle Screenshots aus `screenshots/source/` in alle benötigten Größen für:
   - **Apple App Store**: iPhone 6.9", iPhone 6.5", iPad 13", iPad 12.9" (Portrait & Landscape)
   - **Google Play Store**: Phone HD/FHD, Tablet 7"/10" (Portrait & Landscape)

### 3. Ausgabe

Die konvertierten Screenshots werden in folgenden Verzeichnissen gespeichert:

- `screenshots/apple/` - Apple App Store Screenshots
- `screenshots/google/` - Google Play Store Screenshots

## Generierte Größen

### Apple App Store

- **iPhone 6.9"** (neueste Modelle)
  - Portrait: 1290 x 2796 px
  - Landscape: 2796 x 1290 px

- **iPhone 6.5"** (ältere Modelle)
  - Portrait: 1242 x 2688 px
  - Landscape: 2688 x 1242 px

- **iPad 13"** (neueste Modelle)
  - Portrait: 2064 x 2752 px
  - Landscape: 2752 x 2064 px

- **iPad 12.9"** (iPad Pro 2nd gen)
  - Portrait: 2048 x 2732 px
  - Landscape: 2732 x 2048 px

### Google Play Store

- **Phone**
  - Portrait HD: 1080 x 1920 px
  - Portrait FHD: 1440 x 2560 px
  - Landscape HD: 1920 x 1080 px
  - Landscape FHD: 2560 x 1440 px

- **Tablet 7"**
  - Portrait: 1920 x 2560 px
  - Landscape: 2560 x 1920 px

- **Tablet 10"**
  - Portrait: 2560 x 3840 px
  - Landscape: 3840 x 2560 px

## Dateinamen

Die generierten Screenshots folgen diesem Muster:

```
<original-name>_<size-key>.png
```

Beispiel: `home_iphone-6.9-portrait.png`

## Verfügbare Scripts

- `bun run screenshots:capture` - Erstellt automatisch Screenshots von der Web-App in allen benötigten App Store Größen
- `bun run screenshots` - Konvertiert manuelle Quell-Screenshots in alle App Store Größen (nur wenn manuelle Screenshots verwendet werden)

## Hinweise

- Das Script verwendet `sharp` für die Bildverarbeitung
- Screenshots werden mit weißem Hintergrund skaliert (fit: contain)
- Alle Screenshots werden als PNG exportiert
- Die Quell-Screenshots bleiben unverändert
- Für automatische Screenshots wird Playwright verwendet (Chromium Browser)
- Die Web-App muss auf `http://localhost:8081` laufen (oder setze `WEB_URL` Umgebungsvariable)


