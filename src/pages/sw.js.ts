// /sw.js: the service worker (lib/serviceWorker.js), minified, with what it
// keeps from the start. Its first line names the edition it belongs to, so
// a new edition of the site installs a new worker.
import { createHash } from 'node:crypto';
import { transformSync } from 'esbuild';
import { LATER } from '../lib/editionStyles';
import source from '../lib/serviceWorker.js?raw';

export function GET() {
  const precache = [
    LATER.shell,
    '/manifest.webmanifest',
    '/brand/mark.svg',
    '/brand/apple-touch-icon.png',
    '/brand/app/icon-192.png',
    '/brand/app/icon-512.png',
  ];
  const code = transformSync(source.replace('__PRECACHE__', JSON.stringify(precache)), {
    minify: true,
    target: 'es2022',
  }).code;
  const edition = createHash('sha256').update(code).digest('hex').slice(0, 12);
  return new Response(`// ${edition}\n${code}`, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
  });
}
