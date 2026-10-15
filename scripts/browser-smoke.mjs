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
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      serviceWorkers: 'block',
      viewport: { width, height: width === 390 ? 663 : 1000 },
      reducedMotion: 'reduce',
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort(),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base.href);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('link[as="font"][rel="preload"]').count(), 4);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    await page.locator('[data-home-discovery]').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('[data-home-discovery-image] img').count(), 1);
    const topic = page.locator('[data-filter] [data-topic]').nth(1);
    const topicName = await topic.getAttribute('data-topic');
    await topic.click();
    assert.equal(await topic.getAttribute('aria-pressed'), 'true');
    assert.ok(new URL(page.url()).searchParams.has('chu-de'));
    // The stories beyond the first eight are fetched when the filter is reached for.
    await page.waitForFunction(
      (name) => document.querySelector('[data-filter-status]').textContent.endsWith(name),
      topicName,
    );
    assert.equal(await page.locator('template[data-later="issue"]').count(), 0);
    const visibleTopics = await page
      .locator('[data-issue] .story:not([hidden])')
      .evaluateAll((stories) => stories.map((story) => story.dataset.topics.split('|')));
    assert.ok(visibleTopics.length > 0 && visibleTopics.length <= 8);
    assert.ok(visibleTopics.every((topics) => topics.includes(topicName)));
    await page.locator('[data-filter] [data-topic=""]').click();
    await page.waitForFunction(() =>
      document.querySelector('[data-filter-status]').textContent.endsWith('bài mới nhất'),
    );
    assert.equal(await page.locator('[data-issue] .story:not([hidden])').count(), 8);
    const tabs = page.locator('[data-volume-tabs] [role="tab"]');
    await tabs.nth(1).click();
    assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
    // The other series are fetched when the decks come near; the chosen one is dealt.
    const panel = await tabs.nth(1).getAttribute('aria-controls');
    await page.waitForFunction((id) => document.getElementById(id)?.hidden === false, panel);
    assert.equal(await page.locator('.volumes [role="tabpanel"]:not([hidden])').count(), 1);
    await tabs.nth(1).focus();
    await page.keyboard.press('Home');
    assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
    const destination = await page.locator('[data-home-discovery-link]').getAttribute('href');
    await page.locator('[data-home-discovery-link]').click();
    await page.waitForURL(`**${destination}`);
    await page.waitForFunction(() => document.documentElement.dataset.reader === 'true');
    await page.goBack();
    await page.waitForURL(base.href);
    await page.locator('[data-filter] [data-topic]').nth(1).click();
    assert.equal(
      await page.locator('[data-filter] [data-topic]').nth(1).getAttribute('aria-pressed'),
      'true',
    );
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${width}px: fonts, overflow, topic filter, series tabs/keyboard, article/back/reinitialize`,
    );
    await context.close();
  }
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort(),
  );
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-01-01T12:00:00Z'));
  await page.goto(base.href);
  const fallback = await page.locator('[data-home-discovery]').getAttribute('data-essay-id');
  let requests = 0;
  await page.route('**/discovery/*.json', (route) => {
    requests++;
    return route.fulfill({ status: 503, body: 'Temporarily unavailable' });
  });
  await page.locator('[data-home-discovery]').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-home-discovery] img').complete);
  await page.waitForTimeout(200);
  assert.ok(requests > 0);
  assert.equal(await page.locator('[data-home-discovery]').getAttribute('data-essay-id'), fallback);
  await page.unroute('**/discovery/*.json');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(
    () => document.querySelector('[data-home-discovery]').dataset.discoveryDay === '2026-01-01',
  );
  await page.clock.setFixedTime(new Date('2026-01-01T17:00:00Z'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(
    () => document.querySelector('[data-home-discovery]').dataset.discoveryDay === '2026-01-02',
  );
  console.log(
    'PASS discovery: failed HTTP keeps fallback; focus retries; Vietnam midnight rotates',
  );
  await context.close();
} finally {
  await browser.close();
}
