#!/usr/bin/env bun

/**
 * Screenshot Generator für Apple App Store und Google Play Store
 *
 * Verwendung:
 * 1. Erstelle Screenshots in `screenshots/source/` (z.B. manuell oder mit einem Tool)
 * 2. Führe aus: `bun run scripts/generate-screenshots.ts`
 * 3. Die konvertierten Screenshots werden in `screenshots/apple/` und `screenshots/google/` erstellt
 */

import { existsSync, mkdirSync, readdirSync } from "fs";
import { basename, extname, join } from "path";
import sharp from "sharp";

// Screenshot-Größen-Definitionen
const APPLE_SCREENSHOTS = {
  // iPhone 6.9" (neueste Modelle - iPhone 16 Pro Max, iPhone 16 Plus)
  "iphone-6.9-portrait": {
    width: 1290,
    height: 2796,
    name: 'iPhone 6.9" Portrait',
  },
  "iphone-6.9-landscape": {
    width: 2796,
    height: 1290,
    name: 'iPhone 6.9" Landscape',
  },

  // iPhone 6.5" (ältere Modelle - iPhone 14 Plus, iPhone 13 Pro Max)
  "iphone-6.5-portrait": {
    width: 1242,
    height: 2688,
    name: 'iPhone 6.5" Portrait',
  },
  "iphone-6.5-landscape": {
    width: 2688,
    height: 1242,
    name: 'iPhone 6.5" Landscape',
  },

  // iPad 13" (neueste Modelle - iPad Pro M5, M4)
  "ipad-13-portrait": { width: 2064, height: 2752, name: 'iPad 13" Portrait' },
  "ipad-13-landscape": {
    width: 2752,
    height: 2064,
    name: 'iPad 13" Landscape',
  },

  // iPad 12.9" (iPad Pro 2nd generation)
  "ipad-12.9-portrait": {
    width: 2048,
    height: 2732,
    name: 'iPad 12.9" Portrait',
  },
  "ipad-12.9-landscape": {
    width: 2732,
    height: 2048,
    name: 'iPad 12.9" Landscape',
  },
};

const GOOGLE_SCREENSHOTS = {
  // Phone Screenshots (16:9 oder 9:16, min 320px, max 3840px)
  "phone-portrait-hd": { width: 1080, height: 1920, name: "Phone Portrait HD" }, // 9:16
  "phone-portrait-fhd": {
    width: 1440,
    height: 2560,
    name: "Phone Portrait FHD",
  }, // 9:16
  "phone-landscape-hd": {
    width: 1920,
    height: 1080,
    name: "Phone Landscape HD",
  }, // 16:9
  "phone-landscape-fhd": {
    width: 2560,
    height: 1440,
    name: "Phone Landscape FHD",
  }, // 16:9

  // Tablet 7" Screenshots (16:9 oder 9:16, 320-3840px)
  "tablet-7-portrait": {
    width: 1920,
    height: 2560,
    name: 'Tablet 7" Portrait',
  }, // 3:4
  "tablet-7-landscape": {
    width: 2560,
    height: 1920,
    name: 'Tablet 7" Landscape',
  }, // 4:3

  // Tablet 10" Screenshots (16:9 oder 9:16, 1080-7680px)
  "tablet-10-portrait": {
    width: 2560,
    height: 3840,
    name: 'Tablet 10" Portrait',
  }, // 2:3
  "tablet-10-landscape": {
    width: 3840,
    height: 2560,
    name: 'Tablet 10" Landscape',
  }, // 3:2
};

const SOURCE_DIR = join(process.cwd(), "screenshots", "source");
const APPLE_DIR = join(process.cwd(), "screenshots", "apple");
const GOOGLE_DIR = join(process.cwd(), "screenshots", "google");

interface ScreenshotSize {
  width: number;
  height: number;
  name: string;
}

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
 * Liest alle Bilddateien aus einem Verzeichnis
 */
function getImageFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    console.error(`❌ Quellverzeichnis existiert nicht: ${dir}`);
    console.log(
      `\n💡 Tipp: Erstelle Screenshots in ${dir} und führe das Script erneut aus.`
    );
    process.exit(1);
  }

  const files = readdirSync(dir)
    .filter((file) => {
      const ext = extname(file).toLowerCase();
      return [".png", ".jpg", ".jpeg"].includes(ext);
    })
    .map((file) => join(dir, file));

  if (files.length === 0) {
    console.error(`❌ Keine Bilddateien in ${dir} gefunden.`);
    console.log(`\n💡 Tipp: Füge PNG oder JPEG Dateien zu ${dir} hinzu.`);
    process.exit(1);
  }

  return files;
}

/**
 * Konvertiert ein Bild in die gewünschte Größe
 */
async function convertImage(
  inputPath: string,
  outputPath: string,
  size: ScreenshotSize
): Promise<void> {
  try {
    await sharp(inputPath)
      .resize(size.width, size.height, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toFile(outputPath);
  } catch (error) {
    console.error(`❌ Fehler beim Konvertieren von ${inputPath}:`, error);
    throw error;
  }
}

/**
 * Generiert alle Screenshots für eine Plattform
 */
async function generateScreenshots(
  sourceFiles: string[],
  sizes: Record<string, ScreenshotSize>,
  outputDir: string,
  platformName: string
): Promise<void> {
  ensureDir(outputDir);

  console.log(`\n📱 Generiere ${platformName} Screenshots...`);

  let totalGenerated = 0;

  for (const sourceFile of sourceFiles) {
    const baseName = basename(sourceFile, extname(sourceFile));
    const index = sourceFiles.indexOf(sourceFile) + 1;

    console.log(
      `\n  Verarbeite Screenshot ${index}/${sourceFiles.length}: ${baseName}`
    );

    for (const [key, size] of Object.entries(sizes)) {
      const outputPath = join(outputDir, `${baseName}_${key}.png`);

      try {
        await convertImage(sourceFile, outputPath, size);
        totalGenerated++;
        console.log(`    ✓ ${size.name} (${size.width}x${size.height})`);
      } catch (error) {
        console.error(`    ❌ Fehler bei ${size.name}:`, error);
      }
    }
  }

  console.log(
    `\n✅ ${totalGenerated} ${platformName} Screenshots generiert in ${outputDir}`
  );
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log("🚀 Screenshot Generator für App Store und Play Store\n");

  // Verzeichnisse erstellen
  ensureDir(SOURCE_DIR);
  ensureDir(APPLE_DIR);
  ensureDir(GOOGLE_DIR);

  // Quell-Screenshots lesen
  const sourceFiles = getImageFiles(SOURCE_DIR);
  console.log(`📸 ${sourceFiles.length} Quell-Screenshot(s) gefunden\n`);

  // Apple Screenshots generieren
  await generateScreenshots(
    sourceFiles,
    APPLE_SCREENSHOTS,
    APPLE_DIR,
    "Apple App Store"
  );

  // Google Screenshots generieren
  await generateScreenshots(
    sourceFiles,
    GOOGLE_SCREENSHOTS,
    GOOGLE_DIR,
    "Google Play Store"
  );

  console.log("\n✨ Fertig! Alle Screenshots wurden generiert.");
  console.log(`\n📁 Ausgabe-Verzeichnisse:`);
  console.log(`   Apple: ${APPLE_DIR}`);
  console.log(`   Google: ${GOOGLE_DIR}`);
}

// Script ausführen
main().catch((error) => {
  console.error("❌ Fehler:", error);
  process.exit(1);
});
