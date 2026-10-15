// La bàn Tư tưởng, as built: open under Thể nghiệm, readable without JavaScript,
// printed in the house's materials, and with a door to it on the first page.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { axes, library } from './quiz-fixtures.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const page = () => read('dist/the-nghiem/la-ban-tu-tuong/index.html');

test('the compass is open: in the sitemap, under Thể nghiệm, and its first address leads to it', () => {
  const html = page();
  assert.doesNotMatch(html, /<meta name="robots" content="noindex/);
  const sitemap = read('dist/sitemap-0.xml');
  assert.match(sitemap, /\/the-nghiem<\/loc>/);
  assert.match(sitemap, /\/the-nghiem\/la-ban-tu-tuong<\/loc>/);
  // Not an article: the site's search keeps to the writing.
  assert.doesNotMatch(html, /data-pagefind-body/);
  assert.match(html, /<a class="caps-link page-head__parent" href="\/the-nghiem">/);
  // Links shared while it was La bàn Chính trị, under Mở rộng, still arrive (their result
  // rides in the hash, which a redirect keeps).
  const redirects = read('dist/_redirects');
  assert.match(redirects, /^\/mo-rong\/la-ban-chinh-tri \/the-nghiem\/la-ban-tu-tuong 301$/m);
  assert.match(redirects, /^\/mo-rong \/the-nghiem 301$/m);
});

test('the first page keeps a door to the compass beside the cover, and after Bài mới on a phone', () => {
  const home = read('dist/index.html');
  const front = home.match(/<div class="front">[\s\S]*?<section class="excerpt/)[0];
  // Written in the order a phone reads: the cover, the pensées, Bài mới, then the door. Only the
  // print and the card are one story: a hand on the door lights no plate of the cover's.
  const order = [
    'class="cover printed"',
    'class="cover__card"',
    'class="pensees"',
    'class="issue"',
    'class="front__door"',
  ];
  for (const [i, part] of order.slice(1).entries())
    assert.ok(front.indexOf(order[i]) < front.indexOf(part), `${order[i]} before ${part}`);
  const cover = front.slice(
    front.indexOf('class="cover printed"'),
    front.indexOf('class="pensees"'),
  );
  assert.doesNotMatch(cover, /data-door|class="note/);
  // A wide page stands the door beside the cover and the pensées, a flexible row taking what it
  // needs beyond them; one column puts every part back in the order written.
  const css = read('src/styles/edition/home.css') + read('src/styles/edition/home-later.css');
  assert.match(css, /\.front__grid \{[^}]*grid-template-rows: auto auto auto 1fr auto;/);
  assert.match(css, /\.front__door \{\s*grid-column: 9 \/ -1;\s*grid-row: 2 \/ span 3;/);
  const narrow = css.slice(css.lastIndexOf('@media (max-width: 900px)'));
  assert.match(
    narrow.slice(0, narrow.indexOf('\n}')),
    /\.issue,\s*\.front__door \{\s*grid-column: 1 \/ -1;\s*grid-row: auto;/,
  );
  // The pensées: notes with small prints, two rows of them, sliding sideways, with the shelf's
  // own controls; two or fewer share one row.
  assert.match(
    css,
    /\.pensees__list \{[^}]*grid-auto-flow: column;[^}]*grid-template-rows: repeat\(2, auto\);[^}]*overflow-x: auto;/,
  );
  assert.match(
    css,
    /\.pensees__list:not\(:has\(> :nth-child\(3\)\)\) \{\s*grid-template-rows: auto;/,
  );
  const pensees = front.slice(front.indexOf('class="pensees"'), front.indexOf('class="issue"'));
  assert.match(pensees, /data-shelf-controls="home-pensees"/);
  assert.match(pensees, /<ol class="pensees__list" id="home-pensees" role="list">/);
  assert.match(pensees, /sizes="\(max-width: 640px\) 72px, 88px"/);
  const door = front.slice(front.indexOf('class="front__door"'));
  // Every variant a dot, nothing written on the cube, and the compass's name the one link.
  // Each family's dots are one path of zero-length strokes, in its colours by day and night.
  assert.equal((door.match(/h0/g) ?? []).length, library.variants.length);
  assert.equal(
    (door.match(/<path style="--day:oklch\([^)]+\);--night:oklch\([^)]+\)" data-p=/g) ?? []).length,
    library.families.length,
  );
  assert.doesNotMatch(door, /cube__pole|data-name=/);
  assert.match(
    door,
    /<h3 class="door__title" id="compass-title"><a class="title-link stretched" href="\/the-nghiem\/la-ban-tu-tuong">La bàn Tư tưởng<\/a><\/h3>/,
  );
  // On the first page the cube keeps to the notes beside it, its outline centred in the column
  // (the drawing sits left in its frame, and moves right to meet it); its name sits at the cube's
  // middle, neither positioned nor moved, so the link it carries covers the whole door.
  assert.match(css, /\.front__door \.door \{\s*--cube: 21rem;/);
  const doorCss = read('src/styles/edition/door.css');
  assert.match(
    doorCss,
    /\.door__body \{[^}]*width: min\(100%, var\(--cube\)\);\s*margin: var\(--s-3\) auto 0;/,
  );
  assert.match(doorCss, /\.door \.cube__plot \{[^}]*left: calc\(100% \* 5\.35 \/ 280\);/);
  const title = doorCss.match(/\.door__title \{[^}]*\}/)[0];
  assert.match(
    title,
    /justify-self: center;[\s\S]*margin: calc\(100% \* 148 \/ 280 - 0\.5lh\) 0 0;/,
  );
  assert.doesNotMatch(title, /position:|translate:|transform:/);
  // Only the dots' colours come with it, not the quiz's own stylesheet.
  assert.doesNotMatch(home, /\.agree::before/);
  // The cube leans toward a mouse that moves near it: never for touch, never when the reader
  // has asked for less motion, and the page is not measured on every move.
  const drift = read('src/lib/quiz/drift.ts');
  assert.match(drift, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(drift, /prefers-reduced-motion: reduce/);
  assert.match(drift, /region\.addEventListener\('pointerenter', \(\) => \{\s*measure\(\);/);
  assert.match(drift, /event\.pageX - place\.x/);
  // On the first page alone the cube also turns by itself: about all three axes, each turn
  // two swells whose lengths are no multiple of one another, so it never repeats; only on
  // screen, and at rest for a hand, a key, or a page left be.
  assert.match(front, /<div class="door" data-door data-door-wander="true">/);
  assert.doesNotMatch(read('dist/the-nghiem/index.html'), /data-door-wander/);
  const scene = read('src/lib/quiz/doorScene.ts');
  for (const swells of ['TURN_SWELLS', 'PITCH_SWELLS', 'ROLL_SWELLS'])
    assert.match(scene, new RegExp(`const ${swells}: readonly Swell\\[\\] = \\[`));
  assert.match(scene, /19 \* PHI/);
  assert.match(scene, /13 \* Math\.SQRT2/);
  assert.match(drift, /new IntersectionObserver/);
  assert.match(drift, /const IDLE = \d+;/);
  assert.match(drift, /region\.addEventListener\('focusin'/);
  // Drawn beside the page: the motion and the drawing are the scene's, kept free of the DOM,
  // in a worker on an OffscreenCanvas, with the page's own canvas only where there is none.
  // The page only tells the scene what a reader does, so it does no work while the cube turns.
  assert.doesNotMatch(scene, /document\.|window\./);
  assert.match(drift, /new Worker\(new URL\('\.\/door\.worker\.ts', import\.meta\.url\)/);
  assert.match(drift, /transferControlToOffscreen\(\)/);
  assert.match(drift, /import\('\.\/doorScene\.ts'\)/);
  assert.doesNotMatch(drift, /^import \{[^}]*\} from '\.\/(?:doorScene|compass)\.ts'/m);
  assert.doesNotMatch(drift, /setAttribute\('d'/);
  assert.match(read('src/lib/quiz/door.worker.ts'), /scene\(message\.canvas, message\.init/);
  // Thể nghiệm lists it with the same door.
  assert.match(
    read('dist/the-nghiem/index.html'),
    /href="\/the-nghiem\/la-ban-tu-tuong">La bàn Tư tưởng</,
  );
});

test('the result picture carries the cube, the people, the parties and a code that opens it', () => {
  const card = read('src/lib/quiz/card.ts');
  assert.match(card, /from 'uqr'/);
  assert.match(card, /encode\(url, \{ ecc: 'L', border: 0 \}\)/);
  // A small code, still read at three quarters of the picture's size; the people one strip.
  assert.ok(Number(card.match(/const CODE = (\d+);/)[1]) <= 150);
  assert.match(card, /const personGap = 4;/);
  for (const part of ['BẠN TRONG KHỐI', 'NGƯỜI NGHĨ GẦN BẠN', 'QUÉT MÃ ĐỂ MỞ KẾT QUẢ NÀY'])
    assert.ok(card.includes(part), part);
  // The code holds the very link Chép liên kết copies.
  assert.match(read('src/lib/quiz/app.ts'), /drawCard\(result, context, shareUrl\(\)\)/);
});

test('without JavaScript the page lays out the twelve axes and shows no dead control', () => {
  const html = page();
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
  assert.match(html, /<h1 class="page-head__title">La bàn Tư tưởng<\/h1>/);
  for (const axis of axes)
    assert.ok(html.includes(`<h3 class="axis-index__name">${axis.name}</h3>`), axis.id);
  assert.match(html, /<fieldset class="packs" data-js-only hidden>/);
  assert.match(html, /<div class="intro__go" data-js-only hidden>/);
  assert.match(html, /<section class="play" data-panel="play" hidden/);
  assert.match(html, /<section class="result" data-panel="result" hidden/);
  assert.match(html, /<noscript>/);
});

test('answers sit on one straight scale, each named, and the results in tiles', () => {
  const html = page();
  // Seven answers, agreement on the left; each ring says its degree, its label the whole answer.
  const answers = [
    ...html.matchAll(
      /data-answer="(-?\d)"[^>]*aria-label="([^"]+)"[^>]*>.*?<span class="agree__label"[^>]*>([^<]+)</g,
    ),
  ];
  assert.deepEqual(
    answers.map(([, value, label, short]) => [Number(value), label, short]),
    [
      [3, 'Đồng ý trong mọi trường hợp', 'Mọi trường hợp'],
      [2, 'Đồng ý trong phần lớn trường hợp', 'Phần lớn'],
      [1, 'Đồng ý phần nào', 'Phần nào'],
      [0, 'Trung lập', 'Trung lập'],
      [-1, 'Phản đối phần nào', 'Phần nào'],
      [-2, 'Phản đối trong phần lớn trường hợp', 'Phần lớn'],
      [-3, 'Phản đối trong mọi trường hợp', 'Mọi trường hợp'],
    ],
  );
  // The line the rings sit on is laid out of flow: in the flow it took the
  // rings' row, and the rings were pushed into seven more columns beside it.
  const css = read('src/styles/edition/quiz.css');
  assert.match(css, /\.agree::before \{[^}]*position: absolute;[^}]*grid-row: 2;/);
  for (const slot of ['hero', 'why', 'top', 'map', 'axes', 'apart', 'far', 'holders', 'people'])
    assert.match(html, new RegExp(`data-slot="${slot}"`), slot);
  // Three lengths, the standard one chosen; under the question, the trail of the whole round.
  const packs = [...html.matchAll(/name="quiz-pack" value="(\w+)"( checked)?/g)];
  assert.deepEqual(
    packs.map((m) => [m[1], Boolean(m[2])]),
    [
      ['short', false],
      ['standard', true],
      ['deep', false],
    ],
  );
  assert.match(html, /data-trail>/);
  for (const axis of axes) assert.match(html, new RegExp(`data-group="${axis.id}"`), axis.id);
  // The first page draws the whole library in the cube, every dot named.
  assert.equal((html.match(/class="cube__dot"/g) ?? []).length, library.variants.length);
  // The verdict and its reasons each take a row: side by side, the reasons ran far
  // longer than the verdict, which stood as an empty pane beside them.
  const wide = css.slice(css.indexOf('@media (min-width: 900px)'));
  assert.doesNotMatch(wide.slice(0, wide.indexOf('\n}')), /tile--(?:verdict|why)/);
  // Its fit is a ring that fills the figures' room, as large as the seal where the tile is wide,
  // its dash in the ring's own units: pathLength was rescaled only once a drawing had ended.
  assert.match(css, /\.ring__arc \{[^}]*stroke-dashoffset: var\(--rest\);/);
  // On a phone the axes keep their tinted panes, reaching into the tile's margin so the words
  // inside stand on the tile's own line; no rule there takes the pane's padding or fill away.
  const phone = css.slice(css.indexOf('@media (max-width: 760px)'));
  const phoneRules = phone.slice(0, phone.indexOf('\n}'));
  assert.match(css, /\.tile \{[^}]*--tile-pad: [^;]+;[^}]*padding: var\(--tile-pad\);/);
  assert.match(
    phoneRules,
    /\.tile \.leans \{[^}]*margin-inline: calc\(var\(--s-2\) - var\(--tile-pad\)\);/,
  );
  assert.match(
    phoneRules,
    /\.tile \.lean \{\s*padding: var\(--s-5\) calc\(var\(--tile-pad\) - var\(--s-2\) - 1px\);/,
  );
  assert.doesNotMatch(phoneRules, /\.lean[,\s][^{]*\{[^}]*background: none;/);
  // The legend's choices above them share the panes' edges.
  assert.match(
    phoneRules,
    /\.tile \.refs__options \{\s*margin-inline: calc\(var\(--s-2\) - var\(--tile-pad\)\);/,
  );
  assert.doesNotMatch(read('src/lib/quiz/view.ts'), /pathLength=/);
  assert.match(
    css,
    /@container verdict \(min-width: 56rem\)[\s\S]*?\.verdict__figures \.ring \{\s*--ring: 10rem;/,
  );
});

test('each family of ideas brings its own ink, and the profile sheet shares the glass', () => {
  const html = page();
  for (const family of library.families)
    assert.ok(html.includes(`[data-family='${family.id}']{--fh:`), family.id);
  assert.match(html, /id="quiz-profile" class="quiz-sheet" popover/);
  assert.match(read('src/lib/editionTurn.ts'), /\.quiz-sheet:popover-open'/);
  const css = read('src/styles/edition/quiz.css');
  assert.match(
    css,
    /\.quiz-sheet \{[^}]*background: var\(--material\) padding-box;[^}]*backdrop-filter: var\(--blur\)/,
  );
  // A transition names a token, never a time of its own (docs/motion.md).
  assert.doesNotMatch(css, /transition(?:-duration)?:[^;]*\b[1-9]\d*m?s\b/);
});

test('the questions and the results load only when the page asks for them', () => {
  const app = read('src/lib/quiz/app.ts');
  assert.match(app, /import\('\.\/load\.ts'\)/);
  assert.match(app, /import\('\.\/extras\.ts'\)/);
  assert.doesNotMatch(app, /from '\.\/(?:view|glyphs|motifs|extras|load)\.ts'/);
  // Analytics hears that a quiz began and ended, never how it was answered.
  for (const [, fields] of app.matchAll(/track\('quiz_\w+', \{([^}]*)\}/g))
    assert.doesNotMatch(fields, /score|answer|variant|family/);
});
