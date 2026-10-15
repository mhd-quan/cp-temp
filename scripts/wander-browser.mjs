// Browser check: the first page's door cube turns by itself on a desktop and on a phone, drawn
// in a worker on an OffscreenCanvas (src/lib/quiz/doorScene.ts) while the page itself does no
// work: no element of the door changes as it turns. It turns only while it is on screen, eases
// to a stop for a hand or a key that comes to it and sets off again when they go. With reduced
// motion it is the page's still drawing, as it is on paper, and the door on Thể nghiệm never
// turns by itself.
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
const desktop = { viewport: { width: 1440, height: 900 } };
const phone = { viewport: { width: 390, height: 663 }, isMobile: true, hasTouch: true };

async function open(options, path = '/') {
  const context = await browser.newContext({ ...options, serviceWorkers: 'block' });
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort(),
  );
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(new URL(path, base).href);
  return { context, page, errors };
}
/** Whether what the screen shows of the cube changes in the next `ms` milliseconds. */
const moves = async (page, ms = 700) => {
  const box = await page.locator('.door__cube').boundingBox();
  const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
  const before = await page.screenshot({ clip });
  await page.waitForTimeout(ms);
  return !before.equals(await page.screenshot({ clip }));
};
/** Changes to the door's elements in the next `ms` milliseconds. */
const changes = (page, ms) =>
  page.evaluate(
    (wait) =>
      new Promise((resolve) => {
        let count = 0;
        const observer = new MutationObserver((records) => (count += records.length));
        observer.observe(document.querySelector('.door'), {
          attributes: true,
          childList: true,
          subtree: true,
        });
        setTimeout(() => {
          observer.disconnect();
          resolve(count);
        }, wait);
      }),
    ms,
  );
const toDoor = async (page) => {
  await page.locator('.door__cube').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
};
/** The canvas has taken the drawing's place, and is drawn beside the page (handed over). */
const handedOver = (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('.door .cube__canvas');
    if (!canvas) return false;
    try {
      canvas.getContext('2d');
      return false;
    } catch {
      return getComputedStyle(document.querySelector('.door .cube__plot')).visibility === 'hidden';
    }
  });

try {
  {
    const { context, page, errors } = await open(desktop);
    await toDoor(page);
    assert.ok(await moves(page), 'the cube turns by itself');
    assert.ok(await handedOver(page), 'drawn on a canvas a worker holds, over the drawing');
    assert.equal(await changes(page, 1000), 0, 'while it turns, nothing on the page changes');
    // A hand that rests on the cube stops it; when the hand goes it sets off again.
    const cube = await page.locator('.door__cube').boundingBox();
    await page.mouse.move(cube.x + cube.width / 2, cube.y + cube.height / 2, { steps: 6 });
    await page.waitForTimeout(3000);
    assert.equal(await moves(page), false, 'a hand on the cube stops it');
    await page.mouse.move(10, 10, { steps: 4 });
    await page.waitForTimeout(300);
    assert.ok(await moves(page), 'the hand gone, it turns again');
    // So does a key that comes to the door.
    await page.locator('#compass-title a').focus();
    await page.waitForTimeout(3000);
    assert.equal(await moves(page), false, 'a key on the door stops it');
    // On paper, the still drawing.
    await page.emulateMedia({ media: 'print' });
    assert.ok(
      await page.evaluate(
        () =>
          getComputedStyle(document.querySelector('.door .cube__canvas')).display === 'none' &&
          getComputedStyle(document.querySelector('.door .cube__plot')).visibility === 'visible',
      ),
      'printed, the drawing',
    );
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS 1440px: turns in a worker, page untouched, stops for a hand or a key');
  }
  {
    const { context, page, errors } = await open(phone);
    // On a phone the door is far down the page: until it is reached, nothing is started.
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.door .cube__canvas').count(), 0, 'not started off screen');
    await toDoor(page);
    assert.ok(await moves(page), 'on screen it turns');
    assert.ok(await handedOver(page));
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    await toDoor(page);
    // Scrolled away it stopped where it was, and sets off again from rest.
    assert.ok(await moves(page, 1000), 'back on screen it turns again');
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS 390px: started and turning only on screen');
  }
  for (const options of [
    { ...desktop, reducedMotion: 'reduce' },
    { ...phone, reducedMotion: 'reduce' },
  ]) {
    const { context, page } = await open(options);
    await toDoor(page);
    assert.equal(await moves(page, 1000), false, `still with reduced motion`);
    assert.equal(await page.locator('.door .cube__canvas').count(), 0, 'and no canvas');
    await context.close();
  }
  for (const options of [desktop, phone]) {
    const { context, page } = await open(options, '/the-nghiem');
    await toDoor(page);
    assert.equal(await moves(page, 1000), false, `Thể nghiệm's door is still`);
    await context.close();
  }
  console.log('PASS reduced motion and Thể nghiệm: still');
} finally {
  await browser.close();
}
