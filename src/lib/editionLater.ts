// Parts of a page held back until asked for (scripts/later-fragments.mjs): a
// <template data-later> that either holds them (in development) or says where
// they are. Fetched once; the template goes when its content is taken.

const taken = new Map<string, Promise<DocumentFragment | null>>();

/** The held-back part `name` of this page, fetched if need be; null if it cannot be had. */
export function later(name: string): Promise<DocumentFragment | null> {
  const pending = taken.get(name);
  if (pending) return pending;
  const template = document.querySelector<HTMLTemplateElement>(`template[data-later="${name}"]`);
  if (!template) return Promise.resolve(null);
  const src = template.dataset.src;
  const content = src
    ? fetch(src)
        .then((response) => (response.ok ? response.text() : Promise.reject(response.status)))
        .then((html) => {
          template.innerHTML = html;
          return template.content;
        })
    : Promise.resolve(template.content);
  const promise = content.then(
    (fragment) => {
      template.remove();
      return fragment;
    },
    () => {
      // Offline or failed: asked again, it is fetched again.
      taken.delete(name);
      return null;
    },
  );
  taken.set(name, promise);
  return promise;
}
