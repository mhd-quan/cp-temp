// La bàn Tư tưởng: portraits for the people the results name.
//
// For each figure in src/data/quiz/catalogue/ with a `wiki` title and no
// portrait yet, finds the person's image on Wikidata (P18, always a free file
// on Wikimedia Commons), records its author and licence, and prints two AVIF
// files, greyscale and cropped to 4:5 around the face, into
// public/quiz/portraits/. The page inks them like every other plate. The
// credits go to src/data/quiz/portraits.json, which the results read.
//
// Everything is asked of www.wikidata.org, fifty people to a request (it also
// answers for Commons files), and the images come from upload.wikimedia.org.
//
// Run: node scripts/quiz-portraits.mjs [--force] [id ...]
// Wikimedia limits requests per address: the script waits when asked to
// (Retry-After), and a later run picks up where this one stopped.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogueDir = path.join(root, 'src/data/quiz/catalogue');
const outDir = path.join(root, 'public/quiz/portraits');
const creditsFile = path.join(root, 'src/data/quiz/portraits.json');
const UA = 'CochinchinePenseesQuiz/1.3 (https://cochinchinepensees.studio)';
const API = 'https://www.wikidata.org/w/api.php?format=json&formatversion=2&';
const WIDTHS = [160, 400];
const RATIO = 5 / 4;
// The width asked of the upload server, enough for the 400px print.
const SOURCE_WIDTH = 500;
const BATCH = 50;
// Wikimedia refuses in bursts: up to ten tries, at most a minute apart.
const TRIES = 10;

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = new Set(args.filter((arg) => !arg.startsWith('--')));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url, as = 'json', attempt = 0) {
  // A request that hangs is abandoned and tried again like a refused one.
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, 'Api-User-Agent': UA },
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!response && attempt < TRIES) return get(url, as, attempt + 1);
  if (!response) throw new Error(`no answer from ${url}`);
  if ((response.status === 429 || response.status >= 500) && attempt < TRIES) {
    const wait = Number(response.headers.get('retry-after')) || Math.min(2 ** attempt, 60);
    await sleep(wait * 1000 + 250);
    return get(url, as, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return as === 'json' ? response.json() : Buffer.from(await response.arrayBuffer());
}

const plain = (html = '') =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** An author line: some Commons templates print the name twice, once hidden. */
function author(html) {
  const text = plain(html);
  const half = text.slice(0, text.length / 2);
  const once = text.length % 2 === 0 && half === text.slice(text.length / 2) ? half : text;
  return /^unknown( author)?$/i.test(once) ? 'Không rõ tác giả' : once;
}

const chunks = (list, size) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) =>
    list.slice(i * size, (i + 1) * size),
  );

/** Each English Wikipedia title's Commons image (Wikidata P18), where it has one. */
async function imagesOf(titles) {
  const found = new Map();
  for (const batch of chunks(titles, BATCH)) {
    const data = await get(
      `${API}action=wbgetentities&sites=enwiki&props=claims|sitelinks&sitefilter=enwiki&titles=${encodeURIComponent(batch.join('|'))}`,
    );
    for (const entity of Object.values(data.entities ?? {})) {
      const title = entity.sitelinks?.enwiki?.title;
      const file = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (title && file) found.set(title, file);
    }
  }
  return found;
}

/** Author, licence and description page of each Commons file. */
async function rightsOf(files) {
  const rights = new Map();
  for (const batch of chunks(files, BATCH)) {
    const titles = batch.map((file) => `File:${file}`).join('|');
    const data = await get(
      `${API}action=query&prop=imageinfo&iiprop=extmetadata|url&iiurlwidth=${SOURCE_WIDTH}&titles=${encodeURIComponent(titles)}`,
    );
    const names = new Map(
      (data.query?.normalized ?? []).map((pair) => [pair.to, pair.from.slice('File:'.length)]),
    );
    for (const page of data.query?.pages ?? []) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const meta = info.extmetadata ?? {};
      const file = names.get(page.title) ?? page.title.slice('File:'.length);
      rights.set(file, {
        // A file narrower than the thumbnail is served whole.
        image: info.thumburl ?? info.url,
        page: info.descriptionurl,
        license: plain(meta.LicenseShortName?.value) || 'Không rõ',
        credit: author(meta.Artist?.value) || author(meta.Credit?.value) || 'Wikimedia Commons',
        free: meta.NonFree?.value !== 'true',
      });
    }
  }
  return rights;
}

async function print(id, image) {
  const files = [];
  for (const width of WIDTHS) {
    const name = `${id}-${width}.avif`;
    await sharp(image)
      .rotate()
      .resize(width, Math.round(width * RATIO), {
        fit: 'cover',
        position: sharp.strategy.attention,
        withoutEnlargement: false,
      })
      .greyscale()
      .avif({ quality: 52, effort: 6 })
      .toFile(path.join(outDir, name));
    files.push([name, width]);
  }
  return files;
}

const figures = [];
for (const name of (await fs.readdir(catalogueDir))
  .filter((file) => file.endsWith('.json'))
  .sort()) {
  const data = JSON.parse(await fs.readFile(path.join(catalogueDir, name), 'utf8'));
  figures.push(...(data.figures ?? []));
}
const credits = JSON.parse(await fs.readFile(creditsFile, 'utf8').catch(() => '{}'));
await fs.mkdir(outDir, { recursive: true });

const wanted = figures.filter(
  (figure) => figure.wiki && (!only.size || only.has(figure.id)) && (force || !credits[figure.id]),
);
const images = await imagesOf(wanted.map((figure) => figure.wiki));
const rights = await rightsOf([...new Set(images.values())]);

const report = { printed: [], skipped: [], failed: [] };
for (const figure of wanted) {
  const file = images.get(figure.wiki);
  if (!file) {
    report.skipped.push(`${figure.id}: no image on Wikidata`);
    continue;
  }
  const right = rights.get(file);
  if (!right?.free) {
    report.skipped.push(`${figure.id}: ${file} is not free or not found`);
    continue;
  }
  try {
    const image = await get(right.image, 'buffer');
    const src = await print(figure.id, image);
    credits[figure.id] = {
      src,
      width: WIDTHS.at(-1),
      height: Math.round(WIDTHS.at(-1) * RATIO),
      credit: right.credit.slice(0, 120),
      license: right.license,
      page: right.page,
    };
    report.printed.push(figure.id);
    // Written as it goes, so an interrupted run keeps what it printed.
    await fs.writeFile(creditsFile, `${JSON.stringify(credits, null, 2)}\n`);
    await sleep(250);
  } catch (error) {
    report.failed.push(`${figure.id}: ${error.message}`);
  }
}
console.log(
  `printed ${report.printed.length}, skipped ${report.skipped.length}, failed ${report.failed.length}`,
);
for (const line of [...report.skipped, ...report.failed]) console.log(`  ${line}`);
