// Ấn bản reader: preferences, notes, progress, contents, continuity.
// Everything degrades to a readable static article without this script.
import { handRests } from './editionHand';
import { flash, reveal } from './editionMotion';
import { prefetchAhead } from './editionSpeculation';
import { turnPage } from './editionTurn';

type Prefs = Partial<
  Record<'size-desktop' | 'size-mobile' | 'font' | 'measure' | 'leading' | 'paper', string>
>;
const PREFS_KEY = 'pensees-edition-reader';
const POSITIONS_KEY = 'pensees-reading-positions';
const DEFAULTS = {
  size: '3',
  font: 'text',
  measure: 'normal',
  leading: 'normal',
  paper: 'giay',
} as const;
type Setting = keyof typeof DEFAULTS;
const datasetKey = (key: Setting) => `read${key[0].toUpperCase()}${key.slice(1)}` as const;

export function initializeEditionReader() {
  const root = document.documentElement;
  const prose = document.querySelector<HTMLElement>('[data-prose]');
  if (!prose) return;
  const mobile = matchMedia('(max-width: 760px)');
  const wide = matchMedia('(min-width: 1200px)');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bar = document.querySelector<HTMLElement>('[data-bar]');
  const barBottom = () => bar?.getBoundingClientRect().bottom ?? 0;

  const readPrefs = (): Prefs => {
    try {
      const value = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  };
  const writePrefs = (prefs: Prefs) => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {}
  };

  // Keep the paragraph at the reading line where it was while text reflows.
  const keepPlace = (apply: () => void) => {
    const line = barBottom() + 24;
    const anchor = [...prose.querySelectorAll<HTMLElement>('p[id]')].find((p) => {
      const rect = p.getBoundingClientRect();
      return !p.closest('.footnotes') && rect.bottom > line && rect.top < innerHeight;
    });
    if (!anchor) return apply();
    const before = anchor.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (line - before.top) / before.height));
    const target = before.top + before.height * fraction;
    const restore = () => {
      const after = anchor.getBoundingClientRect();
      window.scrollBy({ top: after.top + after.height * fraction - target, behavior: 'instant' });
    };
    apply();
    restore();
    void document.fonts.ready.then(restore);
  };

  // ---------- preferences ----------
  const settings = document.getElementById('reader-settings');
  const setDataset = (key: Setting, value: string) => {
    if (value === DEFAULTS[key]) delete root.dataset[datasetKey(key)];
    else root.dataset[datasetKey(key)] = value;
  };
  const syncControls = () => {
    for (const key of Object.keys(DEFAULTS) as Setting[]) {
      const value = root.dataset[datasetKey(key)] ?? DEFAULTS[key];
      settings?.querySelectorAll<HTMLInputElement>(`input[name="read-${key}"]`).forEach((input) => {
        input.checked = input.value === value;
      });
    }
  };
  const applyDeviceSize = () => {
    const prefs = readPrefs();
    setDataset('size', prefs[mobile.matches ? 'size-mobile' : 'size-desktop'] ?? DEFAULTS.size);
    syncControls();
    layoutNotes();
  };
  settings?.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    if (!input.name.startsWith('read-') || 'appearance' in input.dataset) return;
    const key = input.name.slice(5) as Setting;
    if (!(key in DEFAULTS)) return;
    const { value } = input;
    // The page is set again as one turn: the old setting dissolves into the
    // new one, the place kept, instead of the text jumping to its new size
    // or the paper changing under glass that has already changed.
    turnPage(() => {
      keepPlace(() => setDataset(key, value));
      layoutNotes();
      if (key === 'paper') document.dispatchEvent(new CustomEvent('edition:paper'));
    });
    const prefs = readPrefs();
    if (key === 'size') prefs[mobile.matches ? 'size-mobile' : 'size-desktop'] = value;
    else prefs[key] = value;
    writePrefs(prefs);
  });
  settings?.querySelector('[data-settings-reset]')?.addEventListener('click', () => {
    try {
      localStorage.removeItem(PREFS_KEY);
    } catch {}
    turnPage(() => {
      keepPlace(() => {
        for (const key of Object.keys(DEFAULTS) as Setting[]) setDataset(key, DEFAULTS[key]);
      });
      syncControls();
      layoutNotes();
      document.dispatchEvent(new CustomEvent('edition:paper'));
    });
  });
  mobile.addEventListener('change', applyDeviceSize);
  syncControls();
  // A page the browser kept for Back (or open in another tab) still wears the
  // preferences it was left in; the reader may have changed them since, on
  // another essay. They are read again, the place kept, whenever it returns.
  const restorePrefs = () => {
    const prefs = readPrefs();
    const stored: Record<Setting, string> = {
      size: prefs[mobile.matches ? 'size-mobile' : 'size-desktop'] ?? DEFAULTS.size,
      font: prefs.font === 'sans' ? 'grotesque' : (prefs.font ?? DEFAULTS.font),
      measure: prefs.measure ?? DEFAULTS.measure,
      leading: prefs.leading ?? DEFAULTS.leading,
      paper: prefs.paper ?? DEFAULTS.paper,
    };
    const keys = Object.keys(DEFAULTS) as Setting[];
    if (keys.every((key) => (root.dataset[datasetKey(key)] ?? DEFAULTS[key]) === stored[key]))
      return;
    keepPlace(() => {
      for (const key of keys) setDataset(key, stored[key]);
    });
    document.dispatchEvent(new CustomEvent('edition:paper'));
    syncControls();
    layoutNotes();
  };
  addEventListener('pageshow', (event) => {
    if (event.persisted) restorePrefs();
  });
  addEventListener('storage', (event) => {
    if (event.key === PREFS_KEY || event.key === null) restorePrefs();
  });

  // ---------- notes ----------
  // Wide screens: every note sits in the margin beside its reference.
  // Narrow screens: a reference opens a sheet; the page never scrolls.
  const references = [
    ...prose.querySelectorAll<HTMLAnchorElement>('sup a[href^="#fn"], a[data-footnote-ref]'),
  ].filter((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))));
  const margin = document.querySelector<HTMLElement>('[data-sidenotes]');
  const body = document.querySelector<HTMLElement>('[data-article-body]');
  const sheet = document.getElementById('reader-note');
  const sheetBody = sheet?.querySelector<HTMLElement>('[data-note-body]');
  const sheetIndex = sheet?.querySelector<HTMLElement>('[data-note-index]');
  const noteContent = (link: HTMLAnchorElement) => {
    const source = document
      .getElementById(decodeURIComponent(link.hash.slice(1)))!
      .cloneNode(true) as HTMLElement;
    source.removeAttribute('id');
    source.querySelectorAll('[id]').forEach((node) => {
      node.removeAttribute('id');
    });
    source.querySelectorAll('a[href^="#fnref"], a[data-footnote-backref]').forEach((node) => {
      node.remove();
    });
    return [...source.childNodes];
  };
  const sidenotes = references.map((link, index) => {
    const note = document.createElement('aside');
    note.className = 'sidenote';
    note.id = `sidenote-${index + 1}`;
    const number = document.createElement('span');
    number.className = 'sidenote__number';
    number.textContent = link.textContent ?? String(index + 1);
    const content = document.createElement('div');
    content.append(...noteContent(link));
    note.append(number, content);
    margin?.append(note);
    link.setAttribute('aria-label', `Chú thích ${link.textContent}`);
    link.setAttribute('aria-describedby', note.id);
    const activate = (on: boolean) => {
      note.classList.toggle('is-active', on);
      link.classList.toggle('is-active', on);
    };
    // A note that scrolls under a resting hand waits for the hand to move.
    const point = () => {
      if (!handRests() && !note.classList.contains('is-active')) activate(true);
    };
    for (const target of [link, note]) {
      target.addEventListener('pointerenter', point);
      target.addEventListener('pointermove', point, { passive: true });
      target.addEventListener('pointerleave', () => activate(false));
    }
    link.addEventListener('focus', () => activate(true));
    link.addEventListener('blur', () => activate(false));
    return note;
  });
  function layoutNotes() {
    if (!margin || !body || !sidenotes.length) return;
    margin.hidden = !wide.matches;
    if (!wide.matches) return;
    const origin = margin.getBoundingClientRect().top;
    let floor = 0;
    references.forEach((link, index) => {
      const note = sidenotes[index];
      const top = Math.max(link.getBoundingClientRect().top - origin - 6, floor);
      note.style.transform = `translateY(${Math.round(top)}px)`;
      floor = top + note.offsetHeight + 18;
    });
    margin.style.minHeight = `${floor}px`;
  }
  let current = -1;
  const showNote = (index: number) => {
    if (!sheet || !sheetBody) return;
    current = (index + references.length) % references.length;
    const link = references[current];
    sheetBody.replaceChildren(...noteContent(link));
    if (sheetIndex) sheetIndex.textContent = `${link.textContent} / ${references.length}`;
    references.forEach((item, position) => {
      item.setAttribute('aria-expanded', String(position === current));
    });
    if (!sheet.matches(':popover-open')) sheet.showPopover();
  };
  references.forEach((link, index) => {
    link.setAttribute('aria-controls', 'reader-note');
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (wide.matches) {
        const note = sidenotes[index];
        note.classList.remove('is-flash');
        void note.offsetWidth;
        note.classList.add('is-flash');
        return;
      }
      showNote(index);
    });
  });
  sheet?.querySelectorAll<HTMLButtonElement>('[data-note-step]').forEach((button) => {
    button.addEventListener('click', () => showNote(current + Number(button.dataset.noteStep)));
  });
  sheet?.addEventListener('toggle', (event) => {
    if ((event as ToggleEvent).newState === 'closed') {
      references[current]?.setAttribute('aria-expanded', 'false');
      references[current]?.focus({ preventScroll: true });
    }
  });
  wide.addEventListener('change', layoutNotes);
  new ResizeObserver(() => layoutNotes()).observe(prose);
  void document.fonts.ready.then(layoutNotes);
  layoutNotes();

  // ---------- progress, parts and contents ----------
  const progress = document.querySelector<HTMLElement>('[data-progress]');
  const remaining = [...document.querySelectorAll<HTMLElement>('[data-remaining]')];
  const part = document.querySelector<HTMLElement>('[data-part]');
  const end = document.querySelector<HTMLElement>('[data-article-end]');
  const minutes = Number(remaining[0]?.dataset.minutes ?? 1);
  const headings = [...prose.querySelectorAll<HTMLElement>('h2[id], h3[id]')].filter(
    (heading) => !heading.closest('.footnotes'),
  );
  const breaks = [...prose.querySelectorAll<HTMLElement>(':scope > hr')];
  const contents = [...document.querySelectorAll<HTMLAnchorElement>('[data-contents-link]')];
  const markers: { node: HTMLElement; label: string }[] =
    headings.length >= 2
      ? headings.map((heading) => ({ node: heading, label: heading.textContent ?? '' }))
      : breaks.length
        ? [prose, ...breaks].map((node, index, all) => ({
            node,
            label: `Phần ${index + 1}/${all.length}`,
          }))
        : [];
  let read = 0;
  const update = () => {
    const line = barBottom() + 32;
    const start = prose.getBoundingClientRect().top;
    const stop = (end ?? prose).getBoundingClientRect().top - innerHeight * 0.6;
    const ratio = Math.max(0, Math.min(1, (line - start) / Math.max(1, stop - start + line)));
    read = ratio;
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    const left =
      ratio >= 0.99
        ? 'Hết bài'
        : ratio <= 0
          ? `${minutes} phút đọc`
          : `Còn ${Math.max(1, Math.ceil(minutes * (1 - ratio)))} phút`;
    for (const node of remaining) if (node.textContent !== left) node.textContent = left;
    let active: (typeof markers)[number] | undefined;
    for (const marker of markers) {
      if (marker.node.getBoundingClientRect().top <= line) active = marker;
      else break;
    }
    const label = start < line && active ? active.label : '';
    if (part && part.textContent !== label) part.textContent = label;
    contents.forEach((link) => {
      if (active && decodeURIComponent(link.hash.slice(1)) === active.node.id)
        link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  let frame = 0;
  const schedule = () => {
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
  };
  window.addEventListener('scroll', schedule, { passive: true });
  new ResizeObserver(schedule).observe(prose);
  update();
  document.getElementById('reader-contents')?.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) (event.currentTarget as HTMLElement).hidePopover();
  });

  // Reading on: a screen and a half before the end of the text, the next
  // part of the series and the essays either side are fetched (documents
  // only), so the page after the last line opens without waiting.
  if (end && 'IntersectionObserver' in window) {
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        near.disconnect();
        const next = document.querySelector<HTMLAnchorElement>(
          '.series-nav li[aria-current] + li a, .neighbours a',
        );
        const neighbours = document.querySelectorAll<HTMLAnchorElement>('.neighbours a');
        for (const link of new Set([next, ...neighbours])) prefetchAhead(link);
      },
      { rootMargin: '0px 0px 150% 0px' },
    );
    near.observe(end);
  }

  // ---------- copying ----------
  async function copy(
    value: string,
    status: HTMLElement | null,
    fallback?: HTMLInputElement | null,
  ) {
    try {
      await navigator.clipboard.writeText(value);
      if (status) flash(status, 'Đã chép');
      if (fallback) reveal(fallback, false);
    } catch {
      if (status) flash(status, 'Chép đường dẫn bên dưới', 6000);
      if (fallback) {
        fallback.value = value;
        reveal(fallback, true);
        fallback.select();
      }
    }
  }
  const copyButton = document.querySelector<HTMLButtonElement>('[data-copy-url]');
  if (copyButton) {
    copyButton.hidden = false;
    copyButton.addEventListener('click', () =>
      copy(
        copyButton.dataset.copyUrl!,
        document.querySelector<HTMLElement>('[data-copy-status]'),
        document.querySelector<HTMLInputElement>('[data-copy-fallback]'),
      ),
    );
  }

  // Selecting text inside a paragraph offers a quotation or a link to that paragraph.
  const tools = document.querySelector<HTMLElement>('[data-quote-tools]');
  const status = tools?.querySelector<HTMLElement>('[data-quote-status]') ?? null;
  let selectedId = '';
  let selectedText = '';
  document.addEventListener('selectionchange', () => {
    if (!tools || tools.contains(document.activeElement)) return;
    const selection = getSelection();
    const node = selection?.anchorNode;
    const element = node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement;
    const paragraph = element?.closest<HTMLElement>('p[id]');
    if (
      !selection ||
      selection.isCollapsed ||
      !paragraph ||
      !prose.contains(paragraph) ||
      paragraph.closest('.footnotes')
    ) {
      reveal(tools, false, 6);
      return;
    }
    selectedId = paragraph.id;
    selectedText = selection.toString().trim();
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    reveal(tools, true, 6);
    if (!mobile.matches) {
      tools.style.left = `${Math.round(Math.min(innerWidth - tools.offsetWidth - 12, Math.max(12, rect.left + rect.width / 2 - tools.offsetWidth / 2)))}px`;
      tools.style.top = `${Math.round(Math.max(barBottom() + 8, rect.top - tools.offsetHeight - 10))}px`;
    } else {
      tools.style.left = '';
      tools.style.top = '';
    }
  });
  const paragraphUrl = () => {
    const url = new URL(location.href);
    url.hash = selectedId;
    url.search = '';
    return url.href;
  };
  tools
    ?.querySelector('[data-copy-paragraph]')
    ?.addEventListener('click', () => copy(paragraphUrl(), status));
  tools?.querySelector('[data-copy-quote]')?.addEventListener('click', () => {
    const title = document.querySelector('#essay-title')?.textContent?.trim();
    const author = document.querySelector('.essay__byline-author')?.textContent?.trim();
    copy(`“${selectedText}”\n${author}, ${title}\n${paragraphUrl()}`, status);
  });

  // ---------- continuity ----------
  // Positions stay on this device for 30 days; a deep link always wins.
  const path = location.pathname;
  const blocks = [...prose.querySelectorAll<HTMLElement>('p[id]')].filter(
    (p) => !p.closest('.footnotes'),
  );
  type Position = { id: string; time: number; title?: string; left?: number; quiet?: boolean };
  const readPositions = (): Record<string, Position> => {
    try {
      const value = JSON.parse(localStorage.getItem(POSITIONS_KEY) ?? '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  };
  // The place a link or the resume prompt leads to is marked in the margin
  // for a moment (reader.css, data-arrived), so the eye finds it at once.
  const arrive = (node: HTMLElement | null) => {
    if (!node || reduced()) return;
    delete node.dataset.arrived;
    void node.offsetWidth;
    node.dataset.arrived = '';
    node.addEventListener('animationend', () => delete node.dataset.arrived, { once: true });
  };
  const hashTarget = () => {
    try {
      return document.getElementById(decodeURIComponent(location.hash.slice(1)));
    } catch {
      return null;
    }
  };
  if (location.hash) arrive(prose.contains(hashTarget()) ? hashTarget() : null);
  addEventListener('hashchange', () => {
    const node = hashTarget();
    if (node && prose.contains(node)) arrive(node);
  });
  const prompt = document.querySelector<HTMLElement>('[data-resume-prompt]');
  const saved = readPositions()[path];
  if (
    prompt &&
    !location.hash &&
    saved &&
    Date.now() - saved.time < 30 * 86_400_000 &&
    blocks.some((p) => p.id === saved.id)
  ) {
    reveal(prompt, true, 10);
    prompt.querySelector('[data-resume]')?.addEventListener('click', () => {
      const place = document.getElementById(saved.id);
      place?.scrollIntoView({ block: 'start', behavior: reduced() ? 'instant' : 'smooth' });
      arrive(place);
      reveal(prompt, false, 10);
    });
    prompt
      .querySelector('[data-resume-dismiss]')
      ?.addEventListener('click', () => reveal(prompt, false, 10));
    window.addEventListener('scroll', () => reveal(prompt, false, 10), {
      once: true,
      passive: true,
    });
  }
  let timer: ReturnType<typeof setTimeout>;
  const savePosition = () => {
    if (!blocks.length || prose.getBoundingClientRect().top > barBottom()) return;
    let currentBlock = blocks[0];
    for (const block of blocks) {
      if (block.getBoundingClientRect().top <= barBottom() + 32) currentBlock = block;
      else break;
    }
    try {
      const all = readPositions();
      if (end && end.getBoundingClientRect().top < innerHeight) delete all[path];
      else
        all[path] = {
          id: currentBlock.id,
          time: Date.now(),
          // For the front page's offer to go on (editionReturn.ts).
          title: document.getElementById('essay-title')?.textContent?.trim() ?? '',
          left: Math.max(1, Math.ceil(minutes * (1 - read))),
        };
      const kept = Object.entries(all)
        .filter(([, value]) => value && typeof value.time === 'number')
        .sort((a, b) => b[1].time - a[1].time)
        .slice(0, 40);
      localStorage.setItem(POSITIONS_KEY, JSON.stringify(Object.fromEntries(kept)));
    } catch {}
  };
  window.addEventListener(
    'scroll',
    () => {
      clearTimeout(timer);
      timer = setTimeout(savePosition, 800);
    },
    { passive: true },
  );
  window.addEventListener('pagehide', savePosition);
}
