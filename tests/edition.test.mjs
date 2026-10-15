// Ấn bản: guarantees of the redesigned homepage and its colour system.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const home = () => read('dist/index.html');
// A stylesheet with its later half, linked where a page's first screen ends
// (lib/editionStyles.ts): the rules are the edition's wherever they are linked.
const LATER = { foundation: 'shell', home: 'home-later', reader: 'reader-later' };
const sheet = (name) =>
  [name, LATER[name]]
    .filter(Boolean)
    .map((part) => read(`src/styles/edition/${part}.css`))
    .join('\n');

test('every palette text pair clears WCAG AA and every plate keeps its lines legible', () => {
  const palette = JSON.parse(read('public/brand/edition/palette.json'));
  for (const theme of ['light', 'dark']) {
    for (const [pair, ratio] of Object.entries(palette.neutrals[theme].checks))
      assert.ok(ratio >= 4.5, `${theme} ${pair} ${ratio}`);
    for (const ink of palette.inks)
      for (const [pair, ratio] of Object.entries(ink[theme].checks))
        assert.ok(
          ratio >= (pair.includes('3:1') ? 3 : 4.5),
          `${theme} ${ink.key} ${pair} ${ratio}`,
        );
  }
  // Engraving lines printed in any ink on any paper stay far above text contrast.
  for (const plate of palette.plates) assert.ok(plate.ratio >= 7, `${plate.ink} on ${plate.paper}`);
});

test('every plate on the homepage is printed from its disciplines, with no per-image filter', () => {
  const html = home();
  const inks = new Set(['son', 'nghe', 'luc', 'lam', 'cham', 'tia']);
  const plates = [
    ...html.matchAll(
      /<span class="plate[^"]*" data-ink="([a-z]+)" data-paper="([a-z]+)"[^>]*>\s*<span class="plate__print"/g,
    ),
  ];
  assert.ok(plates.length >= 9, 'lead and index plates render');
  for (const [, ink, paper] of plates)
    assert.ok(inks.has(ink) && inks.has(paper), `${ink}/${paper}`);
  // Two inks come from the compositor (screen + multiply), never from SVG filters.
  assert.doesNotMatch(html, /--plate-filter|<filter id="plate-/);
});

test('colour is always a word: rubrics print the discipline name in its ink, never a bare swatch', () => {
  const html = home();
  const rubrics = [
    ...html.matchAll(/<span class="rubric__lead" data-ink="[a-z]+">([^<]+)<\/span>/g),
  ];
  assert.ok(rubrics.length >= 9);
  for (const [, name] of rubrics) assert.ok(name.trim().length > 1, name);
  assert.doesNotMatch(html, /class="swatch"/);
});

test('without JavaScript the homepage shows eight essays and no dead controls', () => {
  const html = home();
  const stories = [...html.matchAll(/<li class="story printed"[^>]*>/g)].map(([tag]) => tag);
  assert.equal(stories.filter((tag) => !/\bhidden\b/.test(tag)).length, 8);
  assert.match(html, /<div class="filter"[^>]*data-filter[^>]*hidden/);
  assert.match(html, /<div class="bar"[^>]*data-mode="float"[^>]*inert/);
  // Tabs are real links: without JavaScript each series and book opens its own page.
  const tabs = [...html.matchAll(/<a class="volumes__tab[^"]*"[^>]*>/g)];
  assert.ok(tabs.length >= 2);
  for (const [tag] of tabs) assert.match(tag, /href="\/series\//);
});

test('one h1 names the publication; the lead essay is the first linked heading below it', () => {
  const html = home();
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  const lead = html.indexOf('id="lead-title"');
  const index = html.indexOf('id="issue-title"');
  assert.ok(lead > 0 && index > lead);
});

test('the new stylesheets avoid the patterns this redesign retired', () => {
  for (const file of readdirSync(new URL('src/styles/edition/', root))) {
    const css = read(`src/styles/edition/${file}`);
    // Capitals belong to the sans apparatus only: a rule that sets uppercase also sets Mona Sans,
    // or styles something that is always set in the sans (.caps and its family).
    for (const block of css.split('}')) {
      if (!/text-transform:\s*uppercase/.test(block)) continue;
      assert.match(
        block,
        /--font-sans|\.caps\b/,
        `${file}: capitals only in the sans: ${block.trim().slice(0, 80)}`,
      );
    }
    assert.doesNotMatch(css, /transition:\s*all\b/, `${file}: transitions name their properties`);
    // Bricolage returns only as one of the reader's four faces (round 6), never as a publication face.
    const faces = css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace("--font-grotesque: 'Bricolage Grotesque Variable'", '');
    assert.doesNotMatch(
      faces,
      /Fraunces|Bricolage|Be Vietnam|Source Serif|Vollkorn|Archivo/,
      `${file}: retired typefaces`,
    );
    assert.doesNotMatch(
      css,
      /filter:\s*url\(/,
      `${file}: plates are inked by blending, not SVG filters`,
    );
    // v1.1: a near-grey paper (Sương, Rêu) converted to oklch has no hue, and a
    // mix in oklch printed it at hue 0: the bar and the sheets turned pink over
    // moss. Mixes are made in oklab, which has no hue to lose.
    assert.doesNotMatch(css, /color-mix\(in oklch/, `${file}: mix in oklab`);
  }
});

test('the reader keeps every essay readable and its notes reachable without JavaScript', () => {
  const html = read('dist/essays/2026-09-01-loi-hua-ngay-oc-lap/index.html');
  assert.match(html, /<html[^>]*data-reader="true"/);
  assert.match(html, /<div class="bar"[^>]*data-mode="reader"/);
  assert.match(html, /id="reader-settings"[^>]*popover/);
  for (const name of [
    'read-size',
    'read-font',
    'read-measure',
    'read-leading',
    'read-paper',
    'read-appearance',
  ])
    assert.match(html, new RegExp(`name="${name}"`), name);
  // Five size steps; four typefaces (Pliego, Garamond, Bricolage Grotesque, Lexend).
  assert.equal([...html.matchAll(/name="read-size"/g)].length, 5);
  assert.deepEqual(
    [...html.matchAll(/name="read-font" value="([a-z]+)"/g)].map((m) => m[1]),
    ['text', 'classic', 'grotesque', 'lexend'],
  );
  // Every reference points at a note that exists in the page.
  const refs = [...html.matchAll(/<sup class="fn"[^>]*><a href="#(fn-\d+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 0);
  for (const id of refs) assert.match(html, new RegExp(`<li id="${id}"`));
});

test('the reader papers keep text above 5:1 in both appearances', () => {
  const css = sheet('reader');
  const decode = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = (hex) =>
    [1, 3, 5]
      .map((i) => decode(Number.parseInt(hex.slice(i, i + 2), 16) / 255))
      .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const rules = [
    ...css.matchAll(
      /\{ --paper: (#[0-9a-f]{6}); --raised: #[0-9a-f]{6}; --ink: (#[0-9a-f]{6}); --muted: (#[0-9a-f]{6});/g,
    ),
  ];
  assert.ok(rules.length >= 6);
  for (const [, paper, ink, muted] of rules) {
    assert.ok(ratio(ink, paper) >= 7, `${ink} on ${paper}`);
    assert.ok(ratio(muted, paper) >= 5, `${muted} on ${paper}`);
  }
});

test('reviewed books stand at their true proportions, never squeezed', () => {
  for (const page of ['dist/index.html', 'dist/books/index.html']) {
    const html = read(page);
    const books = [
      ...html.matchAll(/<a class="book"[^>]*style="--rw:(\d+);--rh:(\d+)"[^>]*>([\s\S]*?)<\/a>/g),
    ];
    assert.ok(books.length >= 5, page);
    for (const [, rw, rh, inner] of books) {
      const img = inner.match(/<img class="book__cover"[^>]*width="(\d+)" height="(\d+)"/);
      assert.ok(img, page);
      assert.deepEqual([img[1], img[2]], [rw, rh], `${page}: the book's ratio is its cover's`);
    }
  }
  const css = read('src/styles/edition/cards.css');
  assert.match(css, /\.book__cover \{[^}]*max-width: none/);
});

test('the phone menu and the footer draw the same map of the publication', () => {
  const html = home();
  const groups = (fragment, prefix) =>
    [
      ...fragment.matchAll(
        new RegExp(`<nav[^>]*aria-labelledby="${prefix}-([a-z]+)"[^>]*>([\\s\\S]*?)</nav>`, 'g'),
      ),
    ].map(([, id, body]) => [id, [...body.matchAll(/<a[^>]*href="([^"]+)"/g)].map((m) => m[1])]);
  const menu = groups(html.match(/<div id="site-menu"[\s\S]*?<\/div>\s*<\/div>/)[0], 'menu');
  const footer = groups(html.match(/<footer class="colophon">[\s\S]*<\/footer>/)[0], 'colophon');
  assert.ok(menu.length >= 3);
  assert.deepEqual(menu, footer);
  // The masthead's sections lead the menu's first group, in the same order: Thể nghiệm
  // among them; Lưu trữ, the same essays by month, follows them there only.
  const sections = [
    ...html.match(/<nav class="sections[^>]*>([\s\S]*?)<\/nav>/)[1].matchAll(/href="([^"]+)"/g),
  ].map((m) => m[1]);
  assert.deepEqual(sections, menu[0][1].slice(0, sections.length));
  assert.deepEqual(menu[0][1].slice(sections.length), ['/archives']);
  assert.equal(sections.length, 5);
  assert.ok(sections.includes('/the-nghiem'));
  // Back to the top is one fixed control, present on every page.
  assert.match(html, /<a class="to-top" href="#main" data-to-top/);
});

test('the menu button stands in the right-hand corner and the menu ends with the one call to action', () => {
  const html = home();
  // No envelope stands in for "Nhận bài mới": it reads as writing to us.
  assert.doesNotMatch(html, /masthead__mail|bar__mail/);
  assert.match(
    html,
    /<div class="masthead__tools">[\s\S]*?class="icon-button menu-button masthead__menu"[\s\S]*?<\/button>\s*<\/div>/,
  );
  assert.match(
    html,
    /<div class="bar__tools">[\s\S]*?class="icon-button menu-button bar__menu"[\s\S]*?<\/button>\s*<\/div>/,
  );
  const foot = html.match(
    /<div id="site-menu"[\s\S]*?<div class="menu__foot[^"]*"[^>]*>([\s\S]*?)<\/div>/,
  );
  assert.ok(foot, 'the menu has a foot');
  assert.match(
    foot[1],
    /<a class="button button--ink menu__subscribe" href="\/subscribe">Nhận bài mới<\/a>/,
  );
});

test('the appearance is three glyphs in one tray wherever it is offered, with one of them chosen', () => {
  const html = home();
  const essay = read('dist/essays/2026-02-02-cor-inquietum/index.html');
  for (const [page, name] of [
    [html, 'appearance'],
    [html, 'menu-appearance'],
    [essay, 'read-appearance'],
  ]) {
    const inputs = [
      ...page.matchAll(
        new RegExp(`<input type="radio" name="${name}" value="([a-z]+)"[^>]*>`, 'g'),
      ),
    ];
    assert.deepEqual(
      inputs.map((match) => match[1]),
      ['light', 'dark', 'auto'],
      `${name}: one order everywhere`,
    );
    assert.equal(inputs.filter((match) => /\schecked\b/.test(match[0])).length, 1, name);
  }
  // In the colophon and the menu, glyphs only: every word is for a screen reader.
  const trays = [
    ...html.matchAll(/<fieldset class="appearance[^"]*"[^>]*>([\s\S]*?)<\/fieldset>/g),
  ];
  assert.equal(trays.length, 2);
  for (const [, tray] of trays) {
    const labels = [...tray.matchAll(/<label[^>]*>([\s\S]*?)<\/label>/g)].map(([, body]) => body);
    assert.equal(labels.length, 3);
    for (const label of labels) {
      assert.match(label, /<svg class="glyph"/);
      assert.deepEqual(
        [...label.matchAll(/<span class="([^"]+)"/g)].map((match) => match[1]),
        ['sr-only'],
      );
    }
  }
  // The tile follows the root's theme, so it is in place from the first paint.
  const css = sheet('foundation');
  assert.match(css, /:root\[data-theme='light'\] \.appearance \{\s*--at: 0;/);
  assert.match(css, /:root\[data-theme='dark'\] \.appearance \{\s*--at: 1;/);
  assert.match(css, /\.appearance__tray::before \{[^}]*translate: calc\(var\(--at\)/);
});

test('the homepage shelf slides through the newest reviews; the bookcase deals them all evenly', () => {
  const html = home();
  const count = (fragment) => (fragment.match(/<li class="shelf__item/g) ?? []).length;
  const shelf = html.match(/<div class="shelf shelf--lead" id="home-shelf"[\s\S]*?<\/ol>/);
  assert.ok(shelf, 'the homepage shelf');
  const books = read('dist/books/index.html');
  assert.equal(
    count(shelf[0]),
    Math.min(10, count(books)),
    'the ten newest stand on the homepage shelf',
  );
  assert.match(html, /data-shelf-controls="home-shelf"/);
  const shelves = [
    ...books.matchAll(/<div class="shelf[^"]*"[^>]*data-shelf>([\s\S]*?)<\/ol>/g),
  ].map(([, body]) => count(body));
  assert.ok(shelves.length >= 2, String(shelves));
  assert.ok(
    Math.max(...shelves) <= 5 && Math.max(...shelves) - Math.min(...shelves) <= 1,
    String(shelves),
  );
  // The ledge is light and shade, never a rule.
  assert.doesNotMatch(read('src/styles/edition/cards.css'), /\.shelf[^{]*\{[^}]*border-bottom/);
});

test('pointing at a story brings a lamp over its print, kept to the compositor and to the plate', () => {
  const css = sheet('foundation');
  // The shade is exactly the plate (no edge can show); the light fades to nothing at its rim.
  assert.match(css, /\.plate__shade \{[^}]*inset: 0;[^}]*mix-blend-mode: multiply/);
  assert.match(
    css,
    /\.plate__light \{[^}]*radial-gradient\([\s\S]*?\/ 0\)\s*\);[^}]*mix-blend-mode: soft-light/,
  );
  // It follows the hand by a transform transition, not by repainting.
  assert.match(css, /\.plate__light \{[^}]*transition:[^}]*transform var\(--d-lamp-follow\)/);
  assert.doesNotMatch(
    css,
    /plate__ghost|plate__lamp/,
    'the re-strike and the first lamp are retired',
  );
  const lamp = read('src/lib/editionLamp.ts');
  assert.match(
    lamp,
    /Math\.min\(Math\.max\(point\.x - box\.left, 0\), box\.width\)/,
    'the pool is held inside the plate',
  );
  assert.match(
    lamp,
    /\(hover: hover\) and \(pointer: fine\)/,
    'hover only with a mouse; a tap lights instead',
  );
});

test('floating layers keep their shape while they fade out, and share one material', () => {
  const css = sheet('foundation') + sheet('reader');
  // While a popover closes it is still displayed; a layout set only while open would flash.
  for (const [, body] of css.matchAll(/\.(?:menu|sheet):popover-open \{([^}]*)\}/g))
    assert.doesNotMatch(body, /flex-direction|grid-template|position|overflow/, body);
  assert.match(
    css,
    /\.menu \{[^}]*grid-template-rows:[^}]*background: var\(--material-thick\)[^}]*backdrop-filter: var\(--blur-thick\)/,
  );
  assert.match(
    css,
    /\.sheet \{[^}]*flex-direction: column;[^}]*background: var\(--material\)[^}]*backdrop-filter: var\(--blur\)/,
  );
  // The bar carries its own material: a blur, over paper that is
  // solid at the top edge (the colour browsers paint the band above the
  // page) and thins toward the foot of the bar, to the thin material.
  assert.match(
    css,
    /\.bar \{[^}]*position: fixed;[^}]*background:[^}]*linear-gradient\(\s*var\(--paper\),[^}]*var\(--material-thin\)\s*\)[^}]*backdrop-filter: var\(--blur-thin\)/,
  );
  assert.doesNotMatch(css, /\.bar::before|\.bar > \*/, 'the material is never split from the bar');
  assert.match(
    css,
    /prefers-reduced-transparency: reduce\) \{\s*:root \{[^}]*--material: var\(--paper\)/,
  );
});

test('the reader offers four faces, one of them for readers with dyslexia', () => {
  const html = read('dist/essays/2026-09-01-loi-hua-ngay-oc-lap/index.html');
  const faces = [...html.matchAll(/<input type="radio" name="read-font" value="([a-z]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(faces, ['text', 'classic', 'grotesque', 'lexend']);
  assert.match(html, /font-family:\s*['"]?Bricolage Grotesque Variable/);
  assert.match(html, /font-family:\s*['"]?Lexend Variable/);
  // v1.1: each face is shown only as "Aa" set in itself; its name (and what
  // Lexend is for) is read to screen readers, never printed as a note.
  const picker = html.match(/<div class="seg seg--font">([\s\S]*?)<\/div>/)[1];
  assert.equal([...picker.matchAll(/class="seg__sample"[^>]*>Aa</g)].length, 4);
  assert.match(picker, /<span class="sr-only">Lexend[^<]*dyslexia[^<]*<\/span>/);
  assert.doesNotMatch(picker, /seg__label/);
  assert.doesNotMatch(html, /setting__note/);
  assert.doesNotMatch(sheet('reader'), /data-read-font='sans'/);
});

test('the reader offers four papers, shown only as their colour', () => {
  const html = read('dist/essays/2026-09-01-loi-hua-ngay-oc-lap/index.html');
  const picker = html.match(/<div class="seg seg--paper">([\s\S]*?)<\/div>/)[1];
  assert.equal([...picker.matchAll(/class="paper-swatch paper-swatch--[a-z]+"/g)].length, 4);
  assert.equal([...picker.matchAll(/<span class="sr-only">[^<]+<\/span>/g)].length, 4);
  assert.doesNotMatch(picker, /seg__label/);
});

test('essays are prerendered on intent, and analytics waits for a real visit', () => {
  const html = home();
  // v1.1.1: no hover rule is left to the browser (or to Astro's prefetch):
  // both answered links that only slid under a resting mouse as the page
  // scrolled. A script fetches on intent: a moving hand, a focus, a press.
  assert.doesNotMatch(html, /<script type="speculationrules">/);
  assert.doesNotMatch(read('astro.config.mjs'), /^\s*prefetch\s*:/m);
  const speculation = read('src/lib/editionSpeculation.ts');
  assert.match(speculation, /\[essay \? 'prerender' : 'prefetch'\]/);
  assert.match(speculation, /handRests\(\)/);
  assert.match(speculation, /const PRERENDERS = 2;/);
  assert.match(read('src/layouts/EditionLayout.astro'), /initSpeculation\(\)/);
  assert.match(read('src/components/analytics/GoogleAnalytics.astro'), /prerenderingchange/);
  // The page-to-page script listens from the head, before an arriving page's first frame.
  const head = html.slice(0, html.indexOf('</head>'));
  assert.match(head, /addEventListener\(["']pagereveal["']/);
  // One listener inks every plate; no image carries its own handler.
  assert.doesNotMatch(html, /onload=/);
});

test('the page answers a hand that moves, never the page moving beneath a resting one', () => {
  // v1.1.1: after a scroll under a resting mouse the root carries
  // data-resting until the mouse moves, and every hover style waits for it.
  // :where() keeps each rule's specificity, so the cascade is unchanged.
  const gate = ':where(:root:not([data-resting])) ';
  for (const file of readdirSync(new URL('src/styles/edition/', root))) {
    const css = read(`src/styles/edition/${file}`).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, prelude] of css.matchAll(/([^{}]*)\{/g)) {
      if (!prelude.includes(':hover') || prelude.trim().startsWith('@')) continue;
      for (const selector of prelude.split(/,(?![^(]*\))/)) {
        if (!selector.includes(':hover')) continue;
        assert.ok(selector.trim().startsWith(gate.trim()), `${file}: ${selector.trim()}`);
        // Keyboard focus is never held back with the hover it shares a look with.
        assert.doesNotMatch(selector, /focus/, `${file}: ${selector.trim()}`);
      }
    }
  }
  const hand = read('src/lib/editionHand.ts');
  // Content moving under a still pointer sends pointerover, never pointermove.
  assert.match(hand, /const wake = \(\) => \{[^}]*delete root\.dataset\.resting;/);
  assert.match(hand, /'pointermove'[\s\S]*event\.movementX[\s\S]*else wake\(\);/);
  assert.match(hand, /'scroll'[\s\S]*root\.dataset\.resting = ''/);
  // The lamp, the decks, the reader's notes and speculation all ask the hand.
  for (const file of ['editionLamp', 'editionDeck', 'editionReader', 'editionSpeculation'])
    assert.match(read(`src/lib/${file}.ts`), /handRests\(\)/, file);
  assert.match(read('src/lib/editionDeck.ts'), /\['pointermove', 'pointerdown', 'focus'\]/);
});

test('the first print is never hidden, and a print that arrives out of sight is laid at once', () => {
  const html = home();
  // The cover print is the page's largest paint: printed inked, never faded in.
  const cover = html.match(
    /<a class="cover__plate"[\s\S]*?<span class="plate__print"([^>]*)>[\s\S]*?<img([^>]*)>/,
  );
  assert.ok(cover, 'the cover has a print');
  assert.match(cover[1], /data-inked/);
  assert.match(cover[2], /fetchpriority="high"/);
  // Every other print waits for its image, as before.
  const prints = [...html.matchAll(/<span class="plate__print"([^>]*)>/g)];
  assert.equal(prints.filter(([, attributes]) => attributes.includes('data-inked')).length, 1);
  const head = read('src/lib/editionHead.js');
  assert.match(head, /entry\.isIntersecting \? '' : 'quiet'/);
  const css = sheet('foundation');
  assert.match(css, /\.plate__print\[data-inked='quiet'\] \{\s*transition: none;/);
  // At night the paper is dimmed, never the plate filtered.
  assert.doesNotMatch(css, /\.plate \{\s*filter:/);
  assert.match(css, /--plate-sheet: color-mix\(in srgb, var\(--plate-paper\) 86%, #000\)/);
});

test('the colophon sets the ways through the publication in the sans, the menu in one voice', () => {
  const css = sheet('foundation');
  assert.match(
    css,
    /\.colophon__group :is\(a, button\) \{[^}]*font: 500 var\(--t-nav\) \/ 1\.25 var\(--font-sans\)/,
  );
  // Every row of the menu is a title in Pliego: the sections larger, the rest
  // smaller, never two faces for one kind of row.
  assert.match(
    css,
    /\.menu__group :is\(a, button\) \{[^}]*font: 500 var\(--t-title-xs\) \/ 1\.2 var\(--font-text\)/,
  );
  assert.doesNotMatch(css, /\.menu__group :is\(a, button\) \{[^}]*var\(--font-sans\)/);
  assert.match(css, /\.menu__group--read a \{[^}]*font-size: var\(--t-title-l\)/);
});

test('following is listed once: Substack, never the subscribe page beside it', () => {
  const html = home();
  const nav = html.match(/<div class="colophon__nav[\s\S]*?<div class="colophon__mark/)[0];
  const follow = nav.match(/aria-labelledby="colophon-follow"[\s\S]*?<\/nav>/)[0];
  const hrefs = [...follow.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(hrefs, [
    'https://archyatt.substack.com/subscribe',
    '/rss.xml',
    'mailto:letters@cochinchinepensees.studio',
  ]);
  assert.doesNotMatch(nav, /href="\/subscribe"/);
});

test('the masthead page is withdrawn, and its address leads to the publication', () => {
  assert.throws(() => read('dist/masthead/index.html'));
  assert.match(read('dist/_redirects'), /^\/masthead \/about 301$/m);
  for (const page of ['dist/index.html', 'dist/about/index.html', 'dist/privacy/index.html'])
    assert.doesNotMatch(read(page), /href="\/masthead"/, page);
  assert.doesNotMatch(read('dist/sitemap-0.xml'), /\/masthead/);
});

test('a book cover is asked for at the width it is drawn on the shelf', () => {
  for (const page of ['dist/index.html', 'dist/books/index.html']) {
    const books = [
      ...read(page).matchAll(
        /<li class="shelf__item( shelf__item--lead)?"[\s\S]*?style="--rw:(\d+);--rh:(\d+)"[\s\S]*?<img class="book__cover"[^>]*sizes="([^"]+)"/g,
      ),
    ];
    assert.ok(books.length >= 5, page);
    for (const [, lead, rw, rh, sizes] of books) {
      // A phone draws a book 12rem tall (the lead 1.2 times as tall), as wide as its cover allows.
      const phone = Math.round(192 * (lead ? 1.2 : 1) * (rw / rh));
      const first = sizes.split(',')[0];
      assert.match(first, /^\(max-width:(640|889)px\) \d+px$/, sizes);
      assert.equal(Number(first.match(/(\d+)px$/)[1]), phone, `${page}: ${sizes}`);
      assert.doesNotMatch(sizes, /\d+vw\)?,/, 'never the width of a column');
    }
  }
});

test('a plate never offers two widths less than a tenth apart', () => {
  const plates = [
    ...home().matchAll(
      /<span class="plate__print"[^>]*>\s*<picture>\s*<source type="image\/avif" srcset="([^"]+)"/g,
    ),
  ];
  assert.ok(plates.length >= 9);
  for (const [, srcset] of plates) {
    const widths = srcset.split(', ').map((candidate) => Number(candidate.match(/(\d+)w$/)[1]));
    for (let index = 1; index < widths.length; index++)
      assert.ok(widths[index] >= widths[index - 1] * 1.1 || index === widths.length - 1, srcset);
  }
});

test('the front page leads back into an essay left half read, over the page', () => {
  const html = home();
  assert.match(html, /<div class="return" data-return data-pagefind-ignore hidden>/);
  assert.match(sheet('home'), /\.return \{\s*position: fixed;/);
  const reader = read('src/lib/editionReader.ts');
  // The reader keeps what the front page needs to name the essay.
  assert.match(reader, /title: document\.getElementById\('essay-title'\)/);
  assert.match(reader, /left: Math\.max\(1, Math\.ceil\(minutes \* \(1 - read\)\)\)/);
  const offer = read('src/lib/editionReturn.ts');
  assert.match(offer, /sessionStorage\.setItem\(OFFERED_KEY/);
  assert.match(offer, /link\.href = `\$\{path\}#\$\{encodeURIComponent\(position\.id\)\}`/);
  // Where a link leads, the place is marked in the margin for a moment.
  assert.match(sheet('reader'), /\.prose \[data-arrived\]::before \{/);
});

test('a page kept for Back, or open in another tab, takes the choices made since', () => {
  const layout = read('src/layouts/EditionLayout.astro');
  assert.match(
    layout,
    /addEventListener\('pageshow', \(event\) => \{\s*if \(event\.persisted\) restoreAppearance\(\);/,
  );
  assert.match(layout, /event\.key === 'pensees-theme'/);
  // Choices kept before the site opened are let go once: every reader starts on the system's.
  const head = read('src/lib/editionHead.js');
  assert.match(
    head,
    /localStorage\.removeItem\('pensees-edition-theme'\);\s*const saved = localStorage\.getItem\('pensees-theme'\)/,
  );
  const reader = read('src/lib/editionReader.ts');
  assert.match(reader, /if \(event\.persisted\) restorePrefs\(\);/);
  assert.match(reader, /event\.key === PREFS_KEY/);
});

test('reading on fetches the next essays as documents, never prerenders', () => {
  const reader = read('src/lib/editionReader.ts');
  assert.match(reader, /rootMargin: '0px 0px 150% 0px'/);
  const speculation = read('src/lib/editionSpeculation.ts');
  const ahead = speculation.match(/export function prefetchAhead[\s\S]*?\n\}/)[0];
  assert.match(ahead, /prefetch: \[\{ source: 'list', urls: \[key\] \}\]/);
  assert.doesNotMatch(ahead, /prerender/);
  assert.match(ahead, /slow\(\)/);
});

test('motion runs on one set of curves and times, and every way in has a way out', () => {
  const edition = ['foundation', 'reader', 'cards', 'home', 'pages'].map(sheet).join('\n');
  const foundation = sheet('foundation');
  const settle = foundation.match(/--ease-out: (cubic-bezier\([^)]*\));/)[1];
  const leave = foundation.match(/--ease-leave: (cubic-bezier\([^)]*\));/)[1];
  assert.match(foundation, /--ease-turn: cubic-bezier/);
  assert.match(foundation, /--d-close: \d+ms;/);
  // A transition names a token, never a time of its own (docs/motion.md).
  assert.doesNotMatch(edition, /transition(?:-duration)?:[^;]*\b[1-9]\d*m?s\b/);
  // Exits leave (answer at once, end soft), never the accelerating curve that
  // stood still and then vanished.
  assert.doesNotMatch(edition, /var\(--ease-in\)/);
  for (const layer of ['search-sheet', 'menu', 'sheet'])
    assert.match(
      edition,
      new RegExp(`\\.${layer} \\{[^}]*opacity var\\(--d-close\\) var\\(--ease-leave\\)`),
      layer,
    );
  // Scripted entrances and exits keep the stylesheet's curves.
  const motion = read('src/lib/editionMotion.ts');
  assert.ok(motion.includes(`'${settle}'`) && motion.includes(`'${leave}'`));
  assert.ok(read('src/lib/editionDeck.ts').includes(`'${settle}'`));
});

test('a change to the whole page is one turn, with glass that keeps its blur', () => {
  const turn = read('src/lib/editionTurn.ts');
  assert.match(turn, /\.sheet:popover-open, \.menu:popover-open/);
  assert.match(turn, /view-transition-group\(\$\{name\}\)\{[^`]*backdrop-filter:\$\{blur\}/);
  assert.match(read('src/layouts/EditionLayout.astro'), /turnPage\(apply, from\)/);
  // The reader's paper and type dissolve (their chrome recoloured inside the
  // turn, once the new paper is set), and the reading line is kept.
  const reader = read('src/lib/editionReader.ts');
  assert.match(
    reader,
    /turnPage\(\(\) => \{\s*keepPlace\(\(\) => setDataset\(key, value\)\);[\s\S]*?edition:paper[\s\S]*?\}\);/,
  );
  const css = sheet('foundation');
  assert.match(
    css,
    /:root\[data-reflowing\]::view-transition-new\(root\),?[^}]*\{\s*mix-blend-mode: plus-lighter/,
  );
});

test('the status bar takes a new paper when it is chosen, not when a sheet closes', () => {
  const layout = read('src/layouts/EditionLayout.astro');
  // Safari reads the colour of the screen edges again only when a fixed layer
  // at an edge comes or goes: a strip is shown there once the change settles.
  assert.match(layout, /document\.addEventListener\('edition:paper', recolour\)/);
  assert.match(layout, /edgeProbe\.popover = 'manual'/);
  assert.match(layout, /await turning\(\)\?\.finished/);
  assert.match(sheet('foundation'), /\.edge-probe \{/);
});

test('the name is text, engraved once a visit from a drawing fetched only then', () => {
  const html = home();
  // The name at rest is the words, never a drawing in every page.
  assert.match(
    html,
    /class="wordmark" style="--the-size:[^"]*"><a href="\/" aria-current="page"><span class="wordmark__the">The<\/span> Cochinchine Pensées<\/a>/,
  );
  assert.doesNotMatch(html, /class="nameplate/);
  // The drawing and its engraving are one module, fetched once. It brings no
  // stylesheet: one added to the page restyled all of it mid-load.
  const src = html.match(/data-nameplate-src="(\/nameplate\/[0-9a-f]{12}\.js)"/)[1];
  const module = read(`dist${src}`);
  assert.match(module, /export\{\w+ as engrave\}/);
  const settings = JSON.parse(module.match(/export const settings=(.*);\n$/)[1]);
  for (const kind of ['line', 'lockup']) {
    assert.match(settings[kind], /^<span class="nameplate" aria-hidden="true"/);
    assert.match(settings[kind], /<use href="#np\d+"[^>]*\/>/);
    assert.doesNotMatch(settings[kind], /<style/);
  }
  assert.ok(module.length < 12_000, `${module.length} bytes`);
  assert.match(
    read('public/_headers'),
    /\/nameplate\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/,
  );
  // The reader has no masthead, and asks for no drawing.
  assert.doesNotMatch(
    read('dist/essays/2026-02-02-cor-inquietum/index.html'),
    /data-nameplate-src/,
  );
  // Once a visit, never with less motion, and not at all if the drawing is late.
  const head = read('src/lib/editionHead.js');
  assert.match(head, /sessionStorage\.getItem\('pensees-arrived'\)/);
  assert.match(head, /prefers-reduced-motion: no-preference/);
  assert.match(head, /setTimeout\(rest, 1000\)/);
  assert.match(head, /import\(src\)/);
  // While it waits, the name is unseen but painted: still the page's largest text.
  const css = sheet('foundation');
  assert.match(
    css,
    /:root\[data-nameplate\] \.wordmark a \{\s*-webkit-text-fill-color: transparent;/,
  );
});

test('a press gives under the finger, and a tap leaves no hover standing', () => {
  // Safari on iPhone shows :active only where a touch is listened for.
  assert.match(
    read('src/lib/editionHead.js'),
    /addEventListener\('touchstart', \(\) => \{\}, \{ passive: true \}\)/,
  );
  const css = sheet('foundation');
  assert.match(
    css,
    /\.icon-button:active:not\(:disabled\) \{[^}]*transition-duration: var\(--d-press\)/,
  );
  assert.match(
    css,
    /@media \(hover: hover\) \{\s*:where\(:root:not\(\[data-resting\]\)\) \.button--ink:hover/,
  );
  assert.match(css, /\.menu-button:not\(\.menu__close\):active \.burger i/);
});

test('a sheet on a phone slides whole from the edge; on a wide page it is emptied before its glass goes', () => {
  const css = sheet('reader');
  assert.match(css, /\.note-sheet \{\s*opacity: 1;\s*transform: translateY\(calc\(100% \+ 2px\)\)/);
  assert.match(css, /\.sheet:not\(\.note-sheet, :popover-open\) > \* \{\s*opacity: 0;/);
  assert.match(
    css,
    /\.sheet:not\(\.note-sheet\) \{\s*transition:[^}]*opacity var\(--d-press\) var\(--ease-leave\) var\(--d-press\)/,
  );
});

test('the new paper spreads on a curve of its own, cut through the glass without restyling it', () => {
  const css = sheet('foundation');
  assert.match(css, /--d-spread: 720ms;/);
  assert.match(css, /--ease-spread: linear\(/);
  assert.match(css, /appearance-spread var\(--d-spread\) var\(--ease-spread\)/);
  assert.doesNotMatch(css, /@property --spread/);
  const turn = read('src/lib/editionTurn.ts');
  assert.match(turn, /@keyframes \$\{name\}-in\{from\{clip-path:polygon/);
});

test('the site names itself an independent space for thought, never a journal or its office', () => {
  // Essays may speak of other papers' offices; the pages the site speaks in may not.
  const pages = [
    'index.html',
    'about/index.html',
    'privacy/index.html',
    'authors/index.html',
    'archives/index.html',
    'essays/index.html',
    'pensees/index.html',
    'books/index.html',
    'series/index.html',
    'subscribe/index.html',
    'the-nghiem/index.html',
    'the-nghiem/la-ban-tu-tuong/index.html',
    '404.html',
  ];
  for (const page of pages)
    assert.doesNotMatch(read(`dist/${page}`), /tập san|ban biên tập|tòa soạn|toà soạn/i, page);
  const about = read('dist/about/index.html');
  assert.match(about, /<h1 class="page-head__title">Giới thiệu<\/h1>/);
  assert.match(about, /một không gian độc lập cho những suy tưởng và\s+trao đổi/);
  assert.match(read('src/lib/editionVoice.mjs'), /SITE_TAGLINE = 'Suy tưởng độc lập/);
  assert.match(read('scripts/social-card.mjs'), /line\(\[italic\], SITE_TAGLINE, 36\)/);
});
