// The publication as an app: what a browser needs to install it (a name, its
// icons, its colours, where it opens) and the ways in a home-screen icon offers
// on a long press. Its icons are drawn from the favicon after the build
// (scripts/app-images.mjs); its colours are the paper of the light edition,
// which an installed page takes from the page itself as soon as it is drawn
// (EditionLayout: the browser chrome takes the paper's colour).
import { PAPERS } from '../lib/appLaunch.mjs';
import { COMPASS } from '../lib/editionNav';
import { SITE_DESCRIPTION } from '../lib/editionVoice.mjs';

export function GET() {
  const manifest = {
    id: '/',
    name: 'The Cochinchine Pensées',
    short_name: 'Pensées',
    description: SITE_DESCRIPTION,
    lang: 'vi',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: PAPERS.light.paper,
    theme_color: PAPERS.light.paper,
    categories: ['books', 'education', 'news'],
    icons: [
      { src: '/brand/mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/brand/app/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/app/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/brand/app/maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/brand/app/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/brand/app/monochrome-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'monochrome',
      },
    ],
    shortcuts: [
      { name: 'Tiểu luận', url: '/essays' },
      { name: 'Pensées', url: '/pensees' },
      { name: 'La bàn Tư tưởng', url: COMPASS },
      { name: 'Tìm kiếm', url: '/search' },
    ].map((shortcut) => ({
      ...shortcut,
      icons: [{ src: '/brand/app/icon-192.png', sizes: '192x192', type: 'image/png' }],
    })),
  };
  return new Response(`${JSON.stringify(manifest, null, 2)}\n`, {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
}
