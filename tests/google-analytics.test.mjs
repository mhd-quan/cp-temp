import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatSession,
  installGoogleAnalytics,
  parseClient,
  parseSession,
} from '../src/lib/googleAnalytics.mjs';

const T0 = Date.UTC(2026, 9, 15, 3, 0, 0);

class FakeDocument extends EventTarget {
  constructor(cookies = []) {
    super();
    this.title = 'Initial page';
    this.referrer = 'https://example.org/referrer';
    this.visibilityState = 'visible';
    this.jar = new Map(cookies.map((pair) => pair.split(/=(.*)/s).slice(0, 2)));
    this.writes = [];
    this.documentElement = { scrollHeight: 4000 };
  }

  get cookie() {
    return [...this.jar].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  set cookie(line) {
    this.writes.push(line);
    const [pair] = line.split('; ');
    const [name, value] = pair.split(/=(.*)/s);
    this.jar.set(name, value);
  }
}

class FakeWindow extends EventTarget {
  constructor(href = 'https://example.org/') {
    super();
    this.location = { href, hostname: new URL(href).hostname };
    this.screen = { width: 390, height: 844 };
    this.innerHeight = 800;
    this.scrollY = 0;
    this.beacons = [];
    this.navigator = {
      language: 'vi-VN',
      sendBeacon: (url) => {
        this.beacons.push(Object.fromEntries(new URL(url).searchParams));
        return true;
      },
    };
    this.frames = new Map();
    this.idles = new Map();
    this.timers = new Map();
    this.nextId = 1;
    this.requestAnimationFrame = (callback) => this.#add(this.frames, callback);
    this.cancelAnimationFrame = (id) => this.frames.delete(id);
    this.requestIdleCallback = (callback, options) => this.#add(this.idles, callback, options);
    this.cancelIdleCallback = (id) => this.idles.delete(id);
    this.setTimeout = (callback) => this.#add(this.timers, callback);
    this.clearTimeout = (id) => this.timers.delete(id);
  }

  #add(queue, callback, options) {
    const id = this.nextId++;
    queue.set(id, { callback, options });
    return id;
  }

  runNext(queue) {
    const entry = queue.entries().next().value;
    assert.ok(entry, 'Expected a scheduled callback');
    const [id, task] = entry;
    queue.delete(id);
    task.callback();
    return task;
  }

  /** The two frames after the first paint, then the idle wait. */
  settle() {
    this.runNext(this.frames);
    this.runNext(this.frames);
    return this.runNext(this.idles);
  }
}

const install = (document, window, clock = { t: T0 }) =>
  installGoogleAnalytics({
    document,
    window,
    measurementId: 'G-TEST',
    now: () => clock.t,
    random: () => 0.5,
  });

test('reads and writes the cookies gtag.js keeps, in both of its session formats', () => {
  assert.equal(parseClient('GA1.1.1234567890.1700000000'), '1234567890.1700000000');
  assert.equal(parseClient('GA1.2.1.2'), '1.2');
  assert.equal(parseClient('nonsense'), null);
  assert.deepEqual(parseSession('GS1.1.1700000000.4.1.1700000300.0.0.0'), {
    sid: 1700000000,
    sct: 4,
    seg: 1,
    last: 1700000300,
  });
  const session = { sid: 1700000000, sct: 5, seg: 0, last: 1700000123 };
  assert.equal(formatSession(session), 'GS2.1.s1700000000$o5$g0$t1700000123$j0$l0$h0');
  assert.deepEqual(parseSession(formatSession(session)), session);
  assert.equal(parseSession('GS2.1.garbage'), null);
});

test('a first visit sends one page view after paint and idle time, opening the visit and the session', () => {
  const document = new FakeDocument();
  const window = new FakeWindow();
  const first = install(document, window);
  assert.equal(install(document, window), first);
  assert.equal(window.beacons.length, 0, 'nothing is sent before the first paint');

  const idle = window.settle();
  assert.equal(idle.options.timeout, 2_000);
  assert.equal(window.beacons.length, 1);
  const [view] = window.beacons;
  assert.equal(view.v, '2');
  assert.equal(view.tid, 'G-TEST');
  assert.equal(view.en, 'page_view');
  assert.equal(view.dl, 'https://example.org/');
  assert.equal(view.dt, 'Initial page');
  assert.equal(view.dr, 'https://example.org/referrer');
  assert.equal(view.ul, 'vi-vn');
  assert.equal(view.sr, '390x844');
  assert.equal(view._s, '1');
  assert.equal(view.sid, String(T0 / 1000));
  assert.equal(view.sct, '1');
  assert.equal(view.seg, '0');
  assert.equal(view._fv, '1');
  assert.equal(view._ss, '1');
  assert.equal(view._nsi, '1');
  assert.match(view.cid, /^\d+\.\d+$/);
  // The client and the session are kept where gtag.js keeps them, for two years.
  assert.match(document.jar.get('_ga'), new RegExp(`^GA1\\.1\\.${view.cid.replace('.', '\\.')}$`));
  assert.match(document.jar.get('_ga_TEST'), /^GS2\.1\.s\d+\$o1\$g0\$t\d+/);
  assert.match(
    document.writes[0],
    /max-age=63072000; path=\/; domain=example\.org; samesite=lax; secure/,
  );
});

test('a reader already counted by gtag.js stays the same reader, and a second page engages the session', () => {
  const t = T0 / 1000;
  const document = new FakeDocument([
    '_ga=GA1.1.987654321.1690000000',
    `_ga_TEST=GS1.1.${t - 600}.7.0.${t - 60}.0.0.0`,
  ]);
  const window = new FakeWindow();
  install(document, window);
  window.settle();
  const [view] = window.beacons;
  assert.equal(view.cid, '987654321.1690000000');
  assert.equal(view.sid, String(t - 600));
  assert.equal(view.sct, '7');
  assert.equal(view.seg, '1');
  assert.equal(view._fv, undefined);
  assert.equal(view._ss, undefined);
});

test('half an hour without a hit starts a new session', () => {
  const t = T0 / 1000;
  const document = new FakeDocument([
    '_ga=GA1.1.1.1690000000',
    `_ga_TEST=GS2.1.s${t - 7200}$o3$g1$t${t - 1801}$j0$l0$h0`,
  ]);
  const window = new FakeWindow();
  install(document, window);
  window.settle();
  const [view] = window.beacons;
  assert.equal(view.sid, String(t));
  assert.equal(view.sct, '4');
  assert.equal(view.seg, '0');
  assert.equal(view._ss, '1');
  assert.equal(view._fv, undefined);
});

test('events wait behind the page view, then go at once; leaving sends the time spent', () => {
  const clock = { t: T0 };
  const document = new FakeDocument();
  const window = new FakeWindow();
  install(document, window, clock);
  window.gtag('event', 'quiz_start', { quiz_mode: 'nhanh' });
  assert.equal(window.beacons.length, 0);
  window.settle();
  assert.deepEqual(
    window.beacons.map((hit) => hit.en),
    ['page_view', 'quiz_start'],
  );
  assert.equal(window.beacons[1]['ep.quiz_mode'], 'nhanh');
  clock.t += 12_000;
  window.gtag('event', 'quiz_complete', { quiz_mode: 'nhanh', quiz_questions: 48 });
  const complete = window.beacons.at(-1);
  assert.equal(complete['epn.quiz_questions'], '48');
  assert.equal(complete._et, '12000');
  assert.equal(complete.seg, '1', 'ten seconds on a page engage the session');
  assert.equal(complete._s, '3');

  clock.t += 5_000;
  document.visibilityState = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));
  const leaving = window.beacons.at(-1);
  assert.equal(leaving.en, 'user_engagement');
  assert.equal(leaving._et, '5000');
  window.dispatchEvent(new Event('pagehide'));
  assert.equal(window.beacons.at(-1), leaving, 'a page already hidden sends nothing more');
});

test('an initially hidden page is counted at once', () => {
  const document = new FakeDocument();
  document.visibilityState = 'hidden';
  const window = new FakeWindow();
  install(document, window);
  assert.equal(window.beacons.length, 1);
  assert.equal(window.frames.size, 0);
});

test('without idle callbacks a timer is used, and a page left before it fires is still counted', () => {
  const document = new FakeDocument();
  const window = new FakeWindow();
  window.requestIdleCallback = undefined;
  window.cancelIdleCallback = undefined;
  install(document, window);
  window.runNext(window.frames);
  window.runNext(window.frames);
  assert.equal(window.timers.size, 1);
  assert.equal(window.beacons.length, 0);
  document.visibilityState = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(window.timers.size, 0);
  assert.equal(window.beacons[0].en, 'page_view');
});

test('never sends the fragment, where a shared quiz result travels', () => {
  const document = new FakeDocument();
  document.referrer = 'https://example.org/from#k=1.AAAAAAAAAAAAAA';
  const window = new FakeWindow(
    'https://example.org/the-nghiem/la-ban-tu-tuong#k=1.gICAgICAgICAgI.nordic-model',
  );
  install(document, window);
  window.settle();
  const [view] = window.beacons;
  assert.equal(view.dl, 'https://example.org/the-nghiem/la-ban-tu-tuong');
  assert.equal(view.dr, 'https://example.org/from');
});

test('a search landed on, a page read nine tenths down, a link out and a download are counted', () => {
  const document = new FakeDocument();
  const window = new FakeWindow('https://example.org/search?q=t%E1%BB%B1+do');
  install(document, window);
  window.settle();
  assert.deepEqual(
    window.beacons.map((hit) => hit.en),
    ['page_view', 'view_search_results'],
  );
  assert.equal(window.beacons[1]['ep.search_term'], 'tự do');

  window.scrollY = 3000;
  window.dispatchEvent(new Event('scroll'));
  window.dispatchEvent(new Event('scroll'));
  const scrolls = window.beacons.filter((hit) => hit.en === 'scroll');
  assert.equal(scrolls.length, 1);
  assert.equal(scrolls[0]['epn.percent_scrolled'], '90');

  const link = (href, text = '', className = '') => ({
    href,
    id: '',
    textContent: text,
    getAttribute: (name) => (name === 'class' ? className : null),
  });
  const dispatch = (anchor) => {
    const event = new Event('click');
    Object.defineProperty(event, 'target', { value: { closest: () => anchor } });
    document.dispatchEvent(event);
  };
  dispatch(link('https://substack.com/@pensees', 'Substack', 'external'));
  const out = window.beacons.at(-1);
  assert.equal(out.en, 'click');
  assert.equal(out['ep.link_domain'], 'substack.com');
  assert.equal(out['ep.outbound'], 'true');
  assert.equal(out['ep.link_classes'], 'external');

  dispatch(link('https://example.org/downloads/essays/tet-a-chet.pdf', ' Tải bản  PDF '));
  const download = window.beacons.at(-1);
  assert.equal(download.en, 'file_download');
  assert.equal(download['ep.file_extension'], 'pdf');
  assert.equal(download['ep.file_name'], '/downloads/essays/tet-a-chet.pdf');
  assert.equal(download['ep.link_text'], 'Tải bản PDF');

  const before = window.beacons.length;
  dispatch(link('https://example.org/essays'));
  dispatch(link('mailto:letters@example.org'));
  assert.equal(
    window.beacons.length,
    before,
    'a link within the site, or a letter, is not an event',
  );
});

test('a reader who has opted out of Google Analytics sends nothing', () => {
  const document = new FakeDocument();
  const window = new FakeWindow();
  window['ga-disable-G-TEST'] = true;
  install(document, window);
  window.settle();
  window.gtag('event', 'quiz_start', {});
  assert.equal(window.beacons.length, 0);
  assert.equal(document.writes.length, 0);
});
