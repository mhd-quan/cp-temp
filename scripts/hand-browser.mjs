// Browser check (v1.1.1): hover answers a hand that moves, never the page
// scrolling beneath a resting one (src/lib/editionHand.ts), and links are
// fetched on intent (src/lib/editionSpeculation.ts).
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
});
const rules = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('script[type="speculationrules"]')].map((script) =>
      JSON.parse(script.textContent),
    ),
  );
try {
  const context = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width: 1440, height: 900 },
  });
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort(),
  );
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base.href);
  await page.evaluate(() => document.fonts.ready);
  assert.deepEqual(await rules(page), [], 'nothing is speculated before intent');

  // A hand that moves onto a story lights its lamp, and a moment later the
  // essay is prerendered.
  const story = page.locator('[data-issue] .story').nth(2);
  await story.scrollIntoViewIfNeeded();
  const box = await story.locator('.plate').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await page.waitForFunction(() => document.querySelector('.plate[data-lit]'));
  await page.mouse.move(box.x + box.width / 2 + 2, box.y + box.height / 2 + 2);
  await page.waitForTimeout(300);
  const aimed = await rules(page);
  assert.equal(aimed.length, 1);
  assert.match(aimed[0].prerender[0].urls[0], /^\/essays\//);

  // The page scrolls under the resting hand: the root rests, the lamp goes
  // out, and nothing that slides under the hand is lit, underlined or fetched.
  await page.mouse.wheel(0, 700);
  await page.waitForFunction(() => 'resting' in document.documentElement.dataset);
  await page.waitForTimeout(700);
  assert.equal(await page.locator('.plate[data-lit]').count(), 0, 'the lamp waits for the hand');
  assert.equal((await rules(page)).length, 1, 'no link is fetched for sliding under the hand');
  const hovered = await page.evaluate(() => {
    const title = document.querySelector('.printed:hover .title-link');
    return title ? getComputedStyle(title).backgroundSize : null;
  });
  if (hovered) assert.match(hovered, /^0(px|%)? /, 'no underline under a resting hand');

  // The hand moves: the page answers it again.
  const point = await page.evaluate(() => {
    const plates = [...document.querySelectorAll(':is(.printed, .slip) .plate')];
    const visible = plates.find((plate) => {
      const rect = plate.getBoundingClientRect();
      const middle = rect.top + rect.height / 2;
      return middle > 120 && middle < innerHeight - 20 && rect.width > 60;
    });
    const rect = visible?.getBoundingClientRect();
    return rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  assert.ok(point, 'a story is in view after the scroll');
  await page.mouse.move(point.x, point.y, { steps: 3 });
  await page.waitForFunction(() => !('resting' in document.documentElement.dataset));
  await page.waitForFunction(() => document.querySelector('.plate[data-lit]'));

  // A press fetches at once.
  const link = page.locator('[data-issue] .story .title-link').nth(4);
  await link.scrollIntoViewIfNeeded();
  const href = await link.getAttribute('href');
  await link.dispatchEvent('pointerdown', { button: 0, pointerType: 'mouse', bubbles: true });
  assert.ok(
    (await rules(page)).some((rule) => rule.prerender?.[0].urls[0] === href),
    'a pressed essay is prerendered',
  );
  assert.ok((await rules(page)).filter((rule) => rule.prerender).length <= 2);
  assert.deepEqual(errors, []);
  console.log('PASS 1440px: lamp, resting hand, hover gating, speculation on intent');
  await context.close();

  // A phone scrolls without a hover state to protect: the root never rests.
  const phone = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width: 390, height: 663 },
    isMobile: true,
    hasTouch: true,
  });
  await phone.route('**/*', (route) =>
    new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort(),
  );
  const mobile = await phone.newPage();
  await mobile.goto(base.href);
  await mobile.evaluate(() => scrollBy(0, 900));
  await mobile.waitForTimeout(300);
  assert.equal(await mobile.evaluate(() => 'resting' in document.documentElement.dataset), false);
  assert.deepEqual(await rules(mobile), []);
  console.log('PASS 390px: no resting state on touch, nothing speculated while scrolling');
  await phone.close();
} finally {
  await browser.close();
}
