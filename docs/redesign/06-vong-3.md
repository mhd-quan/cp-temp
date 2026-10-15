# 06 · Vòng 3: chữ ký, chuyển động, trang phụ

> Vòng 4 ([`07-vong-4.md`](07-vong-4.md)) thay mô-đun Điểm sách (nay là kệ sách), Trích đoạn (tờ trích), hover (ấn lại thay cho dấu bản khắc), footer, và chuyển font vào `src/assets/fonts`.

Ngày 24.09.2026. Tài liệu này ghi các thay đổi sau phản hồi vòng 2. Những gì còn hiệu lực từ các vòng trước: Sáu mực, quy tắc va chạm (mực chủ đề thứ nhất trên giấy chủ đề thứ hai), bố cục bìa và lưới Bài mới, trang đọc (chú thích bên lề, bộ Aa, nhớ vị trí). Typography, cách in bản khắc, hover và toàn bộ các trang phụ được thay bằng nội dung dưới đây.

## Phản hồi và cách xử lý

| Phản hồi | Xử lý |
| --- | --- |
| Pliego đã mua; cần thêm một sans thời đại, không phải kiểu Gotham tròn; Bodoni chỉ cho thương hiệu | Hệ chữ mới gồm ba giọng, mỗi giọng một việc (xem mục Chữ). |
| Trang chủ: khoa học, hài hòa, tạp chí, "trăm năm tuổi nhưng web mới từ hôm qua" | Lưới 12 cột cho mọi module. Hai bản in đầu của Bài mới có đáy thẳng hàng (tỉ lệ 1,053 tính từ 7 và 5 cột). **Đường kẻ cột** giữa các bài như báo khổ lớn. Tiêu đề mục cùng một mẫu: đường kẻ, tên mục Pliego, lối đi tiếp bằng chữ hoa sans kèm mũi tên. |
| Chồng 3 ảnh chuyên đề: ý tưởng được, thực hiện chưa tới; danh sách bên cạnh lệch khoảng cách và cỡ chữ | Chồng ảnh thành **bộ bài biết trả lời**: rê chuột hoặc focus vào phần II thì bản in II được nhấc lên đầu chồng (có nhịp "nhấc lên" 3,5%), số La Mã của phần đó đổi sang mực chuyên đề. Mỗi bản in là một tờ giấy có lề dưới ghi số phần. Danh sách: một lưới ba cột cố định (số La Mã · tên và phụ đề · số phút), mỗi dòng cách nhau bằng đường kẻ, nhịp dọc 1,1rem. Đổi chuyên đề thì bộ bài được "chia lại" từng tờ; vạch dưới tab trượt theo. Trên điện thoại, chạm vào chồng ảnh để lật tờ tiếp theo. |
| Điểm sách lạc quẻ; carousel cũ và giật | Bỏ carousel. Mỗi bài điểm sách là **cuốn sách đứng trên bản khắc của chính bài điểm sách** (bản khắc lùi về 40% để sách nổi lên). Bốn cuốn mới nhất xếp một hàng trên desktop, hai cột trên điện thoại. Tiêu đề là bài điểm sách (thứ người đọc sẽ mở); sách được trích dẫn bên dưới, tên sách in nghiêng, đúng lối trích sách của tạp chí. Rê chuột: sách nhấc lên 3%, bóng sâu dần. |
| Animation chậm, giật, nhất là Bài mới | Nguyên nhân chính: mỗi bản in dùng một SVG filter, nên trình duyệt phải vẽ lại ảnh ở mỗi khung hình khi phóng to hay đổi màu. Bản in giờ được **pha màu bằng GPU**: ảnh xám `screen` trên mực, giấy `multiply` lên trên. Công thức khớp gradient map cũ (đen ra mực, trắng ra giấy). Đổi chủ đề thì màu chuyển mượt trong 0,7s, không vẽ lại ảnh; các bài cũ lùi 150ms, bài mới trồi lên lần lượt (45ms mỗi bài). Đo trong trình duyệt: p95 17ms mỗi khung, không có khung dài hơn 50ms (Long Animation Frames). |
| Module trích đoạn xoay theo ngày như bản live | **Trích đoạn**: câu trích bằng Pliego nghiêng cỡ lớn, dấu ngoặc treo bằng mực của bài, chữ cái đầu dùng **swash** của Pliego; nguồn gồm rubric, tên bài, tác giả; bên phải là bản khắc của bài. Dùng lại bộ chọn theo ngày giờ Việt Nam đã có (114 câu, 57 bài), chỉ tải JSON của bài được chọn. Bản khắc được tô lại đúng mực khi đổi ngày. |
| Reader: header tùy chọn bằng sans chữ hoa | Mọi nhãn trong bảng Aa là Mona Sans chữ hoa; mẫu "Aa" hiển thị đúng ba mặt chữ Pliego, Garamond, Mona Sans. |
| Reader mobile thiếu phần đang đọc và phút còn lại | Trên điện thoại (và mọi màn hình dưới 1120px) thanh đọc thành **dòng trạng thái hai tầng**: trên là phần đang đọc (tên mục, hoặc "Phần 3/8"; trước phần đầu là tên bài), dưới là "Còn 25 phút". Tên tập san thu lại thành dấu **P.**. Bài có mục lục thì chạm vào dòng trạng thái để mở mục lục (có biểu tượng mục lục bên cạnh), mục đang đọc được đánh dấu. Vạch tiến độ 2px ở mép dưới thanh, in bằng mực của bài. |
| Hover phóng to đã lỗi thời | **Dấu bản khắc**: rê chuột vào một bài, bản in lún vào tờ giấy (thu 4,2%) để lộ lề giấy, và một đường viền mảnh hiện ra quanh nó, như gờ mà bản kẽm ấn vào giấy khi in intaglio. Focus bằng bàn phím cho cùng phản hồi; trên cảm ứng, bản in lún nhẹ khi nhấn. Chỉ dùng transform và opacity. Căn cứ từ các skill: `design-taste-frontend` và `frontend-design` coi hover phóng to mọi thẻ là dấu hiệu rập khuôn; `better-ui` yêu cầu chuyển động chỉ dùng thuộc tính GPU và viền ảnh mảnh. |
| Glyph | Bộ **Ấn ký** riêng (xem mục Glyph). |
| Các trang phụ | Làm lại toàn bộ 13 trang theo cùng một khung (xem mục Trang phụ). |

## Chữ

| Vai trò | Mặt chữ | Dùng cho |
| --- | --- | --- |
| Thương hiệu | **Libre Bodoni** | Chỉ tên tập san: masthead, thanh nổi, chữ ký cuối trang. Không xuất hiện ở bất kỳ chỗ nào khác. |
| Giọng | **Pliego** (Juanjo Lopez; license web của tập san) | Mọi tiêu đề, phụ đề, chữ đọc, trích dẫn. Tiêu đề 500, chữ đọc 400. **Swash** nghiêng cho chữ cái đầu của trích đoạn: đây là chữ ký riêng của tập san. |
| Bộ máy | **Mona Sans**, độ rộng 112% | Điều hướng, nhãn chủ đề, ngày, nút, tên tùy chọn: luôn là chữ hoa giãn 0,085–0,1em. Chữ hoa chỉ có ở sans, không bao giờ ở serif (test khóa điều này). |

**Vì sao Mona Sans.** Thử 24 sans có tiếng Việt trên Google Fonts trong đúng ngữ cảnh (masthead Bodoni, tiêu đề Pliego, nhãn, bảng tùy chọn, nút, chữ hoa có dấu chồng như Ể Ữ Ặ); trang thử ở `docs/redesign/lab/sans.html` và `sans-final.html`. Vòng chung kết có bốn font:

- **Mona Sans** (thắng): một grotesque công nghiệp vẽ lại. Ở độ rộng 112%, chữ hoa sắc và phẳng, đúng tinh thần thời đại, và tương phản rõ với nét bút cọ của Pliego.
- **Georama** (Production Type): quá gần Gotham ở các chữ tròn C và O.
- **Zalando Sans**: trung tính kiểu bán lẻ.
- **Commissioner** (nét loe): đẹp nhưng lại kéo về phía cổ điển.

**Pliego trong thực tế.** Có đủ dấu tiếng Việt ở năm độ đậm và bản nghiêng, có small caps, swash và chữ số kiểu cũ. Metric: x-height 0,431em; dấu của chữ hoa chồng dấu vượt lên trên ascender. Vì vậy mọi tiêu đề giữ line-height từ 1,04 trở lên, còn cỡ chữ đọc được tăng một bậc so với Vollkorn: desktop 17,5 / 19 / **20,5** / 22,5 / 24,5px, mobile 15,5 / 16,5 / **18** / 19,5 / 21,5px. Có một font thay thế đo theo metric (Georgia 90%) để chữ không nhảy dòng khi Pliego tải xong.

**License.** Điều khoản nằm trong file Pliego cấm sửa font, nên file được dùng nguyên, không cắt bớt ký tự (mỗi độ đậm khoảng 78 KB). Không đưa `public/fonts/pliego/` lên kho mã công khai.

Đã gỡ khỏi trang Ấn bản: Vollkorn, Vollkorn SC, Archivo, và SVG filter cho bản in.

## Glyph: Ấn ký

22 glyph vẽ tay trên lưới 24 đơn vị, nét 1,6, đầu nét vuông, góc vát nhọn (`src/components/edition/Glyph.astro`, bảng mẫu ở `lab/glyphs.html`). Ở 20px, nét dày 1,33px, bằng thân chữ Mona Sans cỡ nhãn. Glyph đứng cạnh chữ dùng kiểu `inline`: cỡ 1,2em và nét 1,9.

| Chỉ glyph | Glyph + chữ |
| --- | --- |
| Tìm kiếm, đóng, sáng/tối/tự động, về đầu trang, chú thích trước/sau, thư (thay nút đăng ký trên màn hình rất hẹp) | Mọi lối đi tiếp ("Tất cả tiểu luận →"), đường dẫn ra ngoài ("Nhận bài mới ↗", Substack ↗, RSS), "Chép liên kết", "Tải bản PDF", "Gửi qua email", lối quay về ("← Chuyên đề"), phân trang |

Mũi tên "→" nhích 3px khi rê chuột, mũi tên "←" nhích ngược lại.

## Trang phụ

Mọi trang dùng cùng một khung: masthead, **đầu trang** (lối quay về nếu là trang con, tên trang bằng Pliego cỡ lớn, một dòng phụ nếu cần), thân trang trên lưới 12 cột, chữ ký cuối trang. Các thẻ giống hệt trang chủ, chỉ cách sắp xếp thay đổi theo mục đích trang.

| Trang | Cách sắp xếp |
| --- | --- |
| Tiểu luận `/essays`, `/essays/2…7` | Lưới ba cột có đường kẻ cột, 9 bài một trang; phân trang có mũi tên và đủ mọi số trang |
| Pensées | Hai cột ghi chú (bản in vuông, ngày, tên, phụ đề), như cột lề trang chủ |
| Chuyên đề | Mỗi chuyên đề là một trang đôi (bộ bài bản in cạnh danh sách phần), trái phải xen kẽ |
| Một chuyên đề | Các phần như chương sách: bản in lớn, **số La Mã nghiêng cỡ 8rem bằng mực chuyên đề**, rubric, tên, phụ đề, ngày và số phút; nút "Bắt đầu từ phần I"; phần sắp ra giữ chỗ |
| Điểm sách | Cả 12 cuốn sách đứng trên bản khắc, bốn cột |
| Lưu trữ | Sổ đăng ký theo tháng: ngày, tên và phụ đề, rubric, tác giả, dấu Pensée. Thanh tháng dính dưới thanh nổi, vạch mực trượt theo tháng đang đọc |
| Tác giả, một tác giả | Mỗi tác giả với năm bài mới nhất trong sổ đăng ký; trang tác giả dùng lưới ba cột |
| Ban biên tập | Masthead in: chức danh chữ hoa sans, tên Pliego |
| Về tập san, Quyền riêng tư | Văn xuôi trên 7 cột; lề phải là các lối sang những trang khác của tập san và thư tòa soạn |
| Nhận bài mới, Tìm kiếm, 404 | Cùng đầu trang, một hành động chính |

**Chuyển động giữa các trang** (Chrome, Edge, Safari 18.2+; Firefox chuyển trang bình thường):

- Trang cũ mờ đi trong 160ms, trang mới hiện lên và trồi 10px.
- Thanh nổi đứng yên trong suốt lúc chuyển.
- **Bản in của bài vừa bấm lớn dần thành ảnh bìa của bài.** Khi quay lại, ảnh bìa thu về đúng vị trí cũ trong danh sách.

**Bản in khi tải.** Trước khi ảnh về, bản in là tờ giấy trơn; khi ảnh đã giải mã xong, mực được "in" lên trong 0,46s. Không bao giờ còn lóe khối màu đặc. Khi không có JavaScript, không có gì bị ẩn.

**Chỉ số tìm kiếm.** Các trang phụ giữ trạng thái index như bản cũ. Riêng trang chủ thử nghiệm vẫn `noindex`; tìm kiếm và 404 vẫn nằm ngoài sitemap.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run build` | 85 trang, 58 PDF, 58 mục tìm kiếm |
| `astro check` | 0 lỗi, 0 cảnh báo |
| `npm test` | **79/79 đạt**. Test đã cập nhật: bản in theo mực và giấy của chủ đề, không còn SVG filter; chữ hoa chỉ ở sans; cấm Vollkorn, Archivo và `filter:url()` trong CSS mới; preload font (3 file ở trang thường, 4 ở trang đọc); trích đoạn có câu trích dựng sẵn khi build và catalog chỉ gồm id và URL. |
| Tràn ngang | 17 trang ở 1440, 390 và 320px (đo DOM, kèm thanh cuộn 19px nên còn khắt khe hơn điện thoại thật): không tràn. Đã sửa 3 chỗ: nút đăng ký ở masthead dưới 360px thành glyph thư, hàng © ở footer xuống dòng, tiêu đề mục được phép xuống dòng. |
| Bộ lọc Bài mới | p95 17,1–17,6ms mỗi khung khi đổi chủ đề, 0 khung dài (LoAF > 50ms) |
| Dung lượng (Brotli) | Trang chủ 22,7 KB; Tiểu luận 14,5 KB; bài đọc dài 32,3 KB |
| Font preload | 202 KB: Bodoni latin 26, Mona Sans latin 98, Pliego Medium 78; trang đọc thêm Pliego Regular 79. Trước đây là 58 KB. |

## Giới hạn và việc tiếp theo

- **Font nặng hơn** vì không được cắt Pliego. Có thể giảm 58 KB nếu bỏ trục độ rộng của Mona Sans (dùng bản chỉ có trục độ đậm, 40 KB), nhưng chữ hoa sẽ hẹp lại. Cần bạn quyết.
- Chưa thử trên thiết bị thật: blend mode trên Safari iOS, chuyển trang cross-document, popover. Chưa chạy trình đọc màn hình thật.
- `/identity` và `/r12` vẫn là giao diện cũ (r12 để đối chiếu; identity là việc của Giai đoạn 5, sổ tay nhận diện).
- Các component và CSS kế thừa (Atelier, Chàm) vẫn còn trong mã vì r12 và identity dùng; gỡ khi hai trang đó được thay.
- Câu mô tả dưới tên trang "Pensées" và "Chuyên đề" là câu mặc định vòng 1 đã được duyệt; thay nếu ban biên tập có lời khác.
