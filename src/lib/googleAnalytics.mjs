// Google Analytics 4, without gtag.js.
//
// gtag.js came to 179 KB over the wire and 533 KB of script for the phone to
// parse, on a page of 25 KB, to send a few lines of measurement. This sends
// those same lines itself: the hits gtag.js sends to /g/collect (a page view,
// the session's start and the visit's first, the time a reader spent, how far
// they scrolled, a link out or a download, the compass's own events), from
// the cookies gtag.js keeps (_ga, the client; _ga_<id>, the session), so a
// reader counted before is the same reader now, and would be again if gtag.js
// came back. What only gtag.js does (Google signals, consent mode, page views
// counted on every change of address) is not done.

const STATE = '__tcpGoogleAnalytics';
const ENDPOINT = 'https://www.google-analytics.com/g/collect';
/** A session ends after half an hour with nothing sent (Google Analytics' default). */
const SESSION_SECONDS = 30 * 60;
/** gtag.js keeps its cookies for two years, renewed on every hit. */
const COOKIE_SECONDS = 2 * 365 * 24 * 60 * 60;
/** A session is engaged once a reader has spent ten seconds on a page, or opens a second. */
const ENGAGED_MS = 10_000;
const DOWNLOAD =
  /\.(pdf|xlsx?|docx?|txt|rtf|csv|exe|key|pps|pptx?|7z|pkg|rar|gz|zip|avi|mov|mp4|mpe?g|wmv|midi?|mp3|wav|wma|epub)$/i;
const SEARCH_PARAMS = ['q', 's', 'search', 'query', 'keyword'];

// The fragment never leaves the browser: a shared quiz result lives there (#k=…).
const withoutFragment = (url) => url.split('#')[0];

/** The client id in gtag.js's _ga cookie (GA1.1.<random>.<seconds>). */
export function parseClient(value) {
  return value?.match(/^GA1\.\d+\.(\d+\.\d+)$/)?.[1] ?? null;
}

/** The session in gtag.js's _ga_<id> cookie, in either of its formats (GS1 dotted, GS2 by letter). */
export function parseSession(value) {
  if (!value) return null;
  const gs2 = value.match(/^GS2\.\d+\.(.+)$/);
  if (gs2) {
    const fields = Object.fromEntries(
      gs2[1].split('$').map((field) => [field[0], Number(field.slice(1))]),
    );
    if (!fields.s || !fields.o || !fields.t) return null;
    return { sid: fields.s, sct: fields.o, seg: fields.g ? 1 : 0, last: fields.t };
  }
  const gs1 = value.match(/^GS1\.\d+\.(\d+)\.(\d+)\.([01])\.(\d+)/);
  if (gs1) return { sid: +gs1[1], sct: +gs1[2], seg: +gs1[3], last: +gs1[4] };
  return null;
}

export function formatSession({ sid, sct, seg, last }) {
  return `GS2.1.s${sid}$o${sct}$g${seg}$t${last}$j0$l0$h0`;
}

function cookie(document, name) {
  for (const part of document.cookie.split('; '))
    if (part.startsWith(`${name}=`)) return decodeURIComponent(part.slice(name.length + 1));
  return undefined;
}

/**
 * Counts this page: a page view once the page has painted and the browser is
 * idle (sooner if the page is being left), then what the reader does on it.
 * `window.gtag('event', name, params)` sends an event, as it did with gtag.js.
 */
export function installGoogleAnalytics({
  document,
  window,
  measurementId,
  idleTimeout = 2_000,
  now = () => Date.now(),
  random = Math.random,
}) {
  if (window[STATE]) return window[STATE];
  const navigator = window.navigator ?? {};
  const location = window.location;
  const sessionCookie = `_ga_${measurementId.replace(/^G-/, '')}`;
  const debug = (() => {
    try {
      return window.localStorage?.getItem('pensees-analytics-debug') === '1';
    } catch {
      return false;
    }
  })();
  const optedOut = () =>
    window[`ga-disable-${measurementId}`] === true || window._gaUserPrefs?.ioo?.() === true;

  // The reader and the session, as gtag.js left them or new.
  const started = Math.floor(now() / 1000);
  const known = parseClient(cookie(document, '_ga'));
  const client = known ?? `${Math.floor(random() * 2_147_483_647) + 1}.${started}`;
  const previous = parseSession(cookie(document, sessionCookie));
  const freshSession = !previous || started - previous.last > SESSION_SECONDS;
  const session = freshSession
    ? { sid: started, sct: (previous?.sct ?? 0) + 1, seg: 0, last: started }
    : // A second page in one session is an engaged session.
      { ...previous, seg: 1 };
  const flags = { _fv: !known, _ss: freshSession, _nsi: freshSession };
  const page = Math.floor(random() * 2_147_483_647) + 1;
  let hits = 0;

  const remember = (seconds) => {
    session.last = seconds;
    const domain = location.hostname.replace(/^www\./, '');
    const tail = `; max-age=${COOKIE_SECONDS}; path=/; domain=${domain}; samesite=lax; secure`;
    document.cookie = `_ga=GA1.1.${client}${tail}`;
    document.cookie = `${sessionCookie}=${formatSession(session)}${tail}`;
  };

  // Time spent with the page in view, sent with each hit as gtag.js does (_et).
  let shownSince = document.visibilityState === 'visible' ? now() : null;
  let spent = 0;
  let spentOnPage = 0;
  const engagement = () => {
    if (shownSince !== null) {
      const at = now();
      spent += at - shownSince;
      shownSince = at;
    }
    const time = Math.round(spent);
    spentOnPage += time;
    spent = 0;
    if (spentOnPage >= ENGAGED_MS) session.seg = 1;
    return time;
  };

  const transmit = (url) => {
    if (debug)
      window.console?.debug?.('[analytics]', Object.fromEntries(new URL(url).searchParams));
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url)) return;
    window.fetch?.(url, { method: 'POST', keepalive: true, mode: 'no-cors' }).catch(() => {});
  };

  const hit = (name, params = {}) => {
    if (optedOut()) return;
    const time = engagement();
    if (name === 'user_engagement' && time <= 0) return;
    remember(Math.floor(now() / 1000));
    const query = new URLSearchParams({
      v: '2',
      tid: measurementId,
      _p: String(page),
      cid: client,
      ul: (navigator.language ?? '').toLowerCase(),
      sr: `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
      _s: String(++hits),
      sid: String(session.sid),
      sct: String(session.sct),
      seg: String(session.seg),
      dl: withoutFragment(location.href),
      dt: document.title,
      en: name,
    });
    if (name === 'page_view' && document.referrer)
      query.set('dr', withoutFragment(document.referrer));
    if (hits === 1) for (const [flag, on] of Object.entries(flags)) if (on) query.set(flag, '1');
    if (time > 0) query.set('_et', String(time));
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      query.set(typeof value === 'number' ? `epn.${key}` : `ep.${key}`, String(value));
    }
    if (debug) query.set('_dbg', '1');
    transmit(`${ENDPOINT}?${query}`);
  };

  // Until the page view has gone, events wait behind it.
  let queue = [];
  const state = { sent: false, client, session, track: undefined, flush: undefined };
  const track = (name, params) => {
    if (queue) queue.push([name, params]);
    else hit(name, params);
  };
  state.track = track;
  window.gtag = (command, name, params) => {
    if (command === 'event' && typeof name === 'string') track(name, params ?? {});
  };
  window[STATE] = state;

  let frameId;
  let idleId;
  let timerId;
  const flush = () => {
    if (!queue) return;
    if (frameId !== undefined) window.cancelAnimationFrame(frameId);
    if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
    if (timerId !== undefined) window.clearTimeout(timerId);
    const waiting = queue;
    queue = null;
    state.sent = true;
    hit('page_view');
    const term = SEARCH_PARAMS.map((key) => new URL(location.href).searchParams.get(key)).find(
      Boolean,
    );
    if (term) hit('view_search_results', { search_term: term });
    for (const [name, params] of waiting) hit(name, params);
  };
  state.flush = flush;

  if (document.visibilityState === 'hidden') flush();
  else
    frameId = window.requestAnimationFrame(() => {
      frameId = window.requestAnimationFrame(() => {
        frameId = undefined;
        if (typeof window.requestIdleCallback === 'function')
          idleId = window.requestIdleCallback(flush, { timeout: idleTimeout });
        else timerId = window.setTimeout(flush, 0);
      });
    });

  // Leaving: the time spent since the last hit goes with the reader (user_engagement).
  const leave = () => {
    flush();
    if (shownSince === null) return;
    hit('user_engagement');
    shownSince = null;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leave();
    else shownSince = now();
  });
  window.addEventListener('pagehide', leave);

  // Read to the end: once a page has been scrolled nine tenths of the way down.
  let scrolled = false;
  const reach = () => {
    if (scrolled) return;
    const root = document.documentElement;
    if (root.scrollHeight <= window.innerHeight) return;
    if (window.scrollY + window.innerHeight < root.scrollHeight * 0.9) return;
    scrolled = true;
    window.removeEventListener('scroll', reach);
    track('scroll', { percent_scrolled: 90 });
  };
  window.addEventListener('scroll', reach, { passive: true });

  // A link out of the site, or a file taken away.
  document.addEventListener(
    'click',
    (event) => {
      const link = event.target?.closest?.('a[href]');
      if (!link) return;
      let url;
      try {
        url = new URL(link.href, location.href);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol)) return;
      const about = {
        link_id: link.id || undefined,
        link_classes: link.getAttribute('class') || undefined,
        link_url: url.href,
      };
      const file = url.pathname.match(DOWNLOAD);
      if (file)
        track('file_download', {
          ...about,
          file_extension: file[1].toLowerCase(),
          file_name: url.pathname,
          link_text: link.textContent.trim().replace(/\s+/g, ' ').slice(0, 100) || undefined,
        });
      else if (url.hostname !== location.hostname)
        track('click', { ...about, link_domain: url.hostname, outbound: 'true' });
    },
    { capture: true, passive: true },
  );

  return state;
}
