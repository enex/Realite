# App Links / Digital Asset Links

Diese Dateien ermöglichen, dass Links zu `https://realite.app/share/*` direkt in der App geöffnet werden (Android App Links, iOS Universal Links).

## Vor dem Go-Live

### 1. Android: `assetlinks.json`

- **SHA256-Fingerprint eintragen:** In `assetlinks.json` den Platzhalter `REPLACE_WITH_SHA256_FINGERPRINT` ersetzen.
- **Fingerprint ermitteln:**
  - Mit EAS Build: `eas credentials -p android` → Build-Profil wählen → Wert unter „SHA256 Fingerprint“ kopieren.
  - Oder in der [Google Play Console](https://play.google.com/console/): Release → Setup → App Signing → „Digital Asset Links“-Snippet verwenden.
- Format: Doppelpunkte getrennt, z. B. `14:6D:E9:83:51:7F:66:01:84:93:4F:2F:5E:E0:8F:3A:D6:F4:CA:41:1A:CF:45:BF:8D:10:76:76:CD`
- Mehrere Fingerprints (z. B. Debug + Release) als weiteres Array-Element in `sha256_cert_fingerprints` eintragen.

### 2. iOS: `apple-app-site-association`

- **Apple Team ID eintragen:** In `apple-app-site-association` alle Vorkommen von `REPLACE_WITH_APPLE_TEAM_ID` durch deine [Apple Team ID](https://expo.fyi/apple-team) ersetzen (z. B. `QQ57RJ5UTD`).
- Keine Dateiendung; wird unter `https://realite.app/.well-known/apple-app-site-association` ausgeliefert.

## Prüfen

- **Android:** https://realite.app/.well-known/assetlinks.json im Browser aufrufen → JSON mit korrektem Fingerprint.
- **iOS:** https://realite.app/.well-known/apple-app-site-association aufrufen oder [Branch AASA Validator](https://branch.io/resources/aasa-validator/) nutzen.
- Nach Änderungen: App neu installieren bzw. Update ausliefern, damit OS die Zuordnung neu prüft.
