# 01 · Đánh giá thiết kế: The Cochinchine Pensées

Ngày 24.09.2026. Đánh giá độc lập, có phê phán, trên hai đối tượng:

- **Trang live** `cochinchinepensees.studio` (kho `site`, nhánh main). Chỉ xem, không sửa.
- **Bản prebuild** `pensees-next` ở trạng thái revision 12 ("Chàm & khoáng", hai ngữ cảnh màu). Trang chủ cũ vẫn giữ nguyên tại `/r12` để đối chiếu.

## Phương pháp

| Nguồn bằng chứng | Chi tiết |
| --- | --- |
| Trình duyệt | Live ở 1440×900 và 375×812. r12 ở 1440, 375, 320; sáng và tối. Đo trực tiếp bằng DOM (kích thước, font, màu tính toán, tràn ngang, tài nguyên tải). |
| Mã nguồn | `src/pages/r12.astro` (bản sao nguyên văn homepage cũ), `AtelierLayout.astro`, 5 file CSS của trang chủ, `PrintImage.astro`, `printEntrance.ts`, `articlePrintTone.mjs`. |
| Tài liệu dự án | `BRAND-BOOK.md`, `READING-PRINCIPLES.md`, `ATELIER-REVISION-02` → `12`, `ATELIER-VALIDATION.md`. |
| Khung đánh giá | Rubric 10 chiều của `design-review`; `better-interface` (điều phối `better-typography`, `better-colors`, `better-ui`); nền tảng HIG của `apple-design`; `interaction-design`; các danh sách "dấu hiệu AI" của `frontend-design`, `design-taste-frontend`, `uncodixfy`; quy trình audit của `redesign-existing-projects`. |

Giới hạn: không có thiết bị vật lý, không chạy trình đọc màn hình thật. Ba skill con mà `better-interface` yêu cầu (`better-accessibility`, `better-layout`, `better-writing`) chưa được cài, nên ba miền đó được xét bằng rubric của `design-review` thay thế. Skill `design-review` có một lệnh gửi "usage ping" và một chế độ Pro gửi mã nguồn tới máy chủ bên ngoài. Mình không chạy cả hai vì chúng gửi dữ liệu ra ngoài khi bạn chưa đồng ý.

## Kết luận ngắn

**Trang live** mạch lạc nhưng chung chung: nhãn giao diện bằng tiếng Anh cho một tập san tiếng Việt, tiêu đề chữ hoa nhỏ Playfair SC khó đọc với dấu tiếng Việt, lưới ba cột bằng nhau. Tài sản mạnh nhất của nó là **tranh khắc riêng cho từng bài**.

**Bản r12** được làm rất kỹ về kỹ thuật: đo tương phản, tôn trọng reduced motion, test tự động, tìm kiếm tiếng Việt không dấu. Nhưng về thiết kế, nó **thiếu một ý tưởng chủ đạo**. Mười hai vòng sửa chồng lên nhau mà không vòng nào dọn vòng trước. Nhận diện chuyển từ "Phù sa & quang phổ" sang lilac, rồi tím điện, rồi "Chàm & khoáng", rồi "hai ngữ cảnh màu". Kết quả là bốn bảng màu, ba kỹ thuật xử lý ảnh (duotone, halftone, dither) và một lớp CSS bồi tụ. Màu sắc chỉ để trang trí, không mang nghĩa. Typography dựa trên những lựa chọn mặc định mà các skill thiết kế gọi thẳng tên là dấu hiệu của giao diện do AI tạo.

Theo thang của `better-interface`, kết luận là **Block**: còn 4 lỗi mức HIGH.

## Bảng điểm (1 đến 5)

| Chiều | Live | r12 | Ghi chú |
| --- | --- | --- | --- |
| Phân cấp thị giác | 3 | 2 | r12: ảnh mở đầu không thuộc bài mở đầu; nhãn in hoa lấn tiêu đề |
| Typography | 2 | 2 | Live: tiêu đề SC; r12: 22 cỡ chữ trên một trang, 66% chữ là in hoa |
| Khoảng cách, nhịp | 3 | 3 | r12 có nhịp tốt ở desktop; mobile mất cân |
| Màu, tương phản | 3 | 3 | Tương phản đạt; màu không mang nghĩa |
| Chuyển động | 2 | 3 | r12 tôn trọng reduced motion; hiệu ứng mực 760ms không gắn với thao tác |
| Trạng thái thành phần | 2 | 4 | r12: aria-pressed, disabled thật, focus rõ |
| Khả năng tiếp cận | 3 | 4 | r12 tốt ở ngữ nghĩa và focus |
| Responsive | 3 | 3 | r12: wordmark gãy dòng trên mobile |
| Nội dung, lời | 2 | 3 | Live: nhãn tiếng Anh; r12: tiêu đề mục "thi vị" nhưng rập khuôn |
| Nhất quán, thương hiệu | 2 | 2 | r12: bốn thế hệ token cùng tồn tại |

## Phát hiện, xếp theo mức độ

Mức độ theo `better-interface`: **HIGH** làm hỏng nhiệm vụ, gây hiểu sai, hoặc là lỗi hệ thống lặp lại; **MEDIUM** làm giảm đáng kể khả năng hiểu, hiệu quả hoặc tính nhất quán; **LOW** là tinh chỉnh.

| # | Mức | Miền | Vị trí | Hiện trạng | Đề xuất | Vì sao |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | HIGH | Nội dung, phân cấp | `src/pages/r12.astro:34` | Bài mở đầu "Hongkong và Hoàng Chi Phong" đi cùng tranh `river-arcade-960.webp`, một minh họa vòm sông không liên quan | Bài mở đầu luôn dùng ảnh của chính nó, kèm chú thích | Trong báo chí, ảnh cạnh tiêu đề được hiểu là ảnh của bài. Ghép sai ảnh gây hiểu sai. |
| 2 | HIGH | Hình ảnh, hiệu năng | `PrintImage.astro:14-15`, `public/brand/print/` | Tranh khắc (vốn đã là nét) bị dither lần nữa, nét mảnh vỡ thành hạt. 460 poster, 81 MB dựng sẵn. Mỗi khung có cả `<img>` sáng lẫn tối nên tải cả hai. Đo ở 1440px: 22 ảnh, 3.873 KB, trong đó 16 là poster cho 8 khung. | Giữ nguyên ảnh khắc gốc, in hai mực khi hiển thị bằng gradient map SVG. Mỗi khung chỉ một ảnh. | "In lưới hai lần" làm mất chính chất lượng của tranh khắc. Tải gấp đôi dữ liệu trên mobile. |
| 3 | HIGH | Màu | `src/lib/articlePrintTone.mjs:10-14` | Màu ảnh của mỗi bài do hàm băm FNV quyết định: `hash % 4`. Người đọc không học được gì từ màu. | Mỗi lĩnh vực một màu mực. Ảnh in mực của chủ đề chính trên giấy của chủ đề phụ. | Màu là kênh thông tin rẻ nhất trên trang. Dùng nó ngẫu nhiên là lãng phí và làm nhiễu. |
| 4 | HIGH | Hệ thống CSS | `atelier.css`, `cham.css`, `cham-tokens.css`, `atelier-themes.css`, `publication-pages.css` | 46 KB CSS cho trang chủ. 79 selector bị định nghĩa lại ít nhất 3 lần (`.navline .subscribe-link` 10 lần). 24 `!important`. `.print-tone-1` có hai bộ màu mâu thuẫn (`atelier.css:69` `#ffc3b1/#85314f` và `cham-tokens.css:4` `#f0d2bd/#823422`). Tên token `lilac/chalk/clay` giờ trỏ tới men ngọc, hoàng thổ, vỏ đào. | Một nguồn token sinh tự động, CSS mới không ghi đè CSS cũ, alias cũ bỏ hẳn | Mọi thay đổi đều có thể phá chỗ khác. Tên nói dối về giá trị. Đây là lỗi hệ thống, nên xếp HIGH. |
| 5 | MEDIUM | Typography | r12, đo trên DOM | 139 phần tử chữ: 92 in hoa (66%), 90 dùng Bricolage (65%), chỉ 11 dùng Source Serif 4 (8%). 22 cỡ chữ khác nhau; `atelier.css` có 46 giá trị `font-size`. | Thang 8 bậc theo vai trò. Nhãn viết thường theo câu. Chữ đọc là giọng chính. | Trang chủ của một tập san tư tưởng đang nói bằng nhãn, không bằng câu. |
| 6 | MEDIUM | Nhận diện | `atelier.css:65`, `index` r12 | Fraunces làm chữ hiển thị. Cả 5 tiêu đề mục đều nghiêng chữ cuối ("Những trang *mới.*", "Trên bàn *đọc.*"...). 22 mũi tên ↗ gắn sau liên kết. Số 01 đến 04 cho các chuyên đề vốn không có thứ tự. | Chữ Didone có căn cứ lịch sử. Tiêu đề mục phẳng. Mũi tên chỉ dùng cho liên kết ra ngoài. Số La Mã chỉ dùng cho các phần trong một chuyên đề. | `frontend-design` và `design-taste-frontend` nêu đích danh từng mẫu này là dấu hiệu giao diện rập khuôn. |
| 7 | MEDIUM | Ngôn ngữ | Live: header, trang chủ | "LATEST ESSAY", "RECENT ESSAYS", "FROM THE STACKS", "SUBSCRIBE ON SUBSTACK" | Toàn bộ nhãn giao diện bằng tiếng Việt | Tập san tiếng Việt mà giao diện nói tiếng Anh: độc giả mới khó định vị. |
| 8 | MEDIUM | Biên tập | Live và r12 | Bài mở đầu là một *pensée* 1.844 chữ, trong khi các tiểu luận 7.000 chữ nằm bên dưới. Trường `form` có trong dữ liệu nhưng không được dùng. | Bài mở đầu là tiểu luận mới nhất. Pensées có cột riêng ở lề. | Hình thức bài là thông tin biên tập. Trộn lẫn làm phẳng thứ bậc. |
| 9 | MEDIUM | Tương tác | `r12.astro` script | Bộ lọc chỉ chạy trên 6 bài, nên "Căn tính" hay "Kinh tế" cho 0 đến 1 kết quả. Trạng thái lọc không nằm trong URL. | Lọc trên 30 bài, hiện 8 bài mới nhất của lĩnh vực. Ghi `?chu-de=` để chia sẻ. | Một bộ lọc cho kết quả rỗng dạy người đọc đừng dùng nó. |
| 10 | MEDIUM | Responsive | `atelier.css:77` | Mobile: wordmark tách thành "The Cochinchine" / "Pensées." căn phải | Wordmark một dòng ở mọi độ rộng, cỡ chữ theo container | Tên ấn phẩm là thứ không được gãy. |
| 11 | MEDIUM | Bảo trì | `Header.astro` (543 dòng), `ViewCustomizer.astro` (847 dòng), 5 layout | Các trang trong được "phủ da" bằng selector ghi đè như `html[data-interior] main :is(...)` | Mỗi trang dùng một layout của hệ mới; gỡ component kế thừa theo lộ trình | Hai hệ thiết kế chạy song song thì không hệ nào thật sự là chuẩn. |
| 12 | LOW | Chuyển động | `printEntrance.ts` | Hiệu ứng "mực định hình" 760ms chạy một lần mỗi phiên, không gắn với thao tác nào. Khi cuộn nhanh có khung ảnh trống. | Chuyển động chỉ trả lời thao tác: lọc, mở, đổi giao diện | Chuyển động không do người đọc gây ra thì nên hiếm và có lý do. |
| 13 | LOW | Giao diện | R12 | Ấn phẩm luôn mở ở bản sáng, bỏ qua thiết lập hệ thống. Hai kho lưu theme riêng cho site và reader. | Mặc định theo hệ thống; lựa chọn thủ công được nhớ | Nguyên tắc Agency của HIG: người dùng đã chọn ở cấp hệ điều hành. |
| 14 | LOW | Bề mặt | r12 | Dải hoàng thổ toàn chiều ngang, rồi khối chàm sâu, rồi footer chàm: các bề mặt đổi màu mà không có lý do | Nền giấy một màu. Màu chỉ xuất hiện nơi có nghĩa. Footer là điểm kết. | "Theme lock": đổi bề mặt giữa trang đọc như lỗi dán nhầm. |

## Những gì nên giữ

1. **Tranh khắc theo từng bài.** Đây là tài sản thị giác có bản sắc nhất, và là thứ trang live làm đúng hơn r12.
2. **Mô hình nội dung.** Chủ đề (6), chuyên đề có thứ tự, sách gắn với bài điểm sách, hình thức `essay` / `pensee`, trích dẫn. Dữ liệu đủ giàu để thiết kế dựa vào nó thay vì trang trí.
3. **Kỷ luật kỹ thuật.** Đo tương phản trên hex thật, reduced motion, `aria-pressed`, `aria-live`, tìm kiếm Pagefind xếp hạng tiếng Việt, chuẩn hóa NFC, 71 test.
4. **Trải nghiệm đọc bài** (chú thích bên lề, mục lục theo heading thật, nhớ vị trí). Chưa đánh giá sâu trong đợt này nhưng thiết kế hành vi ở `READING-PRINCIPLES.md` là nền tốt.

## Chẩn đoán nguyên nhân

1. **Không có ý tưởng chủ đạo nên mỗi vòng sửa thêm một lớp.** Brand book mô tả hiệu ứng (dither, halftone, pixel) kỹ hơn mô tả chức năng biên tập. Khi nhận diện được định nghĩa bằng hiệu ứng, mỗi hiệu ứng mới lại cần thêm token, thêm CSS, thêm pipeline.
2. **Kiểm chứng thuộc tính, không kiểm chứng ý đồ.** Các revision chứng minh tương phản đạt, không tràn ngang, test xanh. Không test nào hỏi: ảnh này có thuộc bài này không, màu này nghĩa là gì, người đọc nhìn vào đâu trước. "Đã kiểm tra" khác "đã đúng".
3. **CSS chỉ được viết thêm, không bao giờ được xóa.** Mỗi revision nối thêm quy tắc vào cuối file. Không có một nguồn token duy nhất: hex xuất hiện ở bốn nơi.
4. **Màu được coi là không khí, không phải thông tin.** Brand book viết "Không gán màu thành ý nghĩa". Với một tập san có sáu lĩnh vực rõ ràng, đó lại chính là cơ hội bị bỏ lỡ.

Đề xuất xử lý nằm ở [`02-de-xuat-he-thong-an-ban.md`](02-de-xuat-he-thong-an-ban.md).
