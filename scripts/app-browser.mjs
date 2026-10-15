// The publication as an app, in a browser (a local preview of the build):
// - the service worker takes the page, keeps what is read, and opens it again
//   without a connection; a page it never kept shows the offline page, which
//   lists what was kept;
// - the manifest names icons that exist;
// - the launch screens set the name where the masthead sets it, at every width
//   an Apple screen has (lib/appLaunch.mjs), with overlay scrollbars as on iOS;
// - "Thêm vào màn hình chính" is shown, and opens its sheet, on an iPhone; not
//   in a browser that cannot install, and never from the home screen.
//
//   PERF_BASE_URL=http://127.0.0.1:4321 node scripts/app-browser.mjs
import assert from 'node:assert/strict';
import { DEVICES, namePlace } from '../src/lib/appLaunch.mjs';

const { chromium } = await import(process.env.PERF_PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.PERF_BASE_URL || 'http://127.0.0.1:4321');
if (!['127.0.0.1', 'localhost'].includes(base.hostname)) throw new Error('Use a local preview');
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const local = (route) =>
  new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort();
try {
  // ---------- the worker ----------
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/*', local);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base.href, { waitUntil: 'load' });
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 20_000,
    });
    const preload = await page.evaluate(async () =>
      (await navigator.serviceWorker.ready).navigationPreload?.getState(),
    );
    assert.equal(preload?.enabled, true, 'navigation preload');
    const essay = await page.locator('.cover__title a').getAttribute('href');
    await page.goto(new URL(essay, base).href, { waitUntil: 'load' });
    await page.waitForFunction(
      async (path) =>
        (await (await caches.open('pensees-pages')).keys()).some((request) =>
          request.url.endsWith(path),
        ),
      essay,
    );
    await context.setOffline(true);
    await page.goto(new URL(essay, base).href, { waitUntil: 'load' });
    assert.ok(await page.locator('.prose').isVisible(), 'a page read opens offline');
    await page.goto(new URL('/books', base).href, { waitUntil: 'load' });
    assert.equal(await page.locator('h1').textContent(), 'Ngoại tuyến');
    await page.waitForFunction(() => document.querySelectorAll('[data-kept] li').length > 0);
    assert.equal(await page.locator(`[data-kept] a[href="${essay}"]`).count(), 1);
    await context.setOffline(false);
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS worker: controls the page, keeps what is read, offline page lists it');
  }

  // ---------- the manifest ----------
  {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const manifest = await (
      await context.request.get(new URL('/manifest.webmanifest', base).href)
    ).json();
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.short_name, 'Pensées');
    for (const purpose of ['any', 'maskable', 'monochrome'])
      assert.ok(
        manifest.icons.some((icon) => icon.purpose === purpose),
        purpose,
      );
    for (const icon of manifest.icons) {
      const response = await context.request.get(new URL(icon.src, base).href);
      assert.ok(response.ok(), icon.src);
    }
    await context.close();
    console.log('PASS manifest: standalone, icons for every purpose, all present');
  }

  // ---------- the launch screens ----------
  {
    const widths = [...new Set(DEVICES.flatMap(({ w, h }) => [w, h]))];
    const context = await browser.newContext({
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    await context.route('**/*', local);
    const page = await context.newPage();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base.href, { waitUntil: 'load' });
      const { x, y, size } = await page.evaluate(() => {
        const box = document.querySelector('.wordmark a').getBoundingClientRect();
        return {
          x: box.x,
          y: box.y + scrollY,
          size: Number.parseFloat(getComputedStyle(document.querySelector('.wordmark')).fontSize),
        };
      });
      const place = namePlace(width);
      assert.ok(Math.abs(place.y - y) < 0.5, `top at ${width}: ${place.y} / ${y}`);
      assert.ok(Math.abs(place.em - size) < 0.05, `size at ${width}: ${place.em} / ${size}`);
      if (place.x !== null) assert.ok(Math.abs(place.x - x) < 0.5, `left at ${width}`);
      const launch = await context.request.get(
        new URL(
          `/brand/launch/${DEVICES[0].w}x${DEVICES[0].h}@${DEVICES[0].dpr}-portrait-light.png`,
          base,
        ).href,
      );
      assert.ok(launch.ok());
    }
    await context.close();
    console.log(
      `PASS launch screens: the name where the masthead sets it, at ${widths.length} widths`,
    );
  }

  // ---------- adding it to a home screen ----------
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      screen: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: IPHONE,
      serviceWorkers: 'block',
    });
    await context.route('**/*', local);
    const page = await context.newPage();
    await page.goto(base.href, { waitUntil: 'load' });
    await page.waitForFunction(
      () => document.querySelectorAll('[data-install-entry]:not([hidden])').length === 2,
    );
    assert.equal(await page.locator('link[rel="apple-touch-startup-image"]').count(), 4);
    const install = page.locator('.colophon [data-install]');
    await install.scrollIntoViewIfNeeded();
    await install.click();
    await page.waitForFunction(() => document.querySelector('[data-app-sheet]')?.open === true);
    assert.ok(await page.locator('[data-app-sheet] [data-for="ios"]').isVisible());
    assert.ok(await page.locator('[data-app-sheet] [data-for="mac"]').isHidden());
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('[data-app-sheet]').open === false);
    assert.equal(
      await page.evaluate(() => document.activeElement?.hasAttribute('data-install')),
      true,
    );
    await context.close();

    // From the home screen, and in a browser that cannot install, nothing is offered.
    for (const options of [
      { viewport: { width: 1440, height: 900 } },
      {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        userAgent: IPHONE,
        standalone: true,
      },
    ]) {
      const { standalone, ...rest } = options;
      const other = await browser.newContext({ ...rest, serviceWorkers: 'block' });
      await other.route('**/*', local);
      const plain = await other.newPage();
      if (standalone)
        await plain.addInitScript(() =>
          Object.defineProperty(navigator, 'standalone', { value: true }),
        );
      await plain.goto(base.href, { waitUntil: 'load' });
      await plain.waitForTimeout(400);
      assert.equal(await plain.locator('[data-install-entry]:not([hidden])').count(), 0);
      await other.close();
    }
    console.log(
      'PASS home screen: offered and explained on an iPhone; not elsewhere, nor once installed',
    );
  }
} finally {
  await browser.close();
}
