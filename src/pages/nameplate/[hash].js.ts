import { nameplate } from '../../lib/nameplate.mjs';

// The drawn name, its styles and its engraving: one module, fetched once, on
// a visitor's first page (editionHead.js).
export function getStaticPaths() {
  return [{ params: { hash: nameplate().hash } }];
}

export function GET() {
  return new Response(nameplate().module, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
  });
}
