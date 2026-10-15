# 04 · MVP trang chủ Ấn bản

Ngày 24.09.2026. Nằm trong `pensees-next`, nhánh `local/phu-sa-quang-pho`. Kho `site` không bị sửa (xem mục "Sự cố" bên dưới).

## Xem

```sh
npm run dev -- --host 127.0.0.1 --port 4330
```

- Trang chủ mới: `http://127.0.0.1:4330/`
- Trang chủ cũ (revision 12) để đối chiếu: `http://127.0.0.1:4330/r12`
- Mở thẳng một lĩnh vực: `/?chu-de=kinh-te`, `/?chu-de=can-tinh`…
- Thử: ⌘K hoặc `/` để tìm; đổi Tự động · Sáng · Tối ở cuối trang; cuộn qua masthead để thấy thanh gọn.

Trong ứng dụng Claude, cấu hình preview tên `pensees-next-an-ban` đã được thêm vào `.claude/launch.json` ở thư mục gốc Studio.

## Tính năng nền tảng đã có

| Khối | Hành vi |
| --- | --- |
| Masthead | Tên ấn phẩm luôn một dòng từ 320 đến 1440px (cỡ chữ theo container), dòng mô tả, đường kẻ dày–mảnh, 5 chuyên mục; mobile cuộn ngang, không giấu sau menu |
| Thanh gọn | Xuất hiện khi masthead rời màn hình; vật liệu mờ; `inert` khi ẩn; mobile hẹp chuyển "Nhận bài mới" thành biểu tượng có nhãn |
| Bài mở đầu | Tiểu luận mới nhất (không phải pensée), nhãn lĩnh vực, tiêu đề, phụ đề, **đề từ** nếu bài mở bằng trích dẫn, câu mở bài, tác giả (liên kết trang tác giả), ngày, số phút, nút đọc, bản in của chính bài kèm chú thích cặp mực |
| Bài mới | 8 bài mới nhất; bộ lọc 6 lĩnh vực trên 30 bài, xếp theo số bài; View Transitions; trạng thái đọc bằng `role=status`; URL `?chu-de=`; trạng thái rỗng có đường quay lại |
| Pensées | Cột lề dính (sticky) ở desktop; ngày, tiêu đề, mở bài, tác giả, số phút; không ảnh (hình thức ngắn, thuần chữ) |
| Chuyên đề | Mỗi chuyên đề là một "tập sách": gáy màu theo lĩnh vực chủ đạo, các phần đánh số La Mã theo đúng thứ tự đọc, tổng số phút |
| Điểm sách | Kệ cuộn ngang tràn mép, bìa giữ màu gốc, đứng trên một đường kệ chung; nút trước/sau với trạng thái disabled thật; vệt mờ ở mép chỉ khi còn sách |
| Tìm kiếm | `<dialog>` gốc dùng lại engine Pagefind và xếp hạng tiếng Việt; ⌘K / Ctrl K / `/`; Escape đóng ngay; trả focus |
| Colophon | Nhận bài qua Substack, RSS, điều hướng, liên hệ, chú giải Sáu mực, giao diện Tự động · Sáng · Tối (lưu khi chọn, `theme-color` đi theo), về đầu trang |

## Tệp

| Tệp | Vai trò |
| --- | --- |
| `src/pages/index.astro` | Trang chủ Ấn bản |
| `src/pages/r12.astro` | Trang chủ cũ, nguyên văn, chỉ thêm tiêu đề/mô tả riêng |
| `src/layouts/EditionLayout.astro` | Khung trang của hệ mới, không nạp CSS cũ |
| `src/components/edition/` | `Plate`, `PlateFilters`, `Topics`, `Glyph` (Phosphor Light), `EditionSearch` |
| `src/lib/edition.ts` | Quy tắc biên tập: chủ đề → mực, cặp bản in, ngày tiếng Việt, số phút, đề từ, câu mở bài |
| `src/styles/edition/palette.css` | Sinh bởi `scripts/edition-palette.mjs` |
| `src/styles/edition/foundation.css` | Chữ, khoảng cách, chuyển động, nút, liên kết, masthead, thanh gọn, tìm kiếm, colophon |
| `src/styles/edition/home.css` | Các khối riêng của trang chủ |
| `public/brand/edition/palette.json` | Giá trị màu và bảng đo tương phản |
| `tests/edition.test.mjs` | 6 test khóa các nguyên tắc của hệ |
| `docs/redesign/lab/` | Hai trang thử nghiệm: so font tiếng Việt và so blend-mode với gradient map. Không xuất bản. |

Phụ thuộc mới: `@fontsource-variable/libre-bodoni`, `@phosphor-icons/core` (MIT).

## Kiểm chứng đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run build` | 85 trang (thêm `/r12`), 58 mục tìm kiếm, 58 PDF |
| `astro check` | 0 lỗi, 0 cảnh báo, 46 gợi ý (kế thừa) |
| `npm test` | **77/77 đạt**: 71 test sẵn có (5 được cập nhật, xem dưới) và 6 test mới |
| Bảng màu | Mọi cặp chữ/nền 6,1:1 đến 16,7:1; pigment trên giấy ≥ 3:1; 36 cặp bản in 8,9:1 đến 10,1:1 |
| Trình duyệt 1440 | Bố cục, hover, thanh gọn, bộ lọc (Kinh tế → 5 bài, URL cập nhật), ⌘K → "loi hua ngay doc lap" trả đúng bài đầu tiên, Escape, giao diện tối, kệ sách |
| Trình duyệt 375 và 320 | Không phần tử nào tràn ngang (đo bằng DOM); wordmark 28,5px và 24px một dòng; thanh gọn nằm trong lề |
| Cây heading | 1 `h1`, `h2` cho từng mục, `h3` cho từng bài; 0 nút thiếu nhãn; 0 ảnh thiếu `alt` |
| Focus bàn phím | Viền 2px màu mực, cách 3px, trên mọi phần tử tương tác đã thử |
| Console | Không lỗi |
| Dữ liệu ảnh (1440px, DPR 2, cuộn hết trang, không cache) | Ấn bản: 19 ảnh, **616 KB**. r12: 22 ảnh, **3.873 KB**, trong đó 16 poster dither cho 8 khung, vì mỗi khung tải cả bản sáng lẫn bản tối |
| HTML trang chủ | 147 KB thô, 21,6 KB Brotli (r12: 107 KB / 20,0 KB). Phần tăng thêm là 22 bài dự phòng cho bộ lọc và CSS font được inline |
| Font preload | 2 file Libre Bodoni, 34 KB |

**Năm test được cập nhật** vì chúng mã hóa cấu trúc của homepage cũ, không phải vì yêu cầu của chúng bị bỏ:

| Test | Trước | Sau | Yêu cầu vẫn được giữ |
| --- | --- | --- | --- |
| `font-loading` | trang chủ preload đúng 1 font Fraunces | preload 2 subset Libre Bodoni | font hiển thị được preload, có `crossorigin`, khớp `@font-face`, không nạp Bricolage/Playfair sớm |
| `home-discovery` | `h1#latest-title` | `h2#lead-title` | trang chủ có liên kết đọc tĩnh, không payload xoay vòng |
| `responsive-images` | `figure.opening-art`, ảnh `/brand/print/` | `figure.lead__figure`, ảnh `/images/responsive/` | ảnh mở đầu có ưu tiên tải, kích thước, WebP responsive |
| `seo` | `h1` là bài mở đầu | `h1` là tên ấn phẩm, bài mở đầu là `h2` có liên kết | đúng một `h1`, bài mở đầu có heading liên kết |
| `publication-interface` | mọi trang có `#search-dialog-title` và `footer.publication-footer` | trang Ấn bản có `#search-sheet-title`, `footer.colophon` và điều khiển giao diện | mọi trang có đúng một hộp tìm kiếm có nhãn, nút đóng, ô tìm, một `main`, một `h1` |

## Chưa làm, hoặc chưa kiểm chứng được

- Chưa thử trên thiết bị thật: Safari iOS với filter SVG, Android tầm trung. Viewport mô phỏng trong Chromium không thay thế được.
- Chưa chạy trình đọc màn hình thật. Mới kiểm tra ngữ nghĩa bằng DOM.
- Các trang con (bài viết, danh mục) vẫn dùng AtelierLayout. Từ trang chủ bấm sang sẽ thấy hệ cũ. Đây là phạm vi Giai đoạn 3–4.
- Libre Bodoni chưa đi qua pipeline subset của dự án.
- `npm run lint` toàn repo vẫn còn nợ cũ như ghi ở revision 10–12; chưa chạy formatter hàng loạt.

## Sự cố trong phiên làm việc

Khi mở preview, công cụ đã đọc `launch.json` ở thư mục gốc Studio và khởi động nhầm cấu hình `tcp-site`, tức **dev server của kho `site`**, trong vài giây trước khi bị dừng. Đã kiểm tra ngay sau đó: `git diff` và `git status` của `site` sạch, không file nào được git theo dõi bị đổi nội dung. Server đó đã sinh lại vài file cache nằm trong `.gitignore` (`.astro/fonts.css`, `.astro/font-preloads.mjs`, `.astro/font-inventory.json`, `scripts/.fetch-covers-result.json`) và làm mới thời gian sửa (mtime) của 12 file JSON sách mà nội dung không đổi. Để không lặp lại, cấu hình `pensees-next-an-ban` đã được thêm vào đúng file đó.

Dev server cũ của `pensees-next` ở cổng 4323 (PID 67499) bị thay bằng server mới ở cổng 4330 (`astro dev --force`), vì Astro chỉ cho một dev server mỗi dự án và server cũ đã cache một lỗi resolve.

Toàn bộ mã nguồn trước khi sửa được sao lưu tại `Cochinchine Pensées Studio/tmp/backups/pensees-next-before-an-ban-2026-09-24.tar.gz`.
