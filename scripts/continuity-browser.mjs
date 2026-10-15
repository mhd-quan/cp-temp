// Browser check (v1.2.0): the appearance, and the reader's continuity.
// - The appearance is three glyphs; the chosen tile follows the root's theme,
//   and a change spreads from the control that made it (data-appearing).
// - A page restored from the back/forward cache, or open in another tab,
//   takes the appearance and the reader's paper chosen since.
// - The front page offers the essay left half read, once in a visit, and
//   leads to its paragraph, which is marked on arrival.
// - Near the end of an essay the essays after it are fetched (documents only).
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PERF_PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.PERF_BASE_URL || 'http://127.0.0.1:4321');
if (!['127.0.0.1', 'localhost'].includes(base.hostname)) throw new Error('Use a local preview');

// Service workers are blocked here: these checks route requests, which a worker's own
// fetches would pass by. scripts/app-browser.mjs checks the worker itself.
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  // Playwright turns the back/forward cache off; this check is about it.
  ignoreDefaultArgs: ['--disable-back-forward-cache'],
});
const local = (context) =>
  context.route('**/*', (route) =>
    new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort(),
  );
const follow = (page, href) =>
  page.evaluate((url) => {
    const link = Object.assign(document.createElement('a'), { href: url });
    document.body.append(link);
    link.click();
  }, new URL(href, base).href);
const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme ?? 'auto');

try {
  // ---------- appearance ----------
  const context = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width: 1280, height: 860 },
  });
  await local(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(new URL('/about', base).href);
  await page.evaluate(() => {
    window.__kept = true;
  });
  const tray = page.locator('.colophon .appearance');
  assert.equal(await tray.locator('label').count(), 3);
  // Glyphs only: every word in the tray is in a hidden label.
  assert.ok(
    await tray
      .locator('label')
      .evaluateAll((labels) =>
        labels.every(
          (label) =>
            label.querySelector('.glyph') &&
            [...label.querySelectorAll('span')].every((span) => span.matches('.sr-only')) &&
            [...label.childNodes].every((node) => node.nodeType !== 3 || !node.textContent.trim()),
        ),
      ),
    'the tray shows glyphs only',
  );
  assert.deepEqual(
    await tray
      .locator('input')
      .evaluateAll((inputs) => inputs.map((input) => input.labels[0].textContent.trim())),
    ['Sáng', 'Tối', 'Tự động, theo hệ thống'],
    'every glyph is named for a screen reader',
  );
  const tile = () =>
    tray.evaluate(
      (node) => getComputedStyle(node.querySelector('.appearance__tray'), '::before').translate,
    );
  // No choice stored: the system is followed, and the tile rests on its glyph,
  // the third (two cells of 44px and a gap of 2px along), from the first paint.
  assert.equal(await tile(), '92px');
  await tray.scrollIntoViewIfNeeded();
  await tray.locator('input[value="dark"]').evaluate((input) => input.click());
  await page.waitForFunction(() => 'appearing' in document.documentElement.dataset);
  // The chosen glyph turns once (and only on a change).
  await page.waitForFunction(() =>
    document.querySelector('.colophon .appearance [data-mode="dark"][data-turn]'),
  );
  assert.match(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--spread-from'),
    ),
    /^\d+px \d+px$/,
    'the new paper spreads from the control',
  );
  await page.waitForFunction(() => !('appearing' in document.documentElement.dataset));
  assert.equal(await theme(page), 'dark');

  // ---------- back/forward cache ----------
  await follow(page, '/privacy');
  await page.waitForURL('**/privacy');
  await page.locator('.colophon input[value="light"]').evaluate((input) => input.click());
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await page.goBack({ waitUntil: 'commit' });
  await page.waitForFunction(() => location.pathname === '/about');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__kept === true), true, 'restored from the cache');
  assert.equal(await theme(page), 'light', 'the restored page takes the appearance chosen since');
  assert.equal(
    await page.locator('.colophon input[value="light"]').isChecked(),
    true,
    'and its controls agree',
  );

  // Another tab changes it: this page follows.
  const other = await context.newPage();
  await other.goto(new URL('/privacy', base).href);
  await other.locator('.colophon input[value="dark"]').evaluate((input) => input.click());
  await other.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await other.close();
  assert.deepEqual(errors, []);
  await context.close();

  // ---------- continuity ----------
  const phone = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width: 390, height: 780 },
    isMobile: true,
    hasTouch: true,
  });
  await local(phone);
  const reader = await phone.newPage();
  const essay = '/essays/2026-02-02-cor-inquietum';
  await reader.goto(new URL(essay, base).href);
  await reader.waitForFunction(() => document.querySelector('[data-progress]'));
  const paragraph = await reader.evaluate(() => {
    const paragraphs = [...document.querySelectorAll('[data-prose] > p[id]')];
    const target = paragraphs[Math.floor(paragraphs.length / 2)];
    target.scrollIntoView({ block: 'start' });
    return target.id;
  });
  await reader.mouse.wheel(0, 40);
  await reader.waitForFunction(() => {
    const saved = JSON.parse(localStorage.getItem('pensees-reading-positions') ?? '{}');
    return Object.values(saved).some((position) => position.title && position.left);
  });
  const saved = await reader.evaluate(
    (path) => JSON.parse(localStorage.getItem('pensees-reading-positions'))[path],
    essay,
  );
  assert.equal(saved.title, await reader.locator('#essay-title').innerText());
  assert.ok(saved.left >= 1);
  assert.ok(saved.id);

  // Near the end, the essays either side are fetched: documents, not prerenders.
  await reader.evaluate(() =>
    document.querySelector('[data-article-end]').scrollIntoView({ block: 'end' }),
  );
  await reader.waitForFunction(() =>
    [...document.querySelectorAll('script[type="speculationrules"]')].some(
      (script) => 'prefetch' in JSON.parse(script.textContent),
    ),
  );
  const ahead = await reader.evaluate(() =>
    [...document.querySelectorAll('script[type="speculationrules"]')].map((script) =>
      JSON.parse(script.textContent),
    ),
  );
  assert.ok(
    ahead.every((rule) => !rule.prerender),
    'reading on never prerenders',
  );
  assert.ok(ahead.every((rule) => rule.prefetch[0].urls[0].startsWith('/essays/')));
  // Back to the middle, so the place is kept (reading to the end forgets it).
  await reader.evaluate(
    (id) => document.getElementById(id).scrollIntoView({ block: 'start' }),
    paragraph,
  );
  await reader.mouse.wheel(0, 40);
  await reader.waitForTimeout(1000);

  const front = await phone.newPage();
  await front.goto(base.href);
  const offer = front.locator('[data-return]');
  await offer.waitFor({ state: 'visible' });
  assert.equal(await offer.locator('[data-return-title]').innerText(), saved.title);
  assert.match(
    await offer.locator('[data-return-link]').getAttribute('href'),
    new RegExp(`^${essay}#`),
  );
  // Once in a visit.
  await front.reload();
  await front.waitForTimeout(1200);
  assert.equal(await offer.isVisible(), false, 'offered once in a visit');
  await front.evaluate(() => sessionStorage.removeItem('pensees-return-offered'));
  await front.reload();
  await offer.waitFor({ state: 'visible' });
  await offer.locator('[data-return-link]').click();
  await front.waitForURL(`**${essay}#*`);
  await front.waitForFunction(() => document.querySelector('[data-prose] [data-arrived]'));
  assert.equal(
    await front.locator('[data-return]').count(),
    0,
    'the essay has no front-page offer',
  );
  assert.equal(await front.locator('[data-resume-prompt]').isVisible(), false, 'a deep link wins');
  await phone.close();
  console.log('continuity browser check: ok');
} finally {
  await browser.close();
}
