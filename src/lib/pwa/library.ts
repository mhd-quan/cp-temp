// TCP's personal reading layer.
//
// Editorial content remains HTTP content and Cache Storage remains the source
// of truth for responses. IndexedDB only keeps the user's small, mutable
// library: saved papers and whether a paper has been pinned for offline use.
// The adapter is deliberately dependency-free so it can run in the page and
// remain available to a future service-worker outbox without bringing a
// framework runtime into the publication.

export const PAGE_CACHE = 'pensees-pages';
export const PINNED_CACHE = 'pensees-pinned';
const DB_NAME = 'tcp-pwa';
const DB_VERSION = 1;
const SAVED_STORE = 'saved';

export interface SavedPaper {
  id: string;
  title: string;
  url: string;
  excerpt?: string;
  cover?: string;
  savedAt: number;
  offline: boolean;
}

interface PaperMeta {
  id: string;
  title: string;
  url: string;
  excerpt?: string;
  cover?: string;
}

let opening: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (opening) return opening;
  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const transaction = request.transaction;
      if (!transaction) throw new Error('Could not upgrade library');
      const saved = db.objectStoreNames.contains(SAVED_STORE)
        ? transaction.objectStore(SAVED_STORE)
        : db.createObjectStore(SAVED_STORE, { keyPath: 'id' });
      if (!saved.indexNames.contains('savedAt')) saved.createIndex('savedAt', 'savedAt');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open library'));
  }).catch((error) => {
    opening = undefined;
    throw error;
  });
  opening = promise;
  return promise;
}

function request<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function changed() {
  window.dispatchEvent(new CustomEvent('tcp:library-change'));
}

export async function listSaved(): Promise<SavedPaper[]> {
  const db = await openDatabase();
  const transaction = db.transaction(SAVED_STORE, 'readonly');
  const values = await request<SavedPaper[]>(transaction.objectStore(SAVED_STORE).getAll());
  return values.sort((a, b) => b.savedAt - a.savedAt);
}

export async function getSaved(id: string): Promise<SavedPaper | undefined> {
  const db = await openDatabase();
  return request<SavedPaper | undefined>(
    db.transaction(SAVED_STORE, 'readonly').objectStore(SAVED_STORE).get(id),
  );
}

export async function savePaper(meta: PaperMeta): Promise<SavedPaper> {
  const previous = await getSaved(meta.id);
  const paper: SavedPaper = {
    ...meta,
    savedAt: previous?.savedAt ?? Date.now(),
    offline: previous?.offline ?? false,
  };
  const db = await openDatabase();
  await request(db.transaction(SAVED_STORE, 'readwrite').objectStore(SAVED_STORE).put(paper));
  changed();
  return paper;
}

export async function removePaper(id: string): Promise<void> {
  const db = await openDatabase();
  await request(db.transaction(SAVED_STORE, 'readwrite').objectStore(SAVED_STORE).delete(id));
  changed();
}

export async function setOffline(id: string, offline: boolean): Promise<void> {
  const paper = await getSaved(id);
  if (!paper) return;
  paper.offline = offline;
  const db = await openDatabase();
  await request(db.transaction(SAVED_STORE, 'readwrite').objectStore(SAVED_STORE).put(paper));
  changed();
}

async function cacheUrls(urls: string[]): Promise<void> {
  if (!('caches' in window)) throw new Error('Cache Storage is unavailable');
  const cache = await caches.open(PINNED_CACHE);
  for (const url of [...new Set(urls)]) {
    const target = new URL(url, location.href);
    if (target.origin !== location.origin) continue;
    const response = await fetch(target.href, { cache: 'reload' });
    if (response.ok) await cache.put(target.href, response.clone());
  }
}

export async function downloadPaper(meta: PaperMeta, article?: HTMLElement): Promise<SavedPaper> {
  await savePaper(meta);
  const assets = article
    ? [...article.querySelectorAll<HTMLImageElement>('img')]
        .map((image) => image.currentSrc || image.src)
        .filter(Boolean)
    : [];
  await cacheUrls([meta.url, ...assets]);
  await setOffline(meta.id, true);
  const saved = await getSaved(meta.id);
  if (!saved) throw new Error('Saved paper disappeared during download');
  return saved;
}

function articleMeta(article: HTMLElement): PaperMeta | null {
  const id = article.dataset.paperId;
  const title = article.dataset.paperTitle;
  const url = article.dataset.paperUrl;
  if (!id || !title || !url) return null;
  return {
    id,
    title,
    url,
    excerpt: article.dataset.paperExcerpt || undefined,
    cover: article.dataset.paperCover || undefined,
  };
}

export function initializeLibraryControls() {
  const article = document.querySelector<HTMLElement>('[data-paper-id]');
  const meta = article ? articleMeta(article) : null;
  if (!article || !meta) return;

  const saveButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-library-save]')];
  const offlineButtons = [
    ...document.querySelectorAll<HTMLButtonElement>('[data-library-offline]'),
  ];
  const status = document.querySelector<HTMLElement>('[data-library-status]');
  if (!saveButtons.length && !offlineButtons.length) return;

  const setState = (saved: SavedPaper | undefined) => {
    for (const button of saveButtons) {
      const on = Boolean(saved);
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', on ? 'Bỏ khỏi thư viện' : 'Lưu vào thư viện');
      button.dataset.saved = String(on);
    }
    for (const button of offlineButtons) {
      button.disabled = !saved;
      button.dataset.offline = String(Boolean(saved?.offline));
      button.setAttribute(
        'aria-label',
        saved?.offline ? 'Đã tải để đọc ngoại tuyến' : 'Tải để đọc ngoại tuyến',
      );
    }
  };

  const refresh = () =>
    getSaved(meta.id)
      .then(setState)
      .catch(() => {});
  void refresh();

  for (const button of saveButtons)
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const current = await getSaved(meta.id);
        if (current) await removePaper(meta.id);
        else await savePaper(meta);
        await refresh();
      } finally {
        button.disabled = false;
      }
    });

  for (const button of offlineButtons)
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      if (status) status.textContent = 'Đang tải bài để đọc ngoại tuyến…';
      try {
        await downloadPaper(meta, article);
        if (status) status.textContent = 'Đã tải. Bài này sẽ mở được khi không có mạng.';
      } catch {
        if (status) status.textContent = 'Chưa tải xong. Thử lại khi có kết nối.';
      } finally {
        button.removeAttribute('aria-busy');
        await refresh();
      }
    });

  addEventListener('tcp:library-change', () => void refresh());
}

function dateLabel(value: number) {
  return new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short' }).format(value);
}

export function initializeLibraryPage() {
  const page = document.querySelector<HTMLElement>('[data-library-page]');
  const list = page?.querySelector<HTMLOListElement>('[data-library-list]');
  const empty = page?.querySelector<HTMLElement>('[data-library-empty]');
  const status = page?.querySelector<HTMLElement>('[data-library-page-status]');
  if (!page || !list || !empty) return;

  const draw = async () => {
    try {
      const papers = await listSaved();
      list.replaceChildren();
      for (const paper of papers) {
        const item = document.createElement('li');
        item.className = 'library-row';
        const link = document.createElement('a');
        link.className = 'library-row__link';
        link.href = paper.url;
        if (paper.cover) {
          const image = document.createElement('img');
          image.className = 'library-row__cover';
          image.src = paper.cover;
          image.alt = '';
          image.loading = 'lazy';
          link.append(image);
        }
        const copy = document.createElement('span');
        copy.className = 'library-row__copy';
        const title = document.createElement('strong');
        title.textContent = paper.title;
        const meta = document.createElement('span');
        meta.textContent = `${paper.offline ? 'Ngoại tuyến · ' : ''}Đã lưu ${dateLabel(paper.savedAt)}`;
        copy.append(title, meta);
        link.append(copy);
        const remove = document.createElement('button');
        remove.className = 'icon-button library-row__remove';
        remove.type = 'button';
        remove.setAttribute('aria-label', `Bỏ ${paper.title} khỏi thư viện`);
        remove.textContent = '×';
        remove.addEventListener('click', async () => {
          await removePaper(paper.id);
          await draw();
        });
        item.append(link, remove);
        list.append(item);
      }
      list.hidden = papers.length === 0;
      empty.hidden = papers.length !== 0;
      if (status) status.textContent = papers.length ? `${papers.length} bài đã lưu` : '';
    } catch {
      list.hidden = true;
      empty.hidden = false;
      if (status) status.textContent = 'Thư viện chưa khả dụng trên trình duyệt này.';
    }
  };
  void draw();
  addEventListener('tcp:library-change', () => void draw());
}
