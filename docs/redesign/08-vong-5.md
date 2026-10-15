# 08 · Vòng 5: đèn đọc, kệ trượt, menu góc phải

> **Vòng 6 ([`09`](09-vong-6.md)) đã thay:** đèn đọc viết lại (hai lớp gradient 200% → lớp bóng đúng khổ ảnh + một vùng sáng mềm dời bằng transform); menu đóng không còn lóe; kiểu chữ đọc: Pliego, Garamond, Bricolage, Lexend.

Ngày 24.09.2026. Tài liệu này ghi các thay đổi sau phản hồi vòng 4. Những gì không nhắc lại ở đây vẫn giữ như [`07`](07-vong-4.md).

## Phản hồi và cách xử lý

| Phản hồi | Xử lý |
| --- | --- |
| Nút menu sang góc phải trên điện thoại; khi cuộn, tên tập san vẫn ở bên trái như desktop | Trên điện thoại, nút menu nằm ở góc phải hàng trên cùng của masthead, ngay trên tên tập san (tên vẫn to và căn giữa). Thanh nổi khi cuộn có tên tập san ở trái, nút menu ở góc phải, giống desktop. Trong menu, tên tập san ở trái, nút đóng ở đúng chỗ nút menu vừa đứng (cùng mép phải 365px ở màn 375px), nên ba vạch xoay thành dấu đóng ngay tại chỗ. |
| Glyph phong bì tối nghĩa (dễ hiểu là gửi thư cho tòa soạn); đặt nút "Nhận bài mới" vào menu, ở dưới cùng | Bỏ glyph phong bì khỏi masthead, thanh nổi và đầu menu. "Nhận bài mới" là một nút mực rộng hết khổ, **ghim ở chân menu**: luôn trong tầm tay dù danh sách dài, danh sách mờ dần phía trên nó thay vì bị một đường kẻ cắt. Glyph phong bì chỉ còn đứng cạnh "Thư tòa soạn", đúng nghĩa của nó. Desktop giữ nút "Nhận bài mới" trên masthead và thanh nổi. |
| Sáng / Tối / Tự động ở footer: "Tự động" xuống dòng, spacing kỳ quặc | Giao diện giờ là **ba dòng mục lục** như các cột bên cạnh: glyph của chế độ, tên, và dấu chọn ở dòng đang dùng. Thứ tự Sáng, Tối, Tự động. Không còn viên thuốc nhiều ô nên không còn gì để xuống dòng. Menu dùng cùng thành phần (`Appearance.astro`). |
| Thanh đọc desktop: tên bài và "Phần 2/7" nằm ở dòng trên, dòng dưới trống | **Nguyên nhân:** với bài không có mục lục, ngữ cảnh trên thanh là một đoạn văn flex căn theo baseline trong hộp cao 46px; flex căn baseline luôn đẩy dòng lên đầu hộp. Giờ là lưới một hàng: căn baseline giữa tên bài và phần, còn cả hàng đứng giữa thanh (lưới căn giữa được một hàng căn baseline, flex thì không). Đo lại: tâm tên bài 36px, tâm "Phần 2/7" 35px, tâm thanh 36px. |
| Điểm sách: ý tưởng tốt nhưng cồng kềnh; trang chủ không cuộn được; cuốn lớn để trống phía dưới, các cuốn khác díu nhau; đường kệ không tinh tế; mobile nên là carousel | **Kệ trượt** và **kệ vẽ bằng bóng** (xem mục Kệ sách). |
| Hover bản khắc giống glitch hơn là làm nổi nội dung | **Đèn đọc** (xem mục Đèn đọc). |

## Kệ sách

**Một kệ trượt.** Trang chủ giờ là một kệ duy nhất, trượt ngang, với mười bài điểm sách mới nhất (cả kệ ở `/books`). Tiêu đề module giữ trên lưới trang, còn kệ chạy tới mép màn hình và mờ dần khi đi qua lề, nên cuốn bị cắt ở mép phải cho biết kệ còn tiếp. Cuộn bằng tay, trackpad, bàn phím (tab qua tên bài), hoặc hai nút ‹ › cạnh "Tất cả điểm sách". Mỗi lần bấm, cuốn đầu tiên chưa hiện trọn được đưa về đầu kệ; hai nút mờ đi ở hai đầu và chỉ hiện khi kệ dài hơn trang và có chuột. Kệ là scroller gốc của trình duyệt có điểm dừng (scroll-snap), không phải carousel JavaScript.

**Cuốn mới nhất là một ấn bản khổ lớn**, cao hơn các cuốn khác 28% nhưng đứng **trên cùng một kệ**. Kệ cao bằng cuốn lớn nhất; chữ của mọi cuốn treo từ cùng một đường ngay dưới kệ. Nhờ vậy không còn khoảng trống dưới cuốn lớn, như ở vòng 4.

**Nhịp đều.** Mỗi cuốn có một cột rộng cố định (0,86 lần chiều cao sách), các cột cách nhau một khoảng đều. Bìa đứng sát mép trái cột, nên mép bìa và mép chữ thẳng hàng. Ở `/books`, các cuốn giãn ra lấp đầy chiều ngang khi còn chỗ.

**Kệ vẽ bằng bóng, không bằng đường kẻ** (theo skill `better-ui/surfaces`: *shadows instead of borders*, bóng nhiều lớp trong suốt). Mặt kệ tối dần về phía chân sách, chỗ ít ánh sáng lọt tới. Ngay chân sách có một nếp gấp mờ, rồi bóng loang xuống dưới và tan. Mỗi cuốn có bốn lớp bóng thay cho một bóng đậm: viền bìa 1px, bóng chân chạm kệ, bóng thân sát kệ, và bóng đổ lên mặt kệ. Bóng chân ở lại trên kệ khi sách được rút lên. Chế độ tối: viền bìa chuyển thành vòng sáng 1px (đúng như skill chỉ định), bóng sâu hơn.

**Điện thoại: carousel, không lưới.** Mỗi cột rộng 42% màn hình, cuốn đầu 50%. Màn đầu tiên cho thấy cuốn lớn và cuốn thứ hai, chữ của cuốn thứ hai bị cắt ở mép đang mờ, mời ngón tay trượt tiếp. Điểm dừng bắt buộc (mandatory) trên màn cảm ứng, gần đúng (proximity) với chuột.

**`/books`: một tủ sách.** Các cuốn được chia đều lên những kệ tối đa năm cuốn (12 cuốn → ba kệ bốn cuốn), mới nhất trước, cuốn mới nhất là ấn bản khổ lớn ở đầu kệ thứ nhất. Trên desktop mỗi kệ trải hết bề ngang. Trên điện thoại, mỗi kệ trượt riêng.

**Nhẹ hơn.** Bìa sách chỉ còn các cỡ 320 và 480 (sách không bao giờ rộng quá 230px), nên mười cuốn trên trang chủ vẫn nằm trong ngân sách HTML.

## Đèn đọc

Rê chuột vào một bài thì **một ngọn đèn đọc chiếu lên bản khắc**. Chỗ con trỏ đứng là một vũng sáng ấm; phần còn lại của tờ giấy tối đi một chút; nét mực vẫn đậm như cũ. Đó là cách một bản in trông dưới ngọn đèn bàn trong phòng đọc. Đèn đi theo tay với chút quán tính, như kéo một ngọn đèn cần: mỗi khung hình đi 16% quãng còn lại, tính theo thời gian thực nên màn 60Hz hay 120Hz đều như nhau. Rời bài thì đèn tắt dần trong 760ms, ngay tại chỗ nó đứng.

Vì sao hợp với tập san:
- **Cổ điển:** đèn phòng đọc, bản khắc trên giấy. Đèn chiếu sáng nội dung thật sự; nó không biến dạng, không lệch, không phóng to.
- **Kỹ thuật phục vụ người đọc:** đèn đánh dấu đúng bài bạn sắp mở, ở đúng chỗ bạn đang nhìn, và không xê dịch bố cục một pixel nào.
- **Cách làm:** hai lớp gradient phủ lên bản in, trộn bởi compositor (GPU). Lớp bóng dùng `multiply`: trắng ở vũng sáng, xám nhạt dần ra ngoài. Lớp sáng dùng `color-dodge`: làm sáng giấy và nét mảnh, giữ nguyên màu đen. Mỗi lớp rộng gấp đôi bản khắc và chỉ được dời bằng `translate`, nên đèn di chuyển mà không phải vẽ lại gì, không chép ảnh, không tải thêm file. Bán kính vũng sáng theo cỡ bản khắc (0,75 lần cạnh ngắn, trong khoảng 150–340px): trên bìa lớn đèn vẫn là một vũng sáng, trên ảnh nhỏ đèn phủ gần hết.
- **Mọi cách tương tác:** bàn phím (focus): đèn đứng ở giữa phía trên bản khắc. Chạm: đèn bật ngay dưới ngón tay trong khoảnh khắc trước khi chuyển trang. Cuộn trang khi tay đứng yên: đèn chuyển sang bài đang nằm dưới con trỏ. Giảm chuyển động: đèn chỉ sáng lên, không đi theo. Chế độ tương phản cao / forced colors: không có đèn.

"Ấn lại" (lượt in lệch khuôn) và việc đổi giấy khi hover đã bỏ hẳn. Tên bài vẫn gạch chân khi rê chuột.

Chuyện chuyển động của [`07`](07-vong-4.md) giữ nguyên chín hồi; hồi 2 · **Lướt** giờ là **đèn đọc** (bật 420ms, tắt 760ms, đi theo tay với quán tính).

## Sửa thêm trong lúc kiểm tra

- **Bài đầu của "Bài mới" mất ảnh trên điện thoại.** Mọi bài khác trên điện thoại là một hàng (ảnh vuông bên trái, chữ bên phải) căn về đầu (`align-items: start`). Bài đầu được chuyển lại thành cột, nhưng vẫn mang theo cách căn đó, nên hộp ảnh (không có bề rộng tự thân) co về 0. Giờ bài đầu giãn hết cột: 334 × 222px ở màn 375px.
- **Glyph gọn hơn 120 byte mỗi cái.** Nét vẽ của glyph (không tô, nét 1,6 màu chữ) được khai báo một lần trong CSS thay vì lặp trên từng glyph (57 glyph trên trang chủ). Đầu nét vuông và góc nhọn là mặc định của SVG nên không cần khai báo.

## Hiệu năng

| Trang chủ, điện thoại | Vòng 4 | Vòng 5 |
| --- | --- | --- |
| HTML | 194,7 KB | 195,6 KB (ngân sách 200 KB) |
| Tổng tải | 677 KB, 20 yêu cầu | 667 KB, 19 yêu cầu |
| JavaScript | 6,7 KB | 8,5 KB (đèn đọc + nút kệ) |
| Ảnh | 291 KB | 279 KB |
| Font | 378 KB | 378 KB |
| FCP / LCP (trung vị 5 lần) | 668–916 / 944–1148 ms | 716 / 1028 ms |
| CLS | 0 | 0 |

Trang chủ có mười cuốn sách thay vì năm mà HTML chỉ tăng 0,9 KB: bìa bớt một cỡ ảnh, và phần glyph gọn lại. Ảnh bìa ngoài màn hình tải lười (lazy) khi kệ trượt tới.

## Kiểm chứng

- `astro check`: 0 lỗi, 0 cảnh báo. `npm test`: 85/85 (thêm 4 test: menu góc phải và nút ở chân menu, không còn glyph phong bì; giao diện ba dòng ở footer và menu; kệ trang chủ mười cuốn mới nhất, tủ sách chia đều, kệ không dùng đường kẻ; đèn đọc là hai gradient trộn bởi compositor, "ấn lại" đã bỏ).
- Build 85 trang, 58 PDF.
- Trình duyệt (giả lập 375px và 900–1440px):
  - thanh nổi điện thoại: tên trái, menu phải;
  - menu: tên trái, nút đóng ở đúng chỗ nút menu; nút "Nhận bài mới" ghim ở chân, giao diện ba dòng;
  - footer: bốn cột, giao diện ba dòng;
  - kệ: mọi cuốn chung một chân; bấm › đưa cuốn thứ sáu về đúng mép lề; nút ‹ sáng lên;
  - `/books`: ba kệ bốn cuốn; mỗi kệ trượt riêng trên điện thoại;
  - đèn đọc: sáng và theo tay trên bản khắc;
  - thanh đọc: căn giữa.

## Giới hạn

- Chưa thử trên máy thật. Cần xem đèn đọc (blend `color-dodge`) và kệ trượt trên Safari iOS.
- Số đo thời gian chạy trong lúc máy còn bận vì tiến trình ngoài dự án (load average ~7,6; lần đo đầu ở ~13 bị loại vì các lần lệch nhau tới 3 lần). Vì vậy chỉ nên đọc FCP/LCP là "ngang vòng 4", không phải nhanh hơn hay chậm hơn. Số byte không phụ thuộc tải máy.
- Ngân sách HTML trang chủ còn khoảng 4,4 KB. Nếu tăng số bài hay số sách trên trang chủ, cần xem lại cách tải thanh tìm kiếm/CSS nội tuyến trước.
