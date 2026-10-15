// Desktop reading-scroll benchmark (v1.1.1). The homepage is scrolled the way
// it is read with a wheel: four notches, a pause to read, four more, to the
// end, while the mouse rests on the page (or, with SCROLL_MOUSE=0, off it).
// Reports the main thread's style, layout, paint and layerizing, raster,
// lamps lit and pages fetched that no one pointed at.
//
//   node scripts/scroll-bench.mjs [dist] [label] [runs]
//
// Headless Chromium rasters in software: compare builds with each other, not
// with the frame rate of a real screen.
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const { chromium } = await import(process.env.PERF_PLAYWRIGHT_MODULE || 'playwright');
const [directory = 'dist', label = 'scroll', runs = '2'] = process.argv.slice(2);
const root = path.resolve(directory);
const mouse = process.env.SCROLL_MOUSE !== '0';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const server = http.createServer(async (req, res) => {
  try {
    let file = path.resolve(root, `.${decodeURIComponent(new URL(req.url, 'http://x').pathname)}`);
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Invalid path');
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(await fs.readFile(file));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--enable-smooth-scrolling'],
});
try {
  for (let run = 0; run < Number(runs); run++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const requests = [];
    page.on('request', (request) => requests.push(request));
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === base ? route.continue() : route.abort(),
    );
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    // A good desktop line: 40 Mbps, 40 ms.
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 40,
      downloadThroughput: 5_000_000,
      uploadThroughput: 1_000_000,
    });
    await page.goto(`${base}/`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    if (mouse) await page.mouse.move(720, 520);
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const bench = { gaps: [], lit: 0, last: performance.now() };
      window.__scrollBench = bench;
      const tick = (now) => {
        bench.gaps.push(now - bench.last);
        bench.last = now;
        bench.frame = requestAnimationFrame(tick);
      };
      bench.frame = requestAnimationFrame(tick);
      new MutationObserver((records) => {
        for (const record of records) if (record.target.hasAttribute('data-lit')) bench.lit++;
      }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-lit'] });
    });
    const before = requests.length;
    await cdp.send('Tracing.start', {
      categories: 'devtools.timeline,disabled-by-default-devtools.timeline,cc',
      transferMode: 'ReturnAsStream',
    });
    // The end is read again after each pause: modules laid out only when they come near
    // (content-visibility) take their own height as they are reached.
    const end = () => page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let y = 0; y < (await end()) - 2; y = await page.evaluate(() => scrollY)) {
      for (let notch = 0; notch < 4; notch++) {
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(650);
    }
    const finished = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
    await cdp.send('Tracing.end');
    const { stream } = await finished;
    let trace = '';
    for (;;) {
      const chunk = await cdp.send('IO.read', { handle: stream });
      trace += chunk.data;
      if (chunk.eof) break;
    }
    const frames = await page.evaluate(() => {
      const bench = window.__scrollBench;
      cancelAnimationFrame(bench.frame);
      return {
        frames: bench.gaps.length,
        long: bench.gaps.filter((gap) => gap > 25).length,
        lit: bench.lit,
      };
    });
    const events = JSON.parse(trace).traceEvents.filter((event) => event.ph === 'X');
    const counts = new Map();
    for (const event of events)
      if (event.name === 'Paint' || event.name === 'UpdateLayoutTree')
        counts.set(`${event.pid}:${event.tid}`, (counts.get(`${event.pid}:${event.tid}`) ?? 0) + 1);
    const main = [...counts].sort((a, b) => b[1] - a[1])[0][0];
    const pid = Number(main.split(':')[0]);
    const total = (name, own = true) =>
      Math.round(
        events
          .filter(
            (event) =>
              event.name === name &&
              (own ? `${event.pid}:${event.tid}` === main : event.pid === pid),
          )
          .reduce((sum, event) => sum + event.dur, 0) / 1000,
      );
    const fetched = requests
      .slice(before)
      .filter((request) => ['document', 'other'].includes(request.resourceType()))
      .map((request) => new URL(request.url()).pathname);
    console.log(
      label,
      run,
      JSON.stringify({
        styleMs: total('UpdateLayoutTree'),
        layoutMs: total('Layout'),
        paintMs: total('Paint'),
        layerizeMs: total('Layerize'),
        rasterMs: total('RasterTask', false),
        ...frames,
        fetched,
      }),
    );
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
