// Ấn bản as an app on a home screen: what its launch screen shows.
//
// Apple's guidance for a launch screen is to be nearly the app's first screen,
// with nothing that will not stay: no splash, no advertisement, no logo that
// is not part of the first screen. The first screen of this one is the paper
// of the publication with its name at the head (the masthead; the rest of it
// fills in as the page is drawn). So the launch screen is that paper, light
// or dark as the device is, with the name set where the masthead sets it, the
// lockup on a phone, one line on a wider screen, and nothing else. When the
// page is drawn over it, the name is already in its place.
//
// iOS needs one image per screen, in each orientation (apple-touch-startup-
// image); a link is added only for the screen that asks (lib/editionInstall.ts),
// so pages carry none. The images are drawn at build time from the very
// outlines of the name (lib/nameplate.mjs; scripts/app-images.mjs).

/** The papers and the ink of the name, as palette.json has them. */
export const PAPERS = {
  light: { paper: '#faf9f6', ink: '#161828' },
  dark: { paper: '#11131b', ink: '#ebeae2' },
};

/**
 * Apple's screens: portrait size in CSS pixels, pixel ratio, and the top inset
 * of a home-screen app in portrait (the status bar it sits under), and at the
 * sides in landscape (where a phone hides its status bar, and the camera's
 * housing takes a side). Screens shared by several devices take the newest.
 */
export const DEVICES = [
  // iPhone
  { w: 440, h: 956, dpr: 3, top: 62, side: 62 }, // 16 Pro Max, 17 Pro Max
  { w: 420, h: 912, dpr: 3, top: 62, side: 62 }, // Air
  { w: 402, h: 874, dpr: 3, top: 62, side: 62 }, // 16 Pro, 17, 17 Pro
  { w: 430, h: 932, dpr: 3, top: 59, side: 59 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { w: 393, h: 852, dpr: 3, top: 59, side: 59 }, // 14 Pro, 15, 15 Pro, 16
  { w: 428, h: 926, dpr: 3, top: 47, side: 47 }, // 12 Pro Max, 13 Pro Max, 14 Plus
  { w: 390, h: 844, dpr: 3, top: 47, side: 47 }, // 12, 13, 14, 16e
  { w: 375, h: 812, dpr: 3, top: 50, side: 50 }, // 12 mini, 13 mini, X, XS, 11 Pro
  { w: 414, h: 896, dpr: 3, top: 44, side: 44 }, // XS Max, 11 Pro Max
  { w: 414, h: 896, dpr: 2, top: 48, side: 48 }, // XR, 11
  { w: 414, h: 736, dpr: 3, top: 20, side: 0 }, // 6s Plus, 7 Plus, 8 Plus
  { w: 375, h: 667, dpr: 2, top: 20, side: 0 }, // 6s, 7, 8, SE (2nd, 3rd)
  { w: 320, h: 568, dpr: 2, top: 20, side: 0 }, // SE (1st)
  // iPad: the status bar stays in landscape.
  { w: 1032, h: 1376, dpr: 2, top: 24, side: 0, tablet: true }, // Pro 13" (M4)
  { w: 1024, h: 1366, dpr: 2, top: 24, side: 0, tablet: true }, // Pro 12.9", Air 13"
  { w: 834, h: 1210, dpr: 2, top: 24, side: 0, tablet: true }, // Pro 11" (M4)
  { w: 834, h: 1194, dpr: 2, top: 24, side: 0, tablet: true }, // Pro 11", Air 11"
  { w: 820, h: 1180, dpr: 2, top: 24, side: 0, tablet: true }, // Air (4th, 5th), iPad (10th, 11th)
  { w: 834, h: 1112, dpr: 2, top: 20, side: 0, tablet: true }, // Air (3rd), Pro 10.5"
  { w: 810, h: 1080, dpr: 2, top: 20, side: 0, tablet: true }, // iPad (7th–9th)
  { w: 768, h: 1024, dpr: 2, top: 20, side: 0, tablet: true }, // mini (5th), iPad (6th), Air 2
  { w: 744, h: 1133, dpr: 2, top: 24, side: 0, tablet: true }, // mini (6th, 7th)
];

const clamp = (low, value, high) => Math.min(Math.max(value, low), high);

/**
 * Where the masthead sets the name on a screen `width` CSS pixels wide, below
 * `top` (foundation.css: .wrap, .masthead__utility, .masthead__title,
 * .wordmark). On a phone (760 and under) the lockup at the left margin; wider,
 * one line, centred. `side` is the inset the page's margin keeps clear.
 */
export function namePlace(width, { top = 0, side = 0 } = {}) {
  const margin = Math.max(clamp(20, 8 + 0.034 * width, 64), side);
  const measure = Math.min(width - 2 * margin, 1360);
  if (width <= 760) {
    // .masthead__title: padding-top var(--s-2) + 0.875rem; .wordmark: 10.6cqi.
    return { kind: 'lockup', x: margin, y: top + 22, em: 0.106 * measure };
  }
  // .masthead__utility: 0.75rem above and below a 44px control; .masthead__title:
  // padding-top clamp(0.5rem, 2vw, 1.75rem); .wordmark: min(8rem, 8.6cqi), centred.
  return {
    kind: 'line',
    x: null,
    y: top + 68 + clamp(8, 0.02 * width, 28),
    em: Math.min(128, 0.086 * measure),
  };
}

/** The launch screens of one device: each orientation, each paper. */
export function launchScreens({ w, h, dpr, top, side, tablet = false }) {
  return ['portrait', 'landscape'].flatMap((orientation) => {
    const portrait = orientation === 'portrait';
    const width = portrait ? w : h;
    const height = portrait ? h : w;
    const inset = portrait || tablet ? { top, side: 0 } : { top: 0, side };
    return ['light', 'dark'].map((scheme) => ({
      file: `/brand/launch/${w}x${h}@${dpr}-${orientation}-${scheme}.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${orientation}) and (prefers-color-scheme: ${scheme})`,
      width,
      height,
      dpr,
      scheme,
      place: namePlace(width, inset),
    }));
  });
}

/** The launch screens for the screen a page is on (CSS pixels, as screen.* reports them). */
export function launchScreensFor(width, height, dpr) {
  const [short, long] = width < height ? [width, height] : [height, width];
  const device = DEVICES.find((item) => item.w === short && item.h === long && item.dpr === dpr);
  return device ? launchScreens(device) : [];
}
