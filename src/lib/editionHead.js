// Ấn bản: the one script in the head of every page. EditionLayout minifies it
// at build time and inlines it, so it runs before the first frame and weighs
// little. Four jobs, each needed before anything is painted.
(() => {
  const root = document.documentElement;
  root.dataset.js = '';
  // Safari on iPhone shows a control as pressed (:active) only where a touch
  // is listened for: without this, no button on a phone ever gave under the
  // finger. It listens and does nothing, and never holds up a scroll.
  document.addEventListener('touchstart', () => {}, { passive: true });

  // 1. Appearance. One choice for the whole site; no stored choice means:
  // follow the system. Choices kept before the site opened to the public
  // (under pensees-edition-theme, many of them made while it was being built)
  // are let go once, so every reader starts on the system's light or dark; a
  // choice made since is kept. On an essay, the reader's preferences too.
  try {
    localStorage.removeItem('pensees-edition-theme');
    const saved = localStorage.getItem('pensees-theme');
    if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
    if (root.dataset.reader) {
      const prefs = JSON.parse(localStorage.getItem('pensees-edition-reader') || '{}');
      const device = matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop';
      if (prefs[`size-${device}`]) root.dataset.readSize = prefs[`size-${device}`];
      // Mona Sans left the reader's faces; its readers move to Bricolage.
      if (prefs.font) root.dataset.readFont = prefs.font === 'sans' ? 'grotesque' : prefs.font;
      if (prefs.measure) root.dataset.readMeasure = prefs.measure;
      if (prefs.leading) root.dataset.readLeading = prefs.leading;
      if (prefs.paper) root.dataset.readPaper = prefs.paper;
    }
  } catch {}

  // 2. Inking. A plate is blank paper until its image has arrived; then the
  // print is laid on it (foundation.css). One listener for every plate on the
  // page, in place of a handler on each image. A hidden page (a background
  // tab, an essay prerendered before it is opened) inks at once: decode()
  // waits for the page to be shown, and a prerendered cover must already be
  // printed when the page turns into view. A print is laid with a fade only
  // if it is in view; one that arrives out of sight (most of them: images
  // load a screen and a half ahead) is laid at once, 'quiet', so it is
  // simply there when it is scrolled to, and no fade runs where no one sees
  // it (each fade is an animated layer the compositor builds and tears down).
  // The intersection is read from an observer, never by measuring the page.
  let sight;
  const lay = (print) => {
    sight ??= new IntersectionObserver((entries) => {
      for (const entry of entries) {
        sight.unobserve(entry.target);
        entry.target.dataset.inked = entry.isIntersecting ? '' : 'quiet';
      }
    });
    sight.observe(print);
  };
  document.addEventListener(
    'load',
    (event) => {
      const image = event.target;
      const print = image instanceof HTMLImageElement && image.closest('.plate__print');
      if (!print) return;
      if (document.hidden) print.dataset.inked = '';
      else if (!print.hasAttribute('data-inked')) {
        const ink = () => lay(print);
        image.decode().then(ink, ink);
      }
    },
    true,
  );

  // 3. Page to page. The print of the story being opened becomes the essay's
  // cover: it is named essay-plate on both pages, and returns to its place on
  // the way back. The print already on screen is handed to the essay, to stand
  // in for its cover until the larger file has arrived, so the plate never
  // glides into blank paper. The transition is kept on window so the reader
  // can wait for the glide to finish before its own work.
  const KEY = 'edition:plate';
  const clean = (path) => path.replace(/\/$/, '') || '/';
  const plateFor = (path) => {
    for (const link of document.querySelectorAll(`.printed a[href="${path}"]`)) {
      const plate = link.closest('.printed')?.querySelector('.plate');
      if (plate && plate.getBoundingClientRect().height > 0) return plate;
    }
  };
  const name = (plate, transition) => {
    if (!plate) return;
    plate.style.viewTransitionName = 'essay-plate';
    transition.finished.finally(() => {
      plate.style.viewTransitionName = '';
    });
  };
  addEventListener('pageswap', (event) => {
    if (!event.viewTransition || !event.activation || root.dataset.reader) return;
    const path = clean(new URL(event.activation.entry.url).pathname);
    if (!path.startsWith('/essays/')) return;
    const plate = plateFor(path);
    name(plate, event.viewTransition);
    const src = plate?.querySelector('img')?.currentSrc;
    try {
      if (src) sessionStorage.setItem(KEY, JSON.stringify({ path, src }));
    } catch {}
  });
  addEventListener('pagereveal', (event) => {
    const transition = event.viewTransition;
    if (!transition) return;
    window.__editionTransition = transition;
    if (root.dataset.reader) {
      let hand = null;
      try {
        hand = JSON.parse(sessionStorage.getItem(KEY) || 'null');
        sessionStorage.removeItem(KEY);
      } catch {}
      const print = document.querySelector('.essay__cover .plate__print');
      const cover = print?.querySelector('picture img');
      if (!print || !cover) return;
      if (cover.complete && cover.naturalWidth) {
        // Already here (prerendered or cached): decode it into this frame.
        cover.decoding = 'sync';
        print.dataset.inked = '';
        return;
      }
      if (!hand || hand.path !== clean(location.pathname)) return;
      const proxy = new Image();
      proxy.className = 'plate__proxy';
      proxy.alt = '';
      proxy.decoding = 'sync';
      proxy.src = hand.src;
      print.prepend(proxy);
      print.dataset.inked = '';
      const drop = () => proxy.remove();
      cover.addEventListener('load', () => cover.decode().then(drop, drop), { once: true });
      return;
    }
    const from = window.navigation?.activation?.from?.url;
    if (!from) return;
    const path = clean(new URL(from).pathname);
    if (path.startsWith('/essays/')) name(plateFor(path), transition);
  });

  // 4. Arrival. On the first page of a visit, if it has the masthead, the
  // name is engraved as the page appears. The drawing, its styles and the
  // engraving itself are one small file (lib/nameplate.mjs), fetched only
  // then; meanwhile the name waits, unseen but already in its place
  // (foundation.css). If the drawing is late, the name is simply shown.
  // Once: not on reload, not on the pages that follow, and never for a
  // reader who has asked for less motion. A page the browser prepared
  // unseen (typed into the address bar) is engraved when it is shown.
  // Opened from a home screen, the name is already in its place on the launch
  // screen (lib/appLaunch.mjs): it stays, as an app's does.
  const arrive = () => {
    const src = root.dataset.nameplateSrc;
    if (!src || !matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
    if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;
    try {
      if (sessionStorage.getItem('pensees-arrived')) return;
      sessionStorage.setItem('pensees-arrived', '1');
    } catch {
      return;
    }
    root.dataset.nameplate = '';
    const rest = () => delete root.dataset.nameplate;
    const late = setTimeout(rest, 1000);
    import(src).then((drawing) => drawing.engrave(drawing.settings, late), rest);
  };
  if (document.prerendering)
    document.addEventListener('prerenderingchange', arrive, { once: true });
  else arrive();
})();
