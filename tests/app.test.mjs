// The publication as an app: what the build gives a browser to install it, keep
// it and launch it (manifest, icons, launch screens, worker, offline page).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { DEVICES, launchScreens, launchScreensFor, namePlace } from '../src/lib/appLaunch.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const dist = (path) => new URL(`dist${path}`, root);

test('the manifest installs the publication as a standalone app, with icons for every purpose', () => {
  const manifest = JSON.parse(read('dist/manifest.webmanifest'));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.short_name, 'Pensées');
  assert.equal(manifest.lang, 'vi');
  assert.equal(manifest.background_color, '#faf9f6');
  for (const icon of manifest.icons) assert.ok(existsSync(dist(icon.src)), icon.src);
  assert.deepEqual([...new Set(manifest.icons.map((icon) => icon.purpose))].sort(), [
    'any',
    'maskable',
    'monochrome',
  ]);
  assert.ok(manifest.shortcuts.every((shortcut) => existsSync(dist(`${shortcut.url}/index.html`))));
});

test('every page names the manifest, the home-screen icon and its name, and no launch screen', () => {
  const home = read('dist/index.html');
  const head = home.slice(0, home.indexOf('</head>'));
  assert.match(head, /<link rel="manifest" href="\/manifest\.webmanifest">/);
  assert.match(head, /<link rel="apple-touch-icon" href="\/brand\/apple-touch-icon\.png">/);
  assert.match(head, /<meta name="apple-mobile-web-app-title" content="Pensées">/);
  // Launch screens are named only for the screen that asks (lib/editionInstall.ts).
  assert.doesNotMatch(home, /apple-touch-startup-image/);
  // Deprecated in Chromium; the manifest's display does its work.
  assert.doesNotMatch(head, /apple-mobile-web-app-capable/);
  assert.ok(existsSync(dist('/brand/apple-touch-icon.png')));
});

test('a launch screen for every Apple screen, each orientation, each paper', () => {
  for (const device of DEVICES)
    for (const screen of launchScreens(device))
      assert.ok(existsSync(dist(screen.file)), screen.file);
  assert.equal(launchScreensFor(390, 844, 3).length, 4);
  assert.equal(
    launchScreensFor(844, 390, 3).length,
    4,
    'a phone held on its side is the same phone',
  );
  assert.equal(launchScreensFor(1280, 800, 1).length, 0);
  const [portrait] = launchScreensFor(390, 844, 3);
  assert.match(portrait.media, /\(device-width: 390px\) and \(device-height: 844px\)/);
  assert.match(portrait.media, /\(orientation: portrait\) and \(prefers-color-scheme: light\)/);
});

test('the name stands on the launch screen where the masthead sets it', () => {
  // 390 wide: the lockup, at the margin, 22px below the status bar, 10.6cqi.
  const phone = namePlace(390, { top: 47 });
  assert.equal(phone.kind, 'lockup');
  assert.ok(Math.abs(phone.x - 21.26) < 0.01);
  assert.equal(phone.y, 69);
  assert.ok(Math.abs(phone.em - 36.833) < 0.01);
  // A phone on its side keeps the camera's side clear, as the page's margin does.
  const side = namePlace(844, { side: 47 });
  assert.equal(side.kind, 'line');
  assert.ok(Math.abs(side.em - 0.086 * (844 - 94)) < 0.01);
  // The stylesheet the formula follows (scripts/app-browser.mjs measures it).
  const foundation = read('src/styles/edition/foundation.css');
  assert.match(
    foundation,
    /--margin: max\(\s*clamp\(1\.25rem, 0\.5rem \+ 3\.4vw, 4rem\),\s*env\(safe-area-inset-left\),\s*env\(safe-area-inset-right\)/,
  );
  assert.match(foundation, /\.wordmark \{[^}]*font-size: min\(8rem, 8\.6cqi\)/);
  assert.match(foundation, /\.wordmark \{\s*font-size: 10\.6cqi;/);
});

test('the worker keeps pages from the network first, and named files from what it kept', () => {
  const worker = read('dist/sw.js');
  assert.match(worker, /^\/\/ [0-9a-f]{12}\n/);
  assert.match(worker, /navigationPreload/);
  assert.match(worker, /\/_astro\/later\.[\w-]+\.css/);
  assert.ok(existsSync(dist(worker.match(/\/_astro\/later\.[\w-]+\.css/)[0])));
  assert.match(worker, /mode==="navigate"/);
  // Nothing from another site passes through it.
  assert.match(worker, /\.origin===self\.location\.origin&&/);
  const headers = read('public/_headers');
  assert.match(headers, /\/sw\.js\n {2}Cache-Control: public, max-age=0, must-revalidate/);
  // Registered by every page, once it has loaded.
  assert.match(read('src/layouts/EditionLayout.astro'), /serviceWorker\.register\('\/sw\.js'/);
});

test('the offline page is no landing page: unindexed, not in the sitemap', () => {
  const offline = read('dist/offline/index.html');
  assert.match(offline, /<meta name="robots" content="noindex/);
  assert.match(offline, /caches\.open\('pensees-pages'\)/);
  assert.doesNotMatch(read('dist/sitemap-0.xml'), /\/offline</);
});

test('the colophon and the menu offer the home screen below the ways to follow, hidden until it can be', () => {
  const home = read('dist/index.html');
  const follow = home.match(/aria-labelledby="colophon-follow"[\s\S]*?<\/nav>/)[0];
  assert.match(
    follow,
    /mailto:letters@[\s\S]*<li data-install-entry hidden><button type="button" data-install>Thêm vào màn hình chính<svg[^>]*data-glyph="install"/,
  );
  const menu = home.match(/<nav class="menu__group menu__group--follow"[\s\S]*?<\/nav>/)[0];
  assert.match(menu, /data-install-entry hidden/);
  // The sheet that explains it is held back from every page.
  assert.match(
    home,
    /<template data-later="app-sheet" data-src="\/discovery\/later-app-sheet-[0-9a-f]+\.html"><\/template>/,
  );
});

test('opened from the home screen, the name is not engraved again over its launch screen', () => {
  assert.match(
    read('src/lib/editionHead.js'),
    /display-mode: standalone\)'\)\.matches \|\| navigator\.standalone\) return/,
  );
});
