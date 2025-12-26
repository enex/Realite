/* eslint-disable no-console */
const path = require("node:path");
const sharp = require("sharp");

const projectRoot = path.resolve(__dirname, "..");

const inputSvg = path.join(projectRoot, "assets", "images", "icon.svg");
const outDir = path.join(projectRoot, "assets", "images");

const outputs = [
  { filename: "icon.png", size: 1024 },
  { filename: "adaptive-icon.png", size: 1024 },
  { filename: "favicon.png", size: 48 },
  { filename: "splash-icon.png", size: 200 },
];

async function renderPng({ size, filename }) {
  const outPath = path.join(outDir, filename);

  await sharp(inputSvg, { density: 512 })
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
  console.log(`Rendering icons from ${path.relative(projectRoot, inputSvg)}…`);
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
