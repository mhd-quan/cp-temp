# 05 · Vòng 2: phản hồi và điều chỉnh

> Vòng 3 ([`06-vong-3.md`](06-vong-3.md)) thay mục Font (nay là Pliego, Mona Sans, Bodoni chỉ cho tên tập san), cách in bản khắc (không còn SVG filter), sân khấu chuyên đề và điểm sách.

Ngày 24.09.2026. Tài liệu này ghi các thay đổi sau phản hồi của vòng 1. Những phần của [`02`](02-de-xuat-he-thong-an-ban.md) còn hiệu lực là Sáu mực, quy tắc va chạm và bản in bằng gradient map. Typography, thành phần giao diện và bố cục trang chủ được thay bằng nội dung dưới đây.

## Phản hồi và cách xử lý

| Phản hồi | Xử lý |
| --- | --- |
| Bố cục nhàm, không có lý do để rời Substack | Trang chủ mở bằng **bìa tràn viền**: bản khắc của bài mới nhất phủ gần hết màn hình đầu, thẻ tiêu đề bằng giấy đè lên ảnh, ảnh trôi chậm hơn chữ khi cuộn. Tiếp theo là lưới tạp chí bất đối xứng (7/5 rồi 4/4/4), sân khấu chuyên đề, sân khấu điểm sách. |
| Không cần thuyết minh màu cho từng ảnh | Bỏ dòng chú thích "Bản in: mực… trên giấy…". Bỏ bảng "Sáu mực" ở footer. |
| Ô màu vuông ở bộ lọc thừa; nhãn chủ đề cần sáng tạo hơn | Chip lọc chỉ là chữ small caps. Màu chỉ xuất hiện **khi người đọc chọn**: một vệt bút dạ quang vẽ từ trái sang phải phía sau chữ, và **toàn bộ bản in của lưới được in lại bằng mực của chủ đề đó**. Nhãn chủ đề trên mỗi bài là **rubric**: tên chủ đề viết small caps bằng chính mực của nó, như đề mục mực đỏ trong sách chép tay. |
| Bài chỉ nên được giới thiệu bằng ảnh, tiêu đề, phụ đề | Bỏ đề từ và đoạn mở bài ở bìa, bỏ đoạn trích ở Pensées. Mỗi bài chỉ còn ảnh, rubric, tiêu đề, phụ đề. |
| "Toàn bộ 56 tiểu luận" | "Tất cả tiểu luận". Không còn số đếm nào phải cập nhật tay. |
| Chuyên đề sặc mùi AI, mobile nghiệp dư | Làm lại thành sân khấu: tên các chuyên đề là tab bên trái; bên phải là **ba bản in của chuyên đề xếp chồng như những tờ tranh trên bàn**, in bằng mực chủ đạo của chuyên đề, cạnh danh sách phần I · II · III kèm phụ đề. Mobile: tab cuộn ngang, bản in xếp chồng trong khung đã tính hình học để không tràn. |
| Điểm sách lạc lõng, không có điểm neo | Làm lại thành sân khấu: bìa sách lớn, đổ bóng thật, đứng trên **trường màu của chủ đề bài điểm sách**; bên cạnh là tác giả, tên sách, bài điểm sách. Dải bìa nhỏ bên dưới để chọn; bìa được chọn "mọc" ra từ vị trí của nó (View Transition). |
| Footer cần làm lại | Dòng "Nhận bài mới ↗" cỡ lớn, ba cột điều hướng small caps (Đọc · Tập san · Theo dõi), **tên tập san đặt tràn hết bề ngang** như chữ ký trang cuối, hàng dưới cùng có © và điều khiển giao diện bằng biểu tượng. |
| Câu chữ đệm | Bỏ: dòng mô tả dưới masthead, "Tìm kiếm" và "⌘K" cạnh biểu tượng, chú thích bản in, lời mô tả Pensées và Chuyên đề, câu giải thích Substack, dòng "Esc để đóng", tiêu đề hiển thị của hộp tìm kiếm (vẫn giữ cho trình đọc màn hình). Phím tắt ⌘K và "/" vẫn hoạt động, chỉ không quảng cáo. |
| Font Source Serif và Be Vietnam Pro nhạt | Xem mục Font. |
| Thanh nổi nhỏ | Cao 72px (mobile 60px), khoảng cách giữa các mục 20–44px, điều hướng dùng small caps thật Vollkorn SC 600. |
| Reader | Xem mục Trang đọc. |

## Font: khảo sát và lựa chọn

**YouWorkForThem.** Hỗ trợ tiếng Việt rất hiếm: trong toàn bộ danh mục, tìm "Vietnamese" chỉ ra 6 serif và 27 sans. Đã thử trực tiếp bằng Type Tester của họ với chữ "Lời hứa Ngày Độc lập":

| Font | Loại | Giá từ | Nhận xét |
| --- | --- | --- | --- |
| **Pliego** (Juanjo Lopez) | serif chữ đọc, 5 độ đậm + nghiêng, small caps, tiếng Việt | $50 + license web riêng | Tốt nhất trong mọi font đã thử. Nét bút cọ góc cạnh, nghiêng đẹp, dấu tiếng Việt chắc. Tên lấy từ *pliegos de cordel*, những tập văn in rời bình dân thế kỷ XVI–XVIII. **Đề xuất nâng cấp nếu bạn mua license web.** |
| Grandlux (Red Type) | Didone hẹp, 6 độ đậm, không nghiêng | $16 | Dấu chuẩn, nhưng sắc thái "hàng xa xỉ", không hợp tập san tư tưởng |
| Mezzotint CF | display, một độ đậm | $44 | Quá hẹp phạm vi |
| CA Saygon Text (Cape Arcona) | grotesque, 7 độ đậm + nghiêng | $40 | Chữ hoa có dấu chồng gọn. Tên "Saygon" không liên quan Sài Gòn (theo mô tả của hãng). Không cần, vì giao diện đã dùng small caps. |

Mình không mua hay tải font thương mại nào.

**Google Fonts.** Đã dựng trang thử theo ngữ cảnh (tiêu đề 500, phụ đề nghiêng, thân 18px có đậm và nghiêng, nhãn chữ hoa) cho 9 serif chữ đọc, 9 sans và 9 serif hiển thị. Trang thử nằm ở `docs/redesign/lab/fonts.html` và `smallcaps.html`.

**Chọn (đang chạy trong MVP):**

| Vai trò | Font | Vì sao |
| --- | --- | --- |
| Hiển thị | Libre Bodoni | Vẫn vượt Playfair (bản mới), Noto Serif Display, Imbue ở cỡ lớn |
| Chữ đọc | **Vollkorn** | Mảng chữ đậm, chắc, có cá tính; nghiêng sống động, đậm có trọng lượng thật. Khác hẳn cảm giác trung tính của Source Serif. |
| Nhãn, điều hướng, nút | **Vollkorn SC 600** | Small caps thật với dấu tiếng Việt dựng sẵn. Đây là lời giải cho gợi ý "all caps / small caps, tăng weight": chữ hoa nhỏ kiểu sách cổ, không phải chữ hoa giả bằng CSS. |
| Sans (tùy chọn trong reader) | Archivo | Grotesque có trục độ rộng, chữ hoa có dấu gọn |
| Serif cổ điển (tùy chọn trong reader) | EB Garamond | Có sẵn trong dự án |

Be Vietnam Pro, Source Serif 4, Fraunces và Bricolage không còn được dùng trên các trang Ấn bản. Một test chặn chúng quay lại trong CSS mới.

## Trang đọc

Áp dụng cho cả 58 bài (`src/layouts/EditionReader.astro`).

- **Thanh đọc** luôn hiện: tên tập san, tên bài, phần đang đọc ("Phần 3/8" cho bài chia phần bằng dấu ngắt, tên mục cho bài có tiêu đề mục), số phút còn lại, vạch tiến độ 2px, nút mục lục, "Aa", tìm kiếm.
- **Đầu bài**: rubric, tiêu đề Libre Bodoni, phụ đề nghiêng, tác giả · ngày · số phút, rồi bản in tràn viền.
- **Chú thích**: ở màn hình rộng từ 1200px, mỗi chú thích nằm ở lề phải **ngang đúng dòng có số tham chiếu**, tự đẩy xuống khi chồng nhau. Rê chuột hoặc focus vào số thì chú thích sáng lên, và ngược lại. Ở màn hình hẹp, bấm số mở một sheet từ mép dưới, có nút trước/sau để duyệt 24 chú thích. **Trang không bao giờ nhảy khỏi chỗ đang đọc.** Danh sách chú thích cuối bài vẫn giữ.
- **Mục lục**: lề trái (từ 1200px) với phần đang đọc được đánh dấu; dưới 1200px là sheet mở từ nút ≡. Chỉ hiện khi bài có từ 2 tiêu đề mục.
- **Trang đọc (Aa)**: popover ở desktop, bottom sheet ở mobile. Mọi thay đổi áp dụng ngay và **giữ nguyên đoạn đang đọc tại vị trí cũ**.

| Tùy chọn | Giá trị |
| --- | --- |
| Cỡ chữ | 5 bậc. Desktop 17 / 18,5 / **20** / 22 / 24px; mobile 15 / 16 / **17,5** / 19 / 21px. Hai thiết bị nhớ riêng. |
| Kiểu chữ | Vollkorn · Garamond (×1,1 bù chiều cao chữ thường) · Archivo (×0,94) |
| Độ rộng dòng | Hẹp 27em (≈60 ký tự) · Vừa 31em (≈69) · Rộng 36em (≈80). Ẩn trên điện thoại. |
| Giãn dòng | 1,5 · 1,68 · 1,86 |
| Nền | Giấy · Ngà · Sương · Rêu, mỗi nền có bản sáng và tối; chữ chính ≥ 13,5:1, chữ phụ ≥ 5,4:1 |
| Giao diện | Tự động · Sáng · Tối, dùng chung cho cả tập san |

- **Cuối bài**: dấu ❦; Chép liên kết · Gửi email · Tải PDF; điều hướng trong chuyên đề (I · II · III, phần hiện tại được đánh dấu); bài trước/sau kèm ảnh, tiêu đề, phụ đề; thư tòa soạn.
- **Liên tục**: gợi ý "Đọc tiếp chỗ đang dở" (lưu trên máy 30 ngày, tối đa 40 bài); bôi chọn chữ để chép trích dẫn kèm nguồn, hoặc chép liên kết tới đúng đoạn.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run build` | 85 trang, 58 PDF, 58 mục tìm kiếm |
| `astro check` | 0 lỗi, 0 cảnh báo |
| `npm test` | **79/79 đạt**. Test cập nhật theo cấu trúc mới: font preload (3 file), ảnh bìa (`.cover__plate`), bốn test của `edition.test.mjs`. Test mới: các tùy chỉnh reader có mặt và mọi chú thích có đích; tương phản của 8 nền đọc. |
| Trang chủ 1440, 390px | Không tràn ngang (đo DOM). Bộ lọc Kinh tế: 5 bài, in lại bằng mực Nghệ, URL `?chu-de=kinh-te`. Tab chuyên đề và dải chọn sách hoạt động. Bản in chuyên đề nằm trong khung trên mobile (466px < 478px, danh sách bắt đầu ở 502px). |
| Trang đọc 1440px | Chú thích bên lề ngang dòng tham chiếu; không tràn ngang sau khi cho URL dài xuống dòng. Nền Ngà + Garamond + cỡ 4 lưu `size-desktop: 4`; giao diện Tối đồng bộ với footer. Mục lục lề trái đánh dấu đúng phần. |
| Trang đọc 390px | Chữ 17,5px; sheet chú thích "2 / 24" mở mà trang không đổi vị trí; sheet Aa từ mép dưới. |
| Dung lượng | Trang chủ 21,5 KB Brotli; bài dài có 24 chú thích 30,0 KB. Font preload 58 KB (Bodoni Latin + Việt, Vollkorn SC). |

## Giới hạn và việc tiếp theo

- Chưa thử trên thiết bị thật (Safari iOS với filter SVG và popover; Android tầm trung). Chưa chạy trình đọc màn hình thật.
- Trang danh mục (Tiểu luận, Chuyên đề, Điểm sách, Lưu trữ…) vẫn dùng giao diện cũ; đó là Giai đoạn 4.
- Font chưa qua pipeline subset của dự án.
- Nếu bạn mua license web cho Pliego, chỉ cần thay `--font-text` và `--font-caps` (Pliego có small caps) trong `foundation.css`.
- Sự cố phiên trước (dev server `site` bị khởi động nhầm vài giây, không có file được theo dõi nào đổi) đã được ghi ở [`04`](04-mvp-trang-chu.md).
