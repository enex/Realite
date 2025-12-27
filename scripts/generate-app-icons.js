/* eslint-disable no-console */
const path = require("node:path");
const sharp = require("sharp");

const projectRoot = path.resolve(__dirname, "..");

const defaultInputSvg = path.join(projectRoot, "assets", "images", "icon.svg");
const outDir = path.join(projectRoot, "assets", "images");

const outputs = [
  { filename: "icon.png", size: 1024, input: "icon.svg" },
  // Android adaptive icon foreground should include padding/safe-zone.
  { filename: "adaptive-icon.png", size: 1024, input: "adaptive-icon.svg" },
  { filename: "favicon.png", size: 48, input: "icon.svg" },
  { filename: "splash-icon.png", size: 200, input: "icon.svg" },
];

async function renderPng(output) {
  const { size, filename, input } = output;
  const outPath = path.join(outDir, filename);
  const inPath = path.join(outDir, input || path.basename(defaultInputSvg));

  await sharp(inPath, { density: 512 })
    .resize(size, size, { fit: "contain" })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false,
    })
    .toFile(outPath);

  console.log(`✓ ${path.relative(projectRoot, outPath)} (${size}x${size})`);
}

async function main() {
  console.log(`Rendering icons…`);
  for (const output of outputs) {
    // Render sequentially to avoid memory spikes on SVG rasterization.
    // eslint-disable-next-line no-await-in-loop
    await renderPng(output);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
