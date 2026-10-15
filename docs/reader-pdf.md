# Chia sẻ và PDF của page reader

## Chia sẻ

Cuối bài (`EditionReader.astro`, `.article-end__actions`) có ba thao tác: chép liên kết chuẩn (không mang tracking hay fragment; khi clipboard không có hoặc bị từ chối thì hiện ô URL đã chọn để người đọc tự chép), gửi qua email (`mailto:` với tiêu đề và URL chuẩn) và tải bản PDF. Không có SDK, tracker hay nút của mạng xã hội. Ảnh xem trước khi dán liên kết là bìa của bài; trang không có bìa dùng thẻ chung của tập san (`docs/seo.md`).

## Tạo PDF

`npm run build` tạo `/downloads/essays/{slug}.pdf` cho mọi bài công khai. Không sinh PDF cho bản nháp. `npm run pdf -- {slug}` tạo lại một bài từ HTML đã build để rà soát.

Pipeline chạy hoàn toàn khi build:

1. Đọc phần bài từ HTML thật: tiêu đề, tác giả, ngày, lời dẫn, ảnh bìa, nguyên văn, nhấn mạnh, danh sách, chú thích và ảnh trong bài. Bỏ điều khiển quay lại chú thích và giao diện website.
2. Dàn A4 với EB Garamond, lề in 64 pt, nền trắng, số trang. Giữ cấu trúc đoạn và chú thích cuối bài.
3. Tạo bản vector tạm trong bộ nhớ, đối chiếu chữ trích xuất với nội dung đã dàn trước khi chuyển ảnh. Thiếu glyph hoặc mất chữ là lỗi build.
4. Raster mỗi trang ở 216 dpi và đóng thành PDF chỉ có ảnh JPEG chất lượng 92. File tải xuống không có lớp chữ, font, annotation hay OCR nhúng. Metadata tên bài và ấn phẩm vẫn có để quản lý file. Phần mềm bên ngoài vẫn có thể OCR một ảnh; không thể ngăn điều này về mặt kỹ thuật.

Các thư viện PDF, canvas và font build nằm ngoài bundle trình duyệt. Nút tải không prefetch; chỉ tải PDF khi người đọc yêu cầu. Cache `.cache/reader-pdf` theo nội dung, font, code tạo PDF và lockfile; một build không đổi tái sử dụng file. Cache và PDF sinh ra không commit, Cloudflare build tạo lại. Giới hạn mỗi file dưới 24 MiB để có khoảng an toàn so với giới hạn tài sản tĩnh của host. Node >=22.13 cần cho renderer; khuyến nghị Node 24 trong môi trường deploy.

Font dành cho PDF nằm ở `scripts/assets/pdf-fonts`, không được phát tới trình duyệt. Bản EB Garamond 400/600 và nghiêng được instance từ [Google Fonts](https://github.com/google/fonts/tree/main/ofl/ebgaramond) bằng subset-font; giữ repertoire Latin, Hy Lạp, Cyrillic và ký tự của bộ bài hiện tại. Fallback chữ Hán được subset từ [Noto Serif CJK SC Regular](https://github.com/notofonts/noto-cjk/tree/main/Serif). Hai giấy phép SIL OFL được lưu cùng font. Nếu có hệ chữ mới, tạo lại subset từ nguồn được cấp phép và kiểm tra một trang có ký tự đó; không thay font web để sửa PDF.

## Kiểm tra trước phát hành

- Build kiểm tra fidelity chữ của từng bài trước raster. Test kiểm tra mọi bài có download và không đưa PDF vào sitemap.
- Mở các trang đầu/cuối và trang có chú thích/chữ Hán của bài mẫu sau thay đổi renderer. Kiểm tra lề, dấu tiếng Việt, nhấn mạnh, ảnh và số trang.
- Trích text và đọc tài nguyên PDF bằng pypdf/Poppler: mỗi trang phải có một ảnh, không có `/Font`, `/Annots` hoặc text trích xuất. Không coi riêng việc không chọn được chữ trong một viewer là bằng chứng.
- Sau deploy kiểm tra HTTP 200, Content-Type application/pdf, Content-Disposition attachment và X-Robots-Tag noindex của đường dẫn tải thật.

Để tái tạo font: tải hai variable TTF EB Garamond và OTF Noto từ các nguồn trên; chạy `node scripts/prepare-pdf-fonts.mjs /path/EBGaramond-variable.ttf /path/EBGaramond-Italic-variable.ttf /path/NotoSerifCJKsc-Regular.otf`. Script chỉ đọc nguồn local, không tự gọi dịch vụ font lúc build.
