// Ấn bản on a home screen. The row "Thêm vào màn hình chính" (the colophon's and
// the menu's ways to follow) is shown only where a browser can put the
// publication there, and never once it is there (a page opened from the home
// screen is "standalone"):
//
// - Chrome, Edge, Samsung Internet offer it themselves (beforeinstallprompt):
//   their own banner is held back, and the row asks for their dialog.
// - Safari on iPhone and iPad has no such dialog: the row opens a sheet with
//   the taps it takes (AppSheet.astro), and the page names its launch screen
//   for this screen (lib/appLaunch.mjs), which iOS reads as it is added.
// - Safari on a Mac puts a site in the Dock: the sheet says how.
// - Elsewhere (Firefox on a computer) nothing is shown.

import { launchScreensFor } from './appLaunch.mjs';
import { later } from './editionLater';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const standalone = () =>
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const agent = navigator.userAgent;
const touchMac = /Macintosh/.test(agent) && navigator.maxTouchPoints > 1;
const ios = /iPhone|iPad|iPod/.test(agent) || touchMac;
const macSafari =
  !ios &&
  /Macintosh/.test(agent) &&
  /Version\/(\d+)[\d.]* Safari/.test(agent) &&
  Number(agent.match(/Version\/(\d+)/)?.[1]) >= 17 &&
  !/Chrome|Chromium|Edg\/|Firefox/.test(agent);
// Apps that open links in a browser of their own, which cannot add to a home screen.
const inApp = /FBAN|FBAV|Instagram|Zalo|Line\/|Messenger|MicroMessenger|TikTok|Twitter/i.test(
  agent,
);

/** iOS reads the launch screen from the page as it is added: one per orientation and paper. */
function nameLaunchScreens() {
  const head = document.head;
  if (head.querySelector('link[rel="apple-touch-startup-image"]')) return;
  for (const screen of launchScreensFor(
    window.screen.width,
    window.screen.height,
    devicePixelRatio,
  )) {
    const link = document.createElement('link');
    link.rel = 'apple-touch-startup-image';
    link.media = screen.media;
    link.href = screen.file;
    head.append(link);
  }
}

export function initInstall() {
  if (standalone()) return;
  const entries = () => [...document.querySelectorAll<HTMLElement>('[data-install-entry]')];
  const label = (text: string) => {
    for (const entry of entries()) {
      const button = entry.querySelector('[data-install]');
      const words = button?.querySelector('span') ?? button?.firstChild;
      if (words) words.textContent = text;
      entry.hidden = false;
    }
  };
  const hide = () => {
    for (const entry of entries()) entry.hidden = true;
  };

  let prompt: InstallPrompt | null = null;
  addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    prompt = event as InstallPrompt;
    // A phone has a home screen; a computer has its apps.
    label(matchMedia('(pointer: coarse)').matches ? 'Thêm vào màn hình chính' : 'Cài đặt ứng dụng');
  });
  addEventListener('appinstalled', () => {
    prompt = null;
    hide();
  });

  const kind = ios ? (inApp ? 'in-app' : 'ios') : macSafari ? 'mac' : null;
  if (kind) {
    if (kind === 'mac') label('Thêm vào Dock');
    else label('Thêm vào màn hình chính');
    if (kind === 'ios') nameLaunchScreens();
    // The sheet is fetched while the page is idle, so the row opens it at once.
    const warm = () => void later('app-sheet');
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 4000 });
    else setTimeout(warm, 2000);
  }

  const open = async (from: HTMLElement) => {
    const content = await later('app-sheet');
    if (content) document.body.append(content);
    const sheet = document.querySelector<HTMLDialogElement>('[data-app-sheet]');
    if (!sheet || !kind) return;
    for (const part of sheet.querySelectorAll<HTMLElement>('[data-for]'))
      part.hidden = !part.dataset.for?.split(' ').includes(kind);
    const title = sheet.querySelector('[data-app-sheet-title]');
    if (title && kind === 'mac') title.textContent = 'Thêm vào Dock';
    if (!sheet.dataset.ready) {
      sheet.dataset.ready = '';
      const close = () => sheet.open && sheet.close();
      sheet.querySelector('[data-app-sheet-close]')?.addEventListener('click', close);
      // A tap on the dimmed page beyond the sheet lands on the dialog itself.
      sheet.addEventListener('click', (event) => {
        if (event.target === sheet) close();
      });
    }
    sheet.addEventListener('close', () => from.focus({ preventScroll: true }), { once: true });
    sheet.showModal();
  };

  document.addEventListener('click', async (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-install]');
    if (!button) return;
    if (prompt) {
      // The browser's own dialog; asked once, it is not asked again on this page.
      const asked = prompt;
      prompt = null;
      await asked.prompt();
      await asked.userChoice;
      hide();
      return;
    }
    if (kind) void open(button);
  });
}
