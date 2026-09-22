/**
 * Génère les deux icônes PWA (192x192 et 512x512) requises par
 * public/manifest.json : carré bleu ardoise #152A45 avec un "N" blanc
 * centré. Rendu via une SVG rastérisée par sharp — aucune image externe.
 * Manrope n'étant pas installée comme police système dans cet
 * environnement de génération, on utilise DejaVu Sans Bold (police
 * système la plus proche, sans-serif géométrique) comme repli.
 */
const sharp = require("sharp");
const path = require("path");

const BG = "#152A45";
const FG = "#FFFFFF";

function iconSvg(size) {
  const fontSize = Math.round(size * 0.56);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${BG}" />
    <text
      x="50%"
      y="50%"
      font-family="DejaVu Sans, Arial, sans-serif"
      font-weight="bold"
      font-size="${fontSize}"
      fill="${FG}"
      text-anchor="middle"
      dominant-baseline="central"
    >N</text>
  </svg>`;
}

async function generate(size, filename) {
  const outPath = path.join(__dirname, "..", "public", filename);
  await sharp(Buffer.from(iconSvg(size))).png().toFile(outPath);
  console.log(`Généré : ${outPath}`);
}

(async () => {
  await generate(192, "icon-192.png");
  await generate(512, "icon-512.png");
})();
