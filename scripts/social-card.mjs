// The share card: the picture a link to any page without a cover of its own
// carries (og:image, 1200 × 630). It is the masthead, set as the masthead
// sets it: the name in Libre Bodoni over the thick-and-thin rule, then what
// the publication is, and the six inks, each as the name of its discipline.
// Every letter is an outline from the very font files the site serves, so the
// card is drawn the same on any machine, without a browser or system fonts.
//
//   node scripts/social-card.mjs [out.png]   (after the name, the inks or the faces change)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';
import fontverter from 'fontverter';
import sharp from 'sharp';
import { SITE_TAGLINE } from '../src/lib/editionVoice.mjs';

const root = new URL('../', import.meta.url);
const OUTPUT = process.argv[2] ?? fileURLToPath(new URL('public/social-card.png', root));
const W = 1200;
const H = 630;
const MARGIN = 96;

// fontkit sets a variable face at an instance only from an unpacked font, so
// each file is read as TrueType; a face is laid out from its own tables
// (cmap, kerning) and drawn at the instance the site sets.
const face = async (file, variation) => {
  const packed = readFileSync(new URL(`src/assets/fonts/${file}`, root));
  const font = fontkit.create(await fontverter.convert(packed, 'truetype'));
  return { font, drawn: variation ? font.getVariation(variation) : font };
};
const brand = await face('libre-bodoni/libre-bodoni-latin-500-normal.woff2');
const italic = await face('pliego/Pliego-Italic.woff2');
// Pensees Sans comes as two files, Latin and Vietnamese, like the site's.
const sans = [
  await face('pensees-sans/pensees-sans-latin-normal.woff2', { wght: 600 }),
  await face('pensees-sans/pensees-sans-vietnamese-normal.woff2', { wght: 600 }),
];
const { neutrals, inks } = JSON.parse(
  readFileSync(new URL('public/brand/edition/palette.json', root), 'utf8'),
);
const { paper, ink, muted, rule } = neutrals.light;

/** A line of text as outlines, from whichever of the fonts holds each letter. */
function line(fonts, string, size, tracking = 0) {
  const runs = [];
  for (const char of string) {
    const entry =
      fonts.find(({ font }) => font.hasGlyphForCodePoint(char.codePointAt(0))) ?? fonts[0];
    if (runs.at(-1)?.entry === entry) runs.at(-1).text += char;
    else runs.push({ entry, text: char });
  }
  let x = 0;
  const glyphs = [];
  for (const { entry, text } of runs) {
    const scale = size / entry.font.unitsPerEm;
    const run = entry.font.layout(text);
    run.glyphs.forEach((glyph, i) => {
      const at = run.positions[i];
      const drawn = entry.drawn.getGlyph(glyph.id);
      const kern = at.xAdvance - glyph.advanceWidth;
      glyphs.push({ d: drawn.path.toSVG(), x: x + at.xOffset * scale, scale });
      x += (drawn.advanceWidth + kern) * scale + tracking * size;
    });
  }
  const width = x - tracking * size;
  return {
    width,
    draw: (left, baseline, fill) =>
      `<g fill="${fill}">${glyphs
        .map(
          ({ d, x, scale }) =>
            `<path transform="translate(${(left + x).toFixed(2)} ${baseline}) scale(${scale} ${-scale})" d="${d}"/>`,
        )
        .join('')}</g>`,
  };
}

const parts = [];
// The name, one line, tracked as the masthead tracks it (-0.02em).
const name = line([brand], 'The Cochinchine Pensées', 88, -0.02);
const nameBaseline = 238;
parts.push(name.draw((W - name.width) / 2, nameBaseline, ink));
// The thick-and-thin rule under the masthead: 2px, a gap of 3, then 1px.
const ruleTop = 280;
parts.push(
  `<rect x="${MARGIN}" y="${ruleTop}" width="${W - 2 * MARGIN}" height="2" fill="${ink}"/>`,
);
parts.push(
  `<rect x="${MARGIN}" y="${ruleTop + 5}" width="${W - 2 * MARGIN}" height="1" fill="${ink}"/>`,
);
// What the site is, in the italic of its text face.
const dek = line([italic], SITE_TAGLINE, 36);
parts.push(dek.draw((W - dek.width) / 2, 356, muted));
// The six inks: colour is always a word, the name of its discipline.
const labels = inks.map((entry) => ({
  label: line(sans, entry.topic.toLocaleUpperCase('vi'), 19, 0.08),
  colour: entry.light.text,
}));
const gap = 40;
const total = labels.reduce((sum, { label }) => sum + label.width, 0) + gap * (labels.length - 1);
let x = (W - total) / 2;
const labelBaseline = 470;
parts.push(
  `<rect x="${MARGIN}" y="${labelBaseline - 48}" width="${W - 2 * MARGIN}" height="1" fill="${rule}"/>`,
);
for (const { label, colour } of labels) {
  parts.push(label.draw(x, labelBaseline, colour));
  x += label.width + gap;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${paper}"/>${parts.join('')}</svg>`;
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(OUTPUT);
console.log(`Share card: ${OUTPUT}`);
