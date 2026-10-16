// Share a paper through the operating system when the browser offers it. The
// button remains a normal copy action when Web Share is unavailable.
export function initializeArticleShare() {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-share-article]')];
  if (!buttons.length) return;
  const article = document.querySelector<HTMLElement>('[data-paper-id]');
  const title = article?.dataset.paperTitle ?? document.title;
  const url = article?.dataset.paperUrl ?? location.href;
  const status = document.querySelector<HTMLElement>('[data-library-status], [data-copy-status]');

  for (const button of buttons)
    button.addEventListener('click', async () => {
      try {
        if ('share' in navigator) {
          await navigator.share({ title, text: article?.dataset.paperExcerpt ?? title, url });
          if (status) status.textContent = 'Đã mở bảng chia sẻ';
        } else {
          await navigator.clipboard.writeText(url);
          if (status) status.textContent = 'Đã chép liên kết';
        }
      } catch {
        // A dismissed native share sheet is not an error worth surfacing.
      }
    });
}
