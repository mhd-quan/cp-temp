// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import appImages from './scripts/app-images.mjs';
import laterFragments from './scripts/later-fragments.mjs';
import publicationIntegrity from './scripts/publication-integrity.mjs';
import responsiveImages from './scripts/responsive-images.mjs';
import searchIndex from './scripts/search-index.mjs';
import { sitemapEntry } from './src/lib/seo/publication.mjs';

// The Cochinchine Pensées — Astro 7 config
// Output: pure static. Deploy target: Cloudflare Workers (Static Assets).
// No SSR adapter needed — Cloudflare's direct Git integration handles the dist/ push.
// View Transitions enabled for page-to-page fade (out of the box in Astro 7).

export default defineConfig({
  site: 'https://cochinchinepensees.studio',
  output: 'static',
  trailingSlash: 'never',
  // No Astro prefetch: edition pages fetch links on intent themselves
  // (src/lib/editionSpeculation.ts), and never for a link that merely slid
  // under a resting mouse while the page scrolled.
  integrations: [
    responsiveImages(),
    searchIndex(), // Dev preview serves the latest built index on this origin too.
    mdx(),
    sitemap({
      serialize: sitemapEntry,
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/$/, '');
        return (
          !path.startsWith('/discovery/') &&
          !path.startsWith('/draft/') &&
          !['/draft', '/search', '/404', '/404.html', '/offline'].includes(path)
        );
      },
    }),
    publicationIntegrity(),
    appImages(),
    // Last: the pages are final once the others have read them.
    laterFragments(),
  ],
  build: {
    format: 'directory',
    // Avoid a blocking stylesheet round trip on a cold mobile visit.
    // The shared styles compress to ~7 KB; fonts remain independently cacheable.
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
      // Fonts stay external even though critical styles ship with the HTML.
      assetsInlineLimit: (filePath) => {
        if (/\.woff2?$/.test(filePath)) return false;
        // Preserve Vite/Astro's default behavior for small scripts and icons.
        return undefined;
      },
    },
  },
});
