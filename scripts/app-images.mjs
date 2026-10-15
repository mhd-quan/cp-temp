import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { DEVICES, launchScreens, PAPERS } from '../src/lib/appLaunch.mjs';
import { nameplate } from '../src/lib/nameplate.mjs';

// The images of the publication as an app on a home screen, drawn after the
// build into dist/brand (nothing tracked is written): its icons, from the mark
// that is its favicon (public/brand/mark.svg), and its launch screens, from the
// outlines of its name (src/lib/appLaunch.mjs). Drawn once and kept in
// .cache/app-images, keyed by everything they are drawn from.

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CACHE = path.join(ROOT, '.cache/app-images');
const MARK = path.join(ROOT, 'public/brand/mark.svg');
/** Raised whenever the drawing below changes. */
const VERSION = 1;

/** The mark's two colours, its two letters ("P" and the full stop) and their box, from the favicon. */
async function markParts() {
  const svg = await fs.readFile(MARK, 'utf8');
  const ground = svg.match(/<rect[^>]*fill="([^"]+)"/)[1];
  const paths = [
    ...svg.matchAll(
      /<path d="([^"]+)" transform="translate\(([\d.]+),([\d.]+)\) scale\(([\d.]+),-[\d.]+\)" fill="([^"]+)"\/>/g,
    ),
  ].map(([, d, tx, ty, s, fill]) => ({ d, tx: +tx, ty: +ty, s: +s, fill }));
  // The box of the letters in the favicon's square, from their outlines' points.
  const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
  for (const { d, tx, ty, s } of paths) {
    const numbers = d.match(/-?[\d.]+/g).map(Number);
    for (let index = 0; index < numbers.length; index += 2) {
      const x = tx + numbers[index] * s;
      const y = ty - numbers[index + 1] * s;
      box.left = Math.min(box.left, x);
      box.right = Math.max(box.right, x);
      box.top = Math.min(box.top, y);
      box.bottom = Math.max(box.bottom, y);
    }
  }
  return { ground, letter: paths[0].fill, paths, box };
}

/**
 * The mark laid on a square of `size`: its letters' box centred, a hair to the
 * left of the box's centre (the full stop is light; the eye weighs the P), its
 * height `share` of the square. The favicon itself is set for a browser's tab;
 * a home screen masks the square to its own shape and wants the letters in the
 * middle of it, clear of the corners.
 */
function markSvg(
  { ground, letter, paths, box },
  size,
  { share = 0.5, background = true, fill } = {},
) {
  const height = box.bottom - box.top;
  const scale = (size * share) / height;
  const width = (box.right - box.left) * scale;
  const x = (size - width) / 2 - size * 0.012 - box.left * scale;
  const y = (size - height * scale) / 2 - box.top * scale;
  const letters = paths
    .map(
      ({ d, tx, ty, s }) =>
        `<path d="${d}" transform="translate(${tx},${ty}) scale(${s},-${s})" fill="${fill ?? letter}"/>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${
    background ? `<rect width="${size}" height="${size}" fill="${ground}"/>` : ''
  }<g transform="translate(${x} ${y}) scale(${scale})">${letters}</g></svg>`;
}

/** The name's drawing (lib/nameplate.mjs), filled in ink, without the engraving's hairline. */
function nameDrawing(kind) {
  const setting = nameplate().settings[kind];
  const svg = setting.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  const viewBox = svg[0]
    .match(/viewBox="([^"]+)"/)[1]
    .split(' ')
    .map(Number);
  return { viewBox, inner: svg[1] };
}

function launchSvg(screen) {
  const { width, height, dpr, scheme, place } = screen;
  const { paper, ink } = PAPERS[scheme];
  const drawing = nameDrawing(place.kind);
  const [, minY, units, unitsHigh] = drawing.viewBox;
  // A viewBox in thousandths of an em: the drawing is `units / 1000` ems wide.
  const w = (units / 1000) * place.em;
  const h = (unitsHigh / 1000) * place.em;
  const x = place.x ?? (width - w) / 2;
  const px = (value) => +(value * dpr).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width * dpr}" height="${height * dpr}" viewBox="0 0 ${width * dpr} ${height * dpr}"><rect width="100%" height="100%" fill="${paper}"/><svg x="${px(x)}" y="${px(place.y)}" width="${px(w)}" height="${px(h)}" viewBox="0 ${minY} ${units} ${unitsHigh}" overflow="visible" fill="${ink}" stroke="none">${drawing.inner.replaceAll('href="#', 'xlink:href="#')}</svg></svg>`;
}

const png = (svg) =>
  sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, colors: 64, effort: 10 });

export async function drawAppImages(dist) {
  const mark = await markParts();
  const screens = DEVICES.flatMap(launchScreens);
  const icons = [
    // Home screens of iOS and iPadOS mask the square themselves: full bleed, no transparency.
    { file: '/brand/apple-touch-icon.png', svg: markSvg(mark, 180) },
    { file: '/brand/app/icon-192.png', svg: markSvg(mark, 192) },
    { file: '/brand/app/icon-512.png', svg: markSvg(mark, 512) },
    // Android masks to a circle at the least: the letters inside its middle 80%.
    { file: '/brand/app/maskable-192.png', svg: markSvg(mark, 192, { share: 0.4 }) },
    { file: '/brand/app/maskable-512.png', svg: markSvg(mark, 512, { share: 0.4 }) },
    // Themed icons (Android 13 and later) take only the shape, and colour it themselves.
    {
      file: '/brand/app/monochrome-512.png',
      svg: markSvg(mark, 512, { share: 0.4, background: false, fill: '#fff' }),
    },
  ];
  const key = createHash('sha256')
    .update(
      JSON.stringify({
        VERSION,
        mark,
        screens,
        icons: icons.map(({ svg }) => svg),
        name: nameplate().hash,
        sharp: sharp.versions,
      }),
    )
    .digest('hex')
    .slice(0, 16);
  const cached = path.join(CACHE, key);
  if (!(await fs.stat(cached).catch(() => null))) {
    const temporary = `${cached}.${process.pid}.tmp`;
    await fs.rm(temporary, { recursive: true, force: true });
    const jobs = [
      ...icons.map(({ file, svg }) => [file, () => png(svg)]),
      ...screens.map((screen) => [screen.file, () => png(launchSvg(screen))]),
    ];
    let next = 0;
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        while (next < jobs.length) {
          const [file, draw] = jobs[next++];
          const output = path.join(temporary, file);
          await fs.mkdir(path.dirname(output), { recursive: true });
          await draw().toFile(output);
        }
      }),
    );
    await fs.mkdir(CACHE, { recursive: true });
    await fs.rename(temporary, cached);
  }
  await fs.cp(cached, dist, { recursive: true });
  return { icons: icons.length, screens: screens.length, key };
}

export default function appImages() {
  return {
    name: 'tcp-app-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const { icons, screens, key } = await drawAppImages(fileURLToPath(dir));
        logger.info(`App: ${icons} icons and ${screens} launch screens (${key}).`);
      },
    },
  };
}
