# 03 · Kế hoạch hành động

Từ MVP trang chủ tới một website nhất quán trên mọi trang. Mỗi giai đoạn có đầu ra và tiêu chí nghiệm thu rõ ràng. Thứ tự dựa trên phụ thuộc: không dựng trang con trước khi nền móng được chốt.

## Giai đoạn 0 · Đã xong trong đợt này

- Đánh giá: [`01-danh-gia.md`](01-danh-gia.md).
- Hệ thống: [`02-de-xuat-he-thong-an-ban.md`](02-de-xuat-he-thong-an-ban.md).
- MVP trang chủ Ấn bản tại `/`, trang chủ cũ giữ ở `/r12`: [`04-mvp-trang-chu.md`](04-mvp-trang-chu.md).

## Giai đoạn 1 · Những quyết định chỉ bạn đưa ra được

Chặn các giai đoạn sau. Mỗi câu hỏi có đề xuất mặc định.

| # | Câu hỏi | Đề xuất mặc định |
| --- | --- | --- |
| 1 | Brief nói "chính trị, **lịch sử, văn hóa**, xã hội", nhưng dữ liệu có 6 chủ đề: Chính trị, Kinh tế, Căn tính, Xã hội, Tư tưởng, Hiện đại. Có thêm *Lịch sử* và *Văn hóa* không? | Giữ 6 chủ đề cho tới khi có ít nhất 5 bài thuộc mỗi chủ đề mới. Hệ Sáu mực mở rộng được: thêm một mực nghĩa là thêm một góc màu và chạy lại script. |
| 2 | Gán mực cho lĩnh vực (Son = Chính trị, v.v.) | Như đề xuất. Nên xem lại lúc duyệt MVP, vì đổi sau khi ra mắt sẽ làm người đọc mất thói quen. |
| 3 | Thứ tự chủ đề của một bài quyết định mực nào in, giấy nào lót. Ban biên tập có muốn coi chủ đề đầu là "chính" một cách có chủ ý không? | Có. Thêm quy ước vào hướng dẫn biên tập: chủ đề đầu là chủ đề chính. |
| 4 | Dấu hiệu "P." (favicon) và social card hiện vẫn thuộc r12 | Làm lại ở Giai đoạn 5 bằng Libre Bodoni và Sáu mực. |
| 5 | Theme mặc định theo hệ thống (MVP) hay luôn sáng (r12) | Theo hệ thống. Bản in không đổi màu nên lý do giữ "luôn sáng" của R12 không còn. |
| 6 | "Nhận bài mới" ở header dẫn tới `/subscribe`, ở footer dẫn thẳng Substack | Giữ hai đường: header giải thích trước, footer cho người đã quyết. |
| 7 | Duyệt hai câu mới: "Những bài viết ngắn hơn tiểu luận." và "Những loạt bài nên đọc theo thứ tự." | Thay bằng lời của ban biên tập nếu có. |
| 8 | Bài mở đầu: tự động (tiểu luận mới nhất) hay biên tập viên chọn | Tự động, kèm trường `featured` tùy chọn trong frontmatter để ghim thủ công. |

## Giai đoạn 2 · Chốt nền móng

| Việc | Tiêu chí nghiệm thu |
| --- | --- |
| Đưa Libre Bodoni vào pipeline `subset-fonts.mjs` (hiện đang nạp đủ bộ từ fontsource) | Font hiển thị tối đa khoảng 60 KB cho hai subset đầu trang; preload trỏ tới file đã subset |
| Gỡ Fraunces, Bricolage, Playfair SC khỏi pipeline font sau khi mọi trang đã chuyển | `font-inventory.json` không còn ba họ này |
| Luật lint cho CSS hệ mới: cấm `text-transform: uppercase`, `transition: all`, `!important`, hex viết tay ngoài `palette.css` | `npm run lint` bắt lỗi; test `edition.test.mjs` đã khóa ba luật đầu |
| Ảnh chụp hồi quy thị giác (Playwright) cho `/` ở 320, 390, 768, 1280, 1440; sáng và tối | Có ảnh chuẩn trong repo; khác biệt vượt ngưỡng thì CI báo |
| Kiểm tra bản in trên Safari iOS và Firefox (filter SVG, View Transitions, `@starting-style`) | Ghi kết quả thật; nếu Safari chậm với filter SVG trên 9+ ảnh thì chuyển sang ảnh hai mực dựng lúc build bằng `sharp` (cùng công thức) |

## Giai đoạn 3 · Trang đọc bài (quan trọng nhất)

Người đọc ở đây lâu nhất. Chuyển reader sang Ấn bản nhưng **giữ nguyên hành vi** đã được kiểm chứng trong `READING-PRINCIPLES.md` (chú thích bên lề, mục lục theo heading, nhớ vị trí, trích dẫn, Aa).

- Đầu bài: nhãn chủ đề, tiêu đề Libre Bodoni, phụ đề nghiêng, tác giả, ngày, số phút. Bản in toàn khổ kèm chú thích cặp mực.
- Cột chữ Source Serif 4, 66ch, 18–21px; đề từ dùng đường kẻ màu mực của bài.
- Bốn "sắc giấy" của reader: gộp vào Sáu mực (giấy theo lĩnh vực của bài) hay giữ riêng? Đề xuất: giữ **một** giấy đọc trung tính cộng tùy chọn sáng/tối. Màu dành cho bản in và nhãn, không phủ lên cả trang.
- Nghiệm thu: 58 bài build được; hash nội dung MDX không đổi; test reader hiện có vẫn xanh; đo LCP bài dài trên điện thoại thật.

## Giai đoạn 4 · Các trang danh mục

Lần lượt: Tiểu luận (phân trang), Pensées, Chuyên đề (mỗi chuyên đề là một "tập sách"), Điểm sách (kệ đầy đủ), Tác giả, Lưu trữ theo tháng, Tìm kiếm, Về tập san, Nhận bài mới, 404.

- Trang lĩnh vực mới `/chu-de/[slug]`: mục lục của một mực, có URL riêng để chia sẻ. Bộ lọc trang chủ sẽ dẫn tới đây ở mục "xem tất cả".
- Mỗi trang dùng `EditionLayout`; gỡ `html[data-interior]` và các selector phủ da.
- Nghiệm thu: không trang nào còn import `atelier.css`, `cham.css`, `publication-pages.css`; xóa `AtelierLayout`, `BaseLayout`, `Header.astro`, `ViewCustomizer.astro`, `PrintImage.astro`, `printEntrance.ts`, `adaptivePixels.mjs` và **81 MB** `public/brand/print/`.

## Giai đoạn 5 · Bộ nhận diện

- Viết lại `/identity` thành sổ tay sống của Ấn bản: Sáu mực (đọc trực tiếp `palette.json`), thang chữ, thành phần kèm trạng thái, bảng chuyển động, quy tắc va chạm, và mọi cặp mực/giấy trên cùng một tranh khắc.
- Dấu "P." mới, social card sinh tự động cho từng bài (bản in của bài + tiêu đề Libre Bodoni), favicon.
- `BRAND-BOOK.md` phiên bản Ấn bản; lưu Chàm & khoáng vào `archive/`.

## Giai đoạn 6 · Chất lượng trước khi ra mắt

| Hạng mục | Cách kiểm |
| --- | --- |
| Hiệu năng | Lighthouse và WebPageTest trên 4G giả lập và điện thoại tầm trung thật; LCP dưới 2,5s, CLS dưới 0,1 |
| Tiếp cận | VoiceOver (macOS, iOS) và NVDA đi hết trang chủ, trang bài, tìm kiếm; zoom 200%; chỉ dùng bàn phím |
| Màu | Mô phỏng mù màu (protan, deutan, tritan) trên bộ lọc và bản in; `forced-colors` |
| Ngôn ngữ | Rà toàn bộ nhãn giao diện; không còn chữ tiếng Anh ngoài tên riêng |
| SEO | Đường dẫn giữ nguyên; bỏ `noindex` khi thay site; kiểm tra sitemap và canonical |

## Giai đoạn 7 · Ra mắt

- Mở PR từ `pensees-next` vào kho `site` sau khi bạn duyệt. Không cần redirect vì mọi đường dẫn giữ nguyên.
- Tắt `noindex`; theo dõi GA4 hai tuần: tỉ lệ nhấn bộ lọc, tìm kiếm, "Nhận bài mới".

## Rủi ro

| Rủi ro | Giảm thiểu |
| --- | --- |
| Filter SVG chậm trên Safari hoặc máy yếu | Phương án dự phòng: dựng ảnh hai mực lúc build bằng `sharp` với cùng bảng màu; chỉ khác nơi thực hiện |
| Libre Bodoni ở cỡ nhỏ trông mảnh | Không dùng dưới 19px; cỡ nhỏ dùng Source Serif 4 |
| Người mù màu đỏ–lục không phân biệt son và lục | Màu không bao giờ đứng một mình; nét in dựa vào độ sáng (chênh 0,58 L) nên luôn đọc được |
| Chủ đề mới làm vỡ hệ sáu | Script sinh màu nhận thêm góc màu; thêm test tương phản tự động |
| View Transitions chưa có ở một số trình duyệt | Không có thì đổi tức thì, không mất chức năng |
