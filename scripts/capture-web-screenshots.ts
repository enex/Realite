#!/usr/bin/env bun

/**
 * Automatischer Screenshot-Capture von der Web-Version der App
 *
 * Das Script meldet sich automatisch mit Demo-Nutzer-Daten an und erstellt
 * Screenshots von den eingeloggten Screens.
 *
 * Verwendung:
 * 1. Starte die Web-App: `bun run web` (in einem separaten Terminal)
 * 2. Führe aus: `bun run scripts/capture-web-screenshots.ts`
 * 3. Screenshots werden in `screenshots/source/` gespeichert
 * 4. Führe dann `bun run screenshots` aus, um alle Größen zu generieren
 */

import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { chromium, type Browser, type Page } from "playwright";

const BASE_URL = process.env.WEB_URL || "http://localhost:8081";
const SOURCE_DIR = join(process.cwd(), "screenshots", "source");
const WAIT_TIME = 2000; // Wartezeit nach Navigation (ms)

// Demo-Nutzer für Anmeldung
const DEMO_PHONE = "+49 555 1111111";
const DEMO_CODE = "123456";

// Screenshots, die erstellt werden sollen (nach Anmeldung)
const SCREENSHOT_ROUTES = [
  { path: "/", name: "tabs-home" }, // Home Tab nach Login
  { path: "/explore", name: "tabs-explore" }, // Explore Tab
  { path: "/profile", name: "tabs-profile" }, // Profile Tab
];

// Direkt die benötigten App Store Screenshot-Größen (nur Portrait)
const APPLE_SCREENSHOT_SIZES = [
  // iPhone 6.9" (neueste Modelle - iPhone 16 Pro Max, iPhone 16 Plus)
  { width: 1290, height: 2796, name: "iphone-6.9-portrait" },

  // iPhone 6.5" (ältere Modelle - iPhone 14 Plus, iPhone 13 Pro Max)
  { width: 1242, height: 2688, name: "iphone-6.5-portrait" },

  // iPad 13" (neueste Modelle - iPad Pro M5, M4)
  { width: 2064, height: 2752, name: "ipad-13-portrait" },

  // iPad 12.9" (iPad Pro 2nd generation)
  { width: 2048, height: 2732, name: "ipad-12.9-portrait" },
];

const GOOGLE_SCREENSHOT_SIZES = [
  // Phone Screenshots
  { width: 1080, height: 1920, name: "phone-portrait-hd" },
  { width: 1440, height: 2560, name: "phone-portrait-fhd" },

  // Tablet Screenshots
  { width: 1920, height: 2560, name: "tablet-7-portrait" },
  { width: 2560, height: 3840, name: "tablet-10-portrait" },
];

/**
 * Erstellt ein Verzeichnis, falls es nicht existiert
 */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`✓ Verzeichnis erstellt: ${dir}`);
  }
}

/**
 * Wartet, bis die Seite vollständig geladen ist
 */
async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(WAIT_TIME);
}

/**
 * Meldet sich mit Demo-Nutzer-Daten an
 */
async function loginWithDemoUser(page: Page): Promise<void> {
  // Prüfe, ob bereits eingeloggt
  const currentUrl = page.url();
  if (currentUrl.includes("/(tabs)") || currentUrl === BASE_URL + "/") {
    // Prüfe, ob wir wirklich eingeloggt sind (keine Weiterleitung zu auth)
    await page.waitForTimeout(1000);
    const finalUrl = page.url();
    if (!finalUrl.includes("/auth")) {
      console.log("  ✓ Bereits angemeldet");
      return;
    }
  }

  console.log("  🔐 Melde mich mit Demo-Nutzer an...");

  // Gehe zur Phone-Auth-Seite
  await page.goto(`${BASE_URL}/auth/phone`, { waitUntil: "networkidle" });
  await waitForPageLoad(page);

  // Warte auf das Telefonnummer-Input-Feld
  const phoneInput = page
    .locator(
      'input[placeholder*="Telefonnummer"], input[type="tel"], input[type="text"]'
    )
    .first();
  await phoneInput.waitFor({ timeout: 10000 });
  await phoneInput.fill(DEMO_PHONE);
  await page.waitForTimeout(1000);

  // Akzeptiere die Datenschutzerklärung (Checkbox)
  // Die Checkbox hat jetzt testID="privacy-checkbox" für einfacheres Finden
  try {
    await page.waitForTimeout(1000);

    // Versuche zuerst über testID (wird zu data-testid im Web)
    const checkboxByTestId = page.locator('[data-testid="privacy-checkbox"]');

    if ((await checkboxByTestId.count()) > 0) {
      // Prüfe, ob bereits aktiviert
      const text = await checkboxByTestId.textContent();
      if (!text?.includes("✓")) {
        await checkboxByTestId.click();
        await page.waitForTimeout(1000);
      }
    } else {
      // Fallback: Suche über accessibilityLabel
      const checkboxByLabel = page.locator('[aria-label*="Datenschutz"]');
      if ((await checkboxByLabel.count()) > 0) {
        await checkboxByLabel.click();
        await page.waitForTimeout(1000);
      } else {
        // Fallback: Suche nach Element mit h-6 w-6 im flex-row Container
        const fallbackCheckbox = page
          .locator('[class*="h-6"][class*="w-6"]')
          .first();
        if ((await fallbackCheckbox.count()) > 0) {
          await fallbackCheckbox.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  } catch (error) {
    console.log(
      "  ⚠️ Checkbox nicht gefunden, versuche trotzdem fortzufahren..."
    );
  }

  // Klicke auf "Code senden"
  // Versuche zuerst über testID
  let sendCodeButton = page.locator('[data-testid="send-code-button"]');

  if ((await sendCodeButton.count()) === 0) {
    // Fallback: Suche über accessibilityLabel
    sendCodeButton = page.locator('[aria-label*="Code senden"]');
  }

  if ((await sendCodeButton.count()) === 0) {
    // Fallback: Suche über Text
    sendCodeButton = page
      .locator('button:has-text("Code senden"), button:has-text("Code")')
      .first();
  }

  // Warte auf den Button und prüfe, ob er enabled ist
  await sendCodeButton.waitFor({ timeout: 10000, state: "visible" });

  // Prüfe, ob der Button disabled ist
  const isDisabled = await sendCodeButton.isDisabled();
  if (isDisabled) {
    console.log(
      "  ⚠️ Button ist disabled, prüfe Checkbox und Telefonnummer..."
    );
    // Prüfe nochmal die Checkbox
    const checkbox = page.locator('[data-testid="privacy-checkbox"]');
    if ((await checkbox.count()) > 0) {
      const checkboxText = await checkbox.textContent();
      if (!checkboxText?.includes("✓")) {
        console.log("  🔄 Checkbox nicht aktiviert, klicke erneut...");
        await checkbox.click();
        await page.waitForTimeout(1000);
      }
    }
    // Prüfe nochmal die Telefonnummer
    const phoneInput = page
      .locator('input[type="tel"], input[type="text"]')
      .first();
    const phoneValue = await phoneInput.inputValue();
    if (!phoneValue || phoneValue !== DEMO_PHONE) {
      console.log("  🔄 Telefonnummer prüfen...");
      await phoneInput.fill(DEMO_PHONE);
      await page.waitForTimeout(500);
    }
  }

  await sendCodeButton.click();
  console.log("  ✓ Code-Anfrage gesendet, warte auf Weiterleitung...");

  // Warte auf Weiterleitung zur Verify-Seite
  try {
    await page.waitForURL(/.*\/auth\/verify.*/, { timeout: 15000 });
    console.log("  ✓ Weiterleitung zur Verify-Seite erfolgreich");
  } catch (error) {
    console.log("  ⚠️ Weiterleitung dauert länger als erwartet...");
    // Prüfe die aktuelle URL
    const redirectUrl = page.url();
    console.log(`  📍 Aktuelle URL: ${redirectUrl}`);
  }

  await page.waitForTimeout(2000); // Zusätzliche Wartezeit

  // Warte auf die Verify-Seite und gib den Code ein
  // Prüfe, ob wir bereits auf der Verify-Seite sind
  const verifyUrl = page.url();
  if (!verifyUrl.includes("/auth/verify")) {
    await page.waitForURL(/.*\/auth\/verify.*/, { timeout: 15000 });
  }

  await waitForPageLoad(page);
  console.log("  📍 Auf Verify-Seite angekommen");

  // Finde das Code-Input-Feld
  let codeInput = page.locator('[data-testid="verify-code-input"]');
  if ((await codeInput.count()) === 0) {
    codeInput = page
      .locator(
        'input[placeholder*="code"], input[type="text"], input[type="number"], input[type="tel"]'
      )
      .first();
  }

  await codeInput.waitFor({ timeout: 15000, state: "visible" });
  console.log("  ✓ Code-Input gefunden");

  await codeInput.fill(DEMO_CODE);
  await page.waitForTimeout(1500); // Warte etwas länger, damit der Code gesetzt wird

  // Klicke auf "Verify Code"
  // Versuche zuerst über testID
  let verifyButton = page.locator('[data-testid="verify-code-button"]');

  if ((await verifyButton.count()) === 0) {
    // Fallback: Suche über accessibilityLabel
    verifyButton = page.locator(
      '[aria-label*="Code verifizieren"], [aria-label*="Verify"]'
    );
  }

  if ((await verifyButton.count()) === 0) {
    // Fallback: Suche über Text
    verifyButton = page
      .locator('button:has-text("Verify"), button:has-text("Verifizieren")')
      .first();
  }

  // Warte auf den Button
  await verifyButton.waitFor({ timeout: 15000, state: "visible" });
  console.log("  ✓ Verify-Button gefunden");
  await verifyButton.click();
  console.log("  ✓ Verify-Button geklickt");

  // Warte auf erfolgreiche Anmeldung (Weiterleitung zu Tabs)
  await page.waitForURL(/.*\/(tabs|$)/, { timeout: 15000 });
  await waitForPageLoad(page);

  console.log("  ✅ Erfolgreich angemeldet!");
}

/**
 * Erstellt Screenshots für eine Route in allen benötigten App Store Größen
 */
async function captureScreenshotsForRoute(
  browser: Browser,
  route: { path: string; name: string },
  isAuthenticated: boolean = false,
  savedStorageState?: any
): Promise<any> {
  console.log(`\n📸 Erstelle Screenshots für: ${route.path}`);

  let storageState = savedStorageState;
  const allSizes = [...APPLE_SCREENSHOT_SIZES, ...GOOGLE_SCREENSHOT_SIZES];

  for (const size of allSizes) {
    // Die Screenshot-Größen sind physische Pixel, nicht logische Viewport-Größen
    // Verwende einen realistischen Viewport und skaliere dann auf die Zielgröße

    // Bestimme einen realistischen Basis-Viewport basierend auf dem Gerätetyp
    let baseViewport = { width: 390, height: 844 }; // iPhone 14 Pro (Standard)

    if (size.name.includes("ipad")) {
      baseViewport = { width: 768, height: 1024 }; // iPad Standard
    } else if (size.name.includes("tablet")) {
      baseViewport = { width: 600, height: 960 }; // Tablet Standard
    }

    // Berechne das Seitenverhältnis der Zielgröße
    const targetAspectRatio = size.width / size.height;
    const baseAspectRatio = baseViewport.width / baseViewport.height;

    // Passe den Viewport an das Seitenverhältnis an, behalte aber realistische Größen
    let viewportWidth = baseViewport.width;
    let viewportHeight = baseViewport.height;

    if (targetAspectRatio > baseAspectRatio) {
      // Breiteres Format (Landscape) - passe Höhe an
      viewportHeight = Math.round(viewportWidth / targetAspectRatio);
    } else {
      // Höheres Format (Portrait) - passe Breite an
      viewportWidth = Math.round(viewportHeight * targetAspectRatio);
    }

    // Berechne deviceScaleFactor basierend auf dem Verhältnis zwischen Zielgröße und Viewport
    // Das sorgt für scharfe Screenshots ohne Verpixelung
    const scaleFactor = Math.max(
      2,
      Math.ceil(
        Math.max(size.width / viewportWidth, size.height / viewportHeight)
      )
    );

    const context = await browser.newContext({
      viewport: { width: viewportWidth, height: viewportHeight },
      deviceScaleFactor: scaleFactor, // Höhere Auflösung für bessere Qualität
      storageState: storageState,
    });

    const page = await context.newPage();

    try {
      // Wenn authentifiziert, melde dich zuerst an (nur beim ersten Screenshot)
      if (isAuthenticated && !storageState) {
        await loginWithDemoUser(page);
        // Speichere die Session für weitere Screenshots
        storageState = await context.storageState();
      }

      const url = `${BASE_URL}${route.path}`;
      console.log(
        `  → ${size.name} (${size.width}x${size.height}, viewport: ${viewportWidth}x${viewportHeight}, scale: ${scaleFactor}x)`
      );

      await page.goto(url, { waitUntil: "networkidle" });
      await waitForPageLoad(page);

      // Screenshot machen und auf Zielgröße skalieren
      const filename = `${route.name}_${size.name}.png`;
      const filepath = join(SOURCE_DIR, filename);

      const screenshotBuffer = await page.screenshot({
        fullPage: true,
      });

      // Skaliere auf die exakte Zielgröße mit sharp
      // Mit deviceScaleFactor ist das Screenshot bereits höher aufgelöst
      const sharp = (await import("sharp")).default;
      await sharp(screenshotBuffer)
        .resize(size.width, size.height, {
          fit: "cover", // Fülle die gesamte Fläche
          position: "center",
          kernel: "lanczos3", // Bessere Interpolation für schärfere Bilder
        })
        .png()
        .toFile(filepath);

      console.log(`    ✓ Gespeichert: ${filename}`);
    } catch (error) {
      console.error(
        `    ❌ Fehler bei ${route.path} (${size.name}):`,
        error instanceof Error ? error.message : error
      );
    } finally {
      await context.close();
    }
  }

  return storageState;
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log("🚀 Web Screenshot Capture\n");
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`💡 Stelle sicher, dass die Web-App läuft: bun run web\n`);

  // Verzeichnis erstellen
  ensureDir(SOURCE_DIR);

  // Browser starten
  console.log("🌐 Starte Browser...");
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    // Test, ob die App erreichbar ist
    const testPage = await browser.newPage();
    try {
      await testPage.goto(BASE_URL, {
        timeout: 5000,
        waitUntil: "domcontentloaded",
      });
      console.log("✓ App ist erreichbar\n");
    } catch (error) {
      console.error(`❌ App ist nicht erreichbar unter ${BASE_URL}\n`);
      console.log("💡 Tipp: Starte die Web-App mit: bun run web");
      process.exit(1);
    } finally {
      await testPage.close();
    }

    // Screenshots für alle Routen erstellen (mit Anmeldung)
    // Speichere die Session nach dem ersten Login, um sie für weitere Routen zu nutzen
    let savedStorageState: any;
    for (const route of SCREENSHOT_ROUTES) {
      savedStorageState = await captureScreenshotsForRoute(
        browser,
        route,
        true,
        savedStorageState
      );
    }

    console.log("\n✨ Fertig! Alle Screenshots wurden erstellt.");
    console.log(`📁 Screenshots gespeichert in: ${SOURCE_DIR}`);
    console.log(
      `\n✅ Screenshots sind bereits in den benötigten App Store Größen!`
    );
    console.log(`   Keine weitere Konvertierung nötig.`);
  } catch (error) {
    console.error("❌ Fehler:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Script ausführen
main().catch((error) => {
  console.error("❌ Fehler:", error);
  process.exit(1);
});







