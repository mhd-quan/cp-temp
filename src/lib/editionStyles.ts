// Ấn bản: a page's styles come in two parts.
//
// What its first screen needs is in the head, inline, so the first round trip
// draws it: about 14 KB compressed is what a new connection sends before it
// waits for a reply. The head's styles are written out here, in the order they
// have always been read (an order the cascade depends on: a page's own styles
// first, then the shell, then the cards over the shell), not left to the
// bundler, which orders shared and page styles as its chunks fall.
//
// The rest is one stylesheet, linked in the body where the first screen ends
// (components/edition/Later.astro) and cached for a year like every hashed
// file. A browser draws what stands before such a link at once and holds what
// follows until the sheet has arrived (one round trip, on a first visit only),
// so nothing is drawn unstyled. Ordinary pages link the shell's later half
// before the colophon; the homepage links its own after the cover, the reader
// its own after the text.

import app from '../styles/edition/app.css?inline';
import cards from '../styles/edition/cards.css?inline';
import door from '../styles/edition/door.css?inline';
import fonts from '../styles/edition/fonts.css?inline';
import foundation from '../styles/edition/foundation.css?inline';
import home from '../styles/edition/home.css?inline';
import laterShell from '../styles/edition/later.css?url';
import laterHome from '../styles/edition/later-home.css?url';
import laterReader from '../styles/edition/later-reader.css?url';
import pages from '../styles/edition/pages.css?inline';
import palette from '../styles/edition/palette.css?inline';
import reader from '../styles/edition/reader.css?inline';
import readerFonts from '../styles/edition/reader-fonts.css?inline';

const shell = fonts + palette + foundation + app;

/** The styles of each kind of page's first screen, inline in its head. */
export const FIRST = {
  /** Every page with a page head (PageHead.astro). */
  page: pages + shell + cards,
  /** Thể nghiệm: a page with doors to what can be done. */
  experiments: pages + door + shell + cards,
  /** The homepage: the shell and the cover. */
  home: shell + home,
  /** An essay: its faces and its text, then the shell. */
  reader: readerFonts + reader + shell,
} as const;

/** The rest of each kind of page's styles, linked where its first screen ends. */
export const LATER = { shell: laterShell, home: laterHome, reader: laterReader } as const;
