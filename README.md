# The Cochinchine Pensées

Không gian độc lập cho những suy tưởng và trao đổi về triết học, chính trị và xã hội, bằng tiếng Việt (tiểu luận, pensées, điểm sách): <https://cochinchinepensees.studio>. Astro 7, xuất tĩnh, triển khai bằng Cloudflare Workers Static Assets (`wrangler.toml`).

## Chạy tại máy

Node 22.13 trở lên.

```sh
npm ci
npm run dev
npm run verify   # build + astro check + biome + node --test
```

Lần build đầu sinh ảnh responsive cho mọi bìa và hình trong bài (vài phút); các lần sau dùng lại `public/images/responsive/` và `.cache/image-sources/`.

## Một hệ giao diện: Ấn bản

Mọi trang dùng `src/layouts/EditionLayout.astro`; trang bài dùng `src/layouts/EditionReader.astro` (bọc EditionLayout). Thành phần ở `src/components/edition/`, kiểu ở `src/styles/edition/` (màu `palette.css` sinh bởi `scripts/edition-palette.mjs`). Thiết kế và lịch sử quyết định: `docs/redesign/` (tài liệu hiện hành: `10-v1-1.md`, `11-v1-1-1.md`), chuyển động: `docs/motion.md`.

Thể nghiệm (`/the-nghiem`): những thứ để làm, không chỉ để đọc. Đầu tiên là La bàn Tư tưởng, `/the-nghiem/la-ban-tu-tuong` (`src/lib/quiz/`, `docs/quiz/`; trước đây là La bàn Chính trị ở `/mo-rong/la-ban-chinh-tri`, địa chỉ cũ chuyển hướng qua `public/_redirects`). Cửa vào của nó đứng cố định trên trang chủ: cạnh bìa trên màn hình rộng, sau Bài mới trên điện thoại (`src/components/edition/CompassDoor.astro`). Trang tự gọi mình bằng một giọng (`src/lib/editionVoice.mjs`): không tập san, không ban biên tập, không tòa soạn.

## Build

Các integration trong `astro.config.mjs`, theo thứ tự:

| Integration | Việc | Ghi vào |
| --- | --- | --- |
| `responsiveImages()` | Ảnh AVIF/WebP theo bề rộng cho bìa và hình trong bài | `public/images/responsive/`, `.astro/responsive-images.json` (đều bị bỏ qua trong git) |
| `searchIndex()` | Chỉ mục Pagefind | `dist/pagefind/` |
| `mdx()`, `sitemap()` | Bài viết, sitemap | `dist/` |
| `publicationIntegrity()` | Kiểm tra metadata biên tập (`editorial/`), xuất PDF bài đọc | `dist/downloads/` |

Build không sửa file nào được theo dõi trong git: sau `npm run build`, `git status` phải sạch.

## Công cụ chạy tay

Không chạy trong build. Chạy lại khi nguồn của chúng đổi, rồi commit kết quả.

| Lệnh | Sinh ra |
| --- | --- |
| `node scripts/edition-palette.mjs` | `src/styles/edition/palette.css`, `public/brand/edition/palette.json` |
| `node scripts/instance-fonts.mjs` | `src/assets/fonts/pensees-sans/`, Libre Bodoni cố định trục |
| `node scripts/social-card.mjs` | `public/social-card.png`, ảnh chia sẻ của trang không có bìa |
| `node scripts/normalize-cover.mjs <ảnh> <slug>` | Bìa sách trong `public/images/books/` và kích thước trong `src/content/books/<slug>.json` |
| `node scripts/quiz-profiles.mjs`, `node scripts/quiz-portraits.mjs` | Dữ liệu La bàn |
| `node scripts/quiz-deep.mjs` | 72 câu `deep` của bản chuyên sâu trong `src/data/quiz/questions.json` |
| `node scripts/quiz-figures.mjs <csv> <tiến độ> [--except id]` | `src/data/quiz/figure-answers.json`, câu trả lời của từng nhân vật đã chấm |
| `npm run seo:review`, `npm run pdf -- <slug>` | Rà metadata, xuất lại một PDF (`docs/seo.md`, `docs/reader-pdf.md`) |

Kiểm tra trên trình duyệt (`npm run test:browser`) cần một bản preview đang chạy và Playwright; xem đầu mỗi script.

## Thêm hay thay một tính năng

Mỗi thay đổi nói rõ, trong PR:

1. **Nó thay thế gì.** Thành phần, kiểu, script hay trang cũ nào không còn được dùng.
2. **Code nào bị xóa.** Thứ bị thay thì xóa trong cùng PR, cùng test của nó; không để lại để "đối chiếu" (lịch sử git đã giữ).
3. **Test nào được cập nhật.** Test theo hành vi hiện hành, không giữ nhánh cho giao diện đã gỡ.
4. **Bước build nào không còn cần.** Integration và dependency chỉ còn phục vụ thứ đã xóa thì gỡ luôn.

Tài sản được sinh ra một lần (bảng màu, font cố định trục, ảnh chia sẻ, bìa sách) được tạo bằng công cụ chạy tay và commit; build chỉ đọc nguồn, không bao giờ sửa nó.
