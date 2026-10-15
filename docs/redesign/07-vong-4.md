# 07 · Vòng 4: kệ sách, tờ trích, menu, chuyển động, hiệu năng

> **Vòng 5 ([`08`](08-vong-5.md)) đã thay:** hover "ấn lại" → đèn đọc; kệ lưới → kệ trượt vẽ bằng bóng; glyph phong bì → nút "Nhận bài mới" ở chân menu; menu sang góc phải.

Ngày 24.09.2026. Tài liệu này ghi các thay đổi sau phản hồi vòng 3. Những gì không nhắc lại ở đây vẫn giữ như [`06`](06-vong-3.md). Mona Sans giữ bản rộng theo quyết định của bạn.

## Phản hồi và cách xử lý

| Phản hồi | Xử lý |
| --- | --- |
| Điểm sách: bìa méo, lưới không tinh tế | **Nguyên nhân méo:** khung chứa bìa được đặt tuyệt đối từ giữa ô nên chỉ rộng tối đa nửa ô, và quy tắc chung `img { max-width: 100% }` ép ảnh hẹp lại trong khi chiều cao giữ nguyên. **Làm lại thành kệ sách** (xem mục Kệ sách). |
| Trích đoạn: câu trích cắt đôi tên bài và ảnh | **Tờ trích** (xem mục Tờ trích). |
| Nút "Nhận bài mới" chiếm chỗ trên mobile; cần menu như bản live, có tìm kiếm | Trên điện thoại, masthead chỉ còn nút menu, tên tập san và glyph thư. Menu mở thành một tờ phủ màn hình: ô tìm kiếm ở trên cùng, rồi các nhóm Đọc, Tập san, Theo dõi, Giao diện. Ba vạch của nút menu xoay thành dấu đóng, các mục trồi lên lần lượt. Menu cũng có trên thanh nổi ở màn hình dưới 1120px và trên thanh đọc của điện thoại. Chạm vào ô tìm kiếm thì menu đóng và hộp tìm kiếm mở với con trỏ sẵn trong ô. |
| Footer phản ánh đúng menu; nút về đầu trang thường trực | Menu, footer và masthead dùng chung một bản đồ (`src/lib/editionNav.ts`), cùng nhóm, cùng thứ tự; test khóa điều này. Footer là bốn cột bằng nhau trên lưới 12 (Đọc · Tập san · Theo dõi · Giao diện). Mỗi mục là một dòng mục lục có đường kẻ, mũi tên trượt vào khi rê chuột. Có thêm ô tìm kiếm cạnh lời mời nhận bài. **Nút về đầu trang** giờ là nút tròn cố định ở góc dưới phải, hiện ra khi đã cuộn quá 1,2 màn hình, có ở mọi trang kể cả trang đọc. |
| Hover zoom-out kèm khung: không mới | **Ấn lại** (xem mục Chuyện chuyển động). |
| Chuyển động; tối ưu tốc độ và hiệu năng trước khi deploy | Xem hai mục cuối. |

## Kệ sách

- **Bìa đúng tỉ lệ thật.** Trên một kệ, mọi cuốn cao bằng nhau và giữ chiều rộng của riêng nó, nên tất cả chạm kệ trên cùng một đường. Chiều cao bị chặn bởi bề rộng cột (đơn vị container), không bao giờ bằng cách bóp chiều rộng: về mặt kỹ thuật, bìa không thể méo nữa. Test so từng cuốn với kích thước gốc của ảnh bìa.
- **Một đường kệ thẳng.** Các hàng dùng subgrid nên mọi ô trong hàng chung một chiều cao, đường kệ luôn thẳng dù cạnh cuốn đầu có chữ.
- **Cuốn mới nhất** đứng cao hơn, đầu kệ, và lời của nó đứng ngay trên kệ bên cạnh, như tấm thẻ giới thiệu hiệu sách dựng cạnh cuốn sách họ khuyên đọc. Các cuốn khác có chữ bên dưới kệ.
- **Cảm giác vật thể.** Bìa có nếp gáy mờ ở mép trái, bóng tiếp xúc trên mặt kệ, và một dải bóng dưới mép kệ.
- **Rê chuột hoặc focus:** cuốn sách được rút lên khỏi kệ 12px và nghiêng 1,5°, còn bóng tiếp xúc ở lại trên kệ và mờ đi.
- **Chữ:** rubric chủ đề, tên bài điểm sách, rồi trích dẫn sách (tên nghiêng; tác giả và năm bằng chữ hoa sans).

| | Desktop | 800–1100px | Điện thoại |
| --- | --- | --- | --- |
| Trang chủ | Một kệ: cuốn đầu (3/7 cột) + 4 cuốn | Cuốn đầu một kệ riêng, 4 cuốn kệ dưới | Như 800–1100px, 2 cuốn mỗi kệ |
| `/books` | 6 cuốn mỗi kệ, 2 kệ | 4 cuốn mỗi kệ | 2 cuốn mỗi kệ |

## Tờ trích

Câu trích, bản khắc và tên bài giờ nằm trên cùng một **tờ giấy mang màu giấy in của chính bài đó**. Bản khắc in thẳng lên tờ (không khung), nên nó thuộc về tờ giấy. Tên bài đứng ngay dưới ảnh như chú thích tranh, và cả khối ảnh cùng tên bài là một liên kết. Dấu ngoặc mở và rubric dùng mực in của bài. Trên desktop, câu trích chiếm 7 cột, nguồn chiếm 4 cột bên phải. Trên điện thoại, tờ trích tràn hết chiều ngang màn hình: câu trích, rồi ảnh, rồi tên bài. Tờ trích là một vật thể nên không đổi màu theo giao diện tối, chỉ dịu đi 10%. Khi sang ngày mới, cả tờ đổi mực và màu giấy theo bài mới.

## Chuyện chuyển động

Mọi chuyển động của tập san kể cùng một chuyện: **một xưởng in**. Mỗi chuyển động là một thao tác của thợ in, chỉ xảy ra khi người đọc làm gì đó, và chỉ dùng transform, opacity hoặc màu (thứ GPU tự lo được).

| Hồi | Thao tác của thợ in | Ở đâu | Thời lượng |
| --- | --- | --- | --- |
| 1 · Đến | **In lên giấy**: trước khi ảnh về, bản khắc là tờ giấy trắng; ảnh giải mã xong thì mực được đặt lên | Mọi bản khắc | 460ms |
| 2 · Lướt | **Ấn lại**: rê chuột (hoặc focus, hoặc chạm) vào một bài thì bản khắc được ấn thêm một lần bằng màu của lĩnh vực: lượt in thứ hai hơi lệch khuôn (1,4% × 1,9%) rồi trượt vào đúng chỗ và tan đi; trong lúc con trỏ còn ở đó, bản in chuyển sang giấy của chính lĩnh vực ấy. Đây là phiên bản thợ in của hiệu ứng "lệch kênh màu" trong bộ skill (`design-taste-frontend`), thay cho zoom mà skill coi là rập khuôn. Ảnh cho lượt ấn thứ hai lấy từ đúng file đang hiển thị, nên không tải thêm | Bài mới, danh mục, trích đoạn, bìa | 680ms (chạm: 380ms) |
| 3 · Chọn | **In lại cả số báo**: chọn một lĩnh vực thì mọi bản khắc đổi sang mực đó; bài cũ lùi 150ms, bài mới trồi lên lần lượt, cách nhau 45ms | Bộ lọc Bài mới | 150 + 520ms |
| 4 · Lật | **Xếp tờ**: rê chuột vào phần II thì tờ in II được nhấc lên đầu chồng, nhấc cao 3,5% rồi đặt xuống; đổi chuyên đề thì bộ tờ được chia lại từng tờ | Chuyên đề | 460–560ms |
| 5 · Rút | **Rút sách khỏi kệ** | Điểm sách | 460ms |
| 6 · Sang trang | **Lật trang**: trang cũ mờ đi, trang mới trồi lên 10px; bản khắc vừa bấm lớn dần thành ảnh bìa của bài | Mọi lần chuyển trang (Chrome, Safari 18.2+) | 160 + 360ms, bản khắc 520ms |
| 7 · Mở | **Mở tập**: menu phủ màn hình, ba vạch xoay thành dấu đóng, các mục trồi lên lần lượt | Menu | 280ms, cách nhau 28ms |
| 8 · Đọc | Vạch tiến độ bằng mực của bài, chú thích bên lề sáng lên khi trỏ vào số | Trang đọc | theo cuộn |
| 9 · Về | Nút về đầu trang hiện ra (mờ + phóng từ 0,8), cuộn mượt lên đầu | Mọi trang | 280ms |

**Easing:** vào là quint giảm tốc `cubic-bezier(0.22, 1, 0.36, 1)`, ra là gia tốc và ngắn hơn. Thời lượng theo bậc: 110 (nhấn), 180, 280, 460, 620, 700ms (đổi mực). Khi người dùng bật giảm chuyển động, mọi chuyển động tắt: ấn lại, chia tờ, chuyển trang và cuộn mượt đều không chạy, mọi thay đổi xảy ra tức thì.

## Hiệu năng

Đo bằng `scripts/performance-bench.mjs` trên bản build: CPU chậm 4 lần, mạng 1,1 MB/s, độ trễ 170ms, không cache, mỗi cấu hình chạy 3 lần, lấy trung vị.

| Trang chủ | Trước | Sau |
| --- | --- | --- |
| Điện thoại 390px: FCP / LCP | 784 / 1.080ms | **668 / 944ms** |
| Desktop 1440px: FCP / LCP | 1.012 / 1.832ms | **780 / 1.048ms** |
| CLS (điện thoại / desktop) | 0 / 0,013 | 0 / 0,013 |
| Tổng tải (điện thoại) | 764 KB | **677 KB** |
| Font | 494 KB | **378 KB** |
| Thời gian xử lý của trình duyệt | 1,28s | **1,05s** |

Trang đọc (điện thoại): LCP 1,5s, CLS 0. Trang `/books`: LCP khoảng 0,9s, CLS 0.

**Những gì đã làm:**

| Việc | Tác dụng |
| --- | --- |
| Bản khắc dùng AVIF (WebP làm dự phòng) | Nhẹ hơn khoảng 37% mỗi ảnh |
| Chỉ liệt kê những độ rộng ảnh một bản khắc có thể cần (không dưới 320px cho ảnh lớn, không quá gấp đôi kích thước dự phòng); `sizes` riêng cho từng vị trí trong lưới | HTML trang chủ từ 218 KB xuống 195 KB (dưới ngân sách 200 KB của dự án); 24,4 KB Brotli |
| Font chuyển vào `src/assets/fonts`, tên file gắn hash | Cache 1 năm (`immutable`), đổi font là đổi URL |
| Bỏ tệp Latin mở rộng của Mona Sans (vùng ký tự trùng tiếng Việt khiến nó bị tải thừa) | −33 KB |
| Số La Mã dùng Pliego nghiêng thường thay vì nghiêng Medium; chữ ẩn cho trình đọc màn hình dùng độ đậm đã tải | −83 KB |
| CSS của các trang danh mục chỉ nạp ở các trang đó | −12 KB HTML trang chủ |
| Bản khắc xếp lớp lại: ảnh xám, mực `screen`, giấy `multiply`, trên nền trắng | Ảnh chưa về thì là giấy, không bao giờ lóe khối màu mực |
| Xóa 12 tệp tạm của pipeline ảnh trong `public/` | Không còn rác trong bản deploy |

Pliego Regular (79 KB) vẫn được tải ở trang chủ, sau khi trang đã hiện (không chặn hiển thị), và dùng lại từ cache cho trang đọc.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run build` | 85 trang, 58 PDF |
| `astro check` | 0 lỗi, 0 cảnh báo |
| `npm test` | **81/81 đạt**. Test mới: bìa sách trên kệ đúng tỉ lệ ảnh gốc; menu, footer và masthead cùng một bản đồ; nút về đầu trang có trên trang. |
| Trình duyệt | Menu mở và đóng, tìm kiếm từ menu, kệ sách một đường thẳng ở 1440 và 800px, tờ trích ở 390px, lượt ấn lại (chụp giữa chừng), footer 4 cột, thanh đọc điện thoại có menu. |

## Giới hạn

- Chưa thử trên thiết bị thật. Riêng blend mode của bản khắc và chuyển trang cross-document cần xem trên Safari iOS.
- Công cụ chụp màn hình của trình duyệt tích hợp đôi khi trả về khung trống ở kích thước desktop giả lập, nên một số kiểm tra desktop được làm bằng đo DOM.
- `/identity` và `/r12` vẫn là giao diện cũ.
