# 09 · Vòng 6: menu đóng mượt, đèn đọc nhẹ, lật trang liền mạch, vật liệu chung

Ngày 24.09.2026. Tài liệu này ghi các thay đổi sau phản hồi vòng 5. Những gì không nhắc lại ở đây vẫn giữ như [`08`](08-vong-5.md).

## Phản hồi và cách xử lý

| Phản hồi | Nguyên nhân | Xử lý |
| --- | --- | --- |
| Đóng menu bị lóe một khung hình khác | Khi menu mờ dần để đóng, trình duyệt vẫn giữ `display: flex` cho đến hết hiệu ứng, nhưng `flex-direction: column` chỉ được khai báo cho trạng thái *đang mở*. Suốt 180ms đóng, tờ menu xếp lại thành **hàng ngang**: thân menu co thành cột 127px ở giữa, nút "Nhận bài mới" nhảy lên góc trên. Đo từng khung hình đã thấy rõ điều này. | Mọi thứ định hình menu (lưới 3 hàng: đầu, thân cuộn, chân) giờ khai báo trên `.menu`, trạng thái mở chỉ bật `display`. Có test chặn lỗi này tái diễn cho cả menu lẫn các sheet của trang đọc. **Đóng là mở chạy ngược:** dấu × gỡ lại thành ba vạch, các mục lún xuống 10px trong lúc tờ menu mờ đi. Nút "Nhận bài mới" giờ trồi lên cùng lúc với ô tìm kiếm (trước đây nó hiện cuối cùng, sau gần 1 giây). |
| Đèn đọc nặng máy, chưa nhạy, lớp phủ bị hở (bìa đầu trang, trích đoạn) | (1) **Hở:** mỗi lớp của đèn rộng gấp đôi bản khắc và đặt tâm ở con trỏ. Khi con trỏ xuống vùng tít phụ bên dưới ảnh, mép trên của lớp tụt vào trong ảnh, để lộ một dải không phủ (đúng như ảnh bạn gửi). (2) **Nặng:** hai lớp đó với bìa đầu trang ở màn hình retina là khoảng 5760×2448px mỗi lớp, tức hơn 100MB texture GPU, cộng thêm việc tính lại style của hai pseudo-element ở mỗi khung hình, và `elementFromPoint` ở mỗi khung hình khi cuộn. | Xem mục Đèn đọc. |
| Vũng sáng rộng hơn, bớt chói ở tâm, tinh tế hơn | | Xem mục Đèn đọc. |
| Mobile: không cần hover; chỉ cần hiệu ứng tương tự khi chạm ảnh để vào bài | | Hover chỉ bật với chuột thật (`hover: hover` và `pointer: fine`). Trên điện thoại, đèn bật dưới ngón tay khi chạm vào bài (sau 60ms, để một cú vuốt cuộn bị hủy trước khi đèn kịp sáng), rồi giữ trong lúc trang lật sang bài. |
| Ảnh zoom thành bìa bài: xuất sắc nhưng còn giật | Ba chỗ: (1) ảnh bìa lớn của bài chỉ bắt đầu tải sau cú bấm, và bản in giấu đi cho tới khi giải mã xong, nên ảnh thu nhỏ "bay" vào một tờ giấy trắng rồi ảnh mới hiện; (2) script của trang đọc chạy đúng lúc hiệu ứng đang diễn; (3) listener `pagereveal` nằm trong script cuối trang, có thể đăng ký sau khi sự kiện đã xảy ra. | Xem mục Lật trang. |
| Font trang đọc: chỉ Pliego, Garamond, Bricolage Grotesque và một font cho người khó đọc | | Xem mục Kiểu chữ. |
| Nền trong mờ theo màu nền (như thanh đọc) cho bảng Trang đọc và menu | | Xem mục Vật liệu. |

## Đèn đọc

Viết lại từ đầu, cùng ý tưởng (một ngọn đèn đọc trên bản khắc) nhưng nhẹ hơn và êm hơn:

- **Hai lớp.** Lớp bóng là một mảng màu phẳng **đúng bằng bản khắc** (`multiply`, tối đi 4,5%): không có mép nào để lộ, nên lỗi hở không thể xảy ra nữa. Lớp sáng là một gradient tròn mờ hẳn về 0 ở vành (`soft-light`), nên dù đứng đâu cũng không có cạnh.
- **Rộng và dịu.** Bán kính vũng sáng bằng 0,85 lần cạnh dài của bản khắc (từ 240 đến 480px), độ sáng ở tâm giảm, dải chuyển dài. Hiệu ứng giờ gần như chỉ là một chỗ giấy ấm hơn quanh con trỏ.
- **Giữ trong ảnh.** Tâm đèn bị giới hạn trong khung bản khắc. Con trỏ ở tít phụ bên dưới thì đèn soi chân bức in, không đi ra ngoài.
- **Nhẹ cho phần cứng.** Lớp sáng được vẽ một lần và chỉ được dời bằng `transform`. Nó trượt theo tay bằng một transition 150ms chạy trên luồng compositor, nên vẫn mượt khi trang đang bận. Mỗi lần đổi vị trí chỉ ghi một thuộc tính (gộp theo khung hình), và con trỏ chỉ được đọc khi đang ở trong một bài. Kích thước bản khắc đo một lần mỗi lần vào, và chỉ đo lại sau khi trang cuộn. Đã bỏ `elementFromPoint` khi cuộn. `will-change` chỉ bật trong lúc đèn sáng.
- **Nhạy hơn:** theo tay trong 150ms thay vì lò xo khoảng 300ms.

## Lật trang (ảnh thu nhỏ → bìa bài)

- **Prerender khi có ý định mở.** Speculation Rules (`/essays/*`, mức `moderate`): khi con trỏ dừng trên một liên kết tới bài (hoặc ngón tay nhấn xuống), Chrome dựng sẵn cả trang bài. Ảnh bìa đã giải mã, font đã tải, script đã chạy, nên khi bấm, trang lật chỉ còn việc chuyển động. Đã kiểm bằng Chrome DevTools Protocol: quy tắc hợp lệ và Chrome kích hoạt prerender khi rê chuột. Chrome không prerender khi có công cụ tự động gắn vào, nên không đo được trọn vẹn từ đây. Google Analytics chỉ ghi lượt xem khi bài thật sự được mở (`prerenderingchange`), không ghi các bài chỉ được dựng sẵn.
- **Không bao giờ bay vào giấy trắng.** Trang cũ trao cho trang bài địa chỉ của ảnh đang hiển thị. Nếu ảnh bìa lớn chưa về, ảnh đó đứng tạm vào chỗ bìa (lấy từ bộ nhớ đệm, giải mã đồng bộ) cho tới khi ảnh lớn tải xong. Nếu ảnh bìa đã có sẵn (prerender, cache), nó được giải mã ngay vào khung hình đầu. Cách này giúp cả Safari, trình duyệt không có prerender.
- **Nhường luồng chính.** Trang đọc chờ hiệu ứng lật xong mới khởi động (chú thích bên lề, mục lục, tiến độ).
- **Nghe sự kiện từ `<head>`.** Toàn bộ phần lật trang chuyển vào script đầu trang, nên luôn nghe được `pagereveal` trước khung hình đầu. Trang bài chặn khung hình đầu cho tới khi phần bìa đã được parse (`<link rel="expect" blocking="render">`).
- **Nhịp:** 560ms, đường cong giảm tốc đều `cubic-bezier(0.32, 0.72, 0, 1)` (không giật lúc đầu, không bò ở cuối).
- **Trang bị ẩn** (tab nền, trang đang prerender) giờ in bản khắc ngay khi ảnh về, vì `decode()` sẽ chờ tới khi trang hiện ra. Nếu không sửa, bìa prerender sẽ vẫn trắng lúc lật.

Kiểm trong Chromium headless (build thật): hiệu ứng lật chạy, và bìa đã in sẵn ở khung hình lật, cả khi có rê chuột lẫn khi bấm thẳng. Độ mượt khung hình không đo được ở đây vì Chromium headless vẽ bằng CPU trên một máy đang tải nặng.

## Kiểu chữ trang đọc

Bốn kiểu: **Pliego · Garamond · Bricolage Grotesque · Lexend**. Mona Sans rời trang đọc; ai đã chọn nó sẽ tự chuyển sang Bricolage.

- **Font cho người khó đọc: Lexend, không phải OpenDyslexic.** Cả hai tuyên bố hỗ trợ đủ 104 chữ cái tiếng Việt. Nhưng khi đặt thử một đoạn tiếng Việt, OpenDyslexic hỏng: "Người" thành "Nguòi", mất râu của ư và ơ, khoảng chữ rộng tới mức từ bị tách rời. Lexend (bạn cũng có sẵn trong Downloads) được vẽ dựa trên nghiên cứu về độ lưu loát khi đọc, đặt dấu tiếng Việt đúng, thoáng mà không rời rạc. Dưới hàng chọn có một dòng ghi chú để người cần biết: Lexend dành cho người mắc chứng khó đọc (dyslexia).
- **Bricolage Grotesque** dùng bản có trục optical size (chữ đọc tự lấy nét văn bản). Bản chỉ có trục weight nhẹ hơn nhưng bị khóa ở nét tiêu đề (opsz 96), không hợp để đọc dài.
- **Cân chiều cao chữ x** (đo trên nét vẽ của chữ x, vì số liệu trong file Pliego sai): Pliego 0,431; Garamond 0,405 (phóng 1,07); Bricolage 0,517 (thu 0,88); Lexend 0,525 (thu 0,87).
- Font chỉ tải khi được chọn, hoặc khi bảng Trang đọc mở ra (để vẽ mẫu "Aa").

## Vật liệu

Một hệ vật liệu cho mọi lớp nổi: giấy của trang trong mờ phủ lên bản làm nhòe của những gì bên dưới, nên mỗi lớp mang màu của trang nó che. Lớp càng lớn, vật liệu càng dày (theo skill `apple-design`):

| Lớp | Giấy | Làm nhòe |
| --- | --- | --- |
| Thanh trên (như cũ) | 90% | 14px |
| Bảng Trang đọc, Mục lục, Chú thích | 80% | 24px |
| Menu (phủ cả màn hình) | 76% | 34px |

- Ở trang đọc, vật liệu lấy đúng màu giấy người đọc đã chọn (Giấy, Ngà, Sương, Rêu).
- **Các ô lựa chọn giữ nguyên:** khay đặc và ô đang chọn nổi lên với bóng, để giữ điểm nhấn.
- Đầu và chân của menu cũng như các bảng không còn là dải giấy đặc chồng lên nhau. Chỉ phần giữa cuộn, và nó mờ dần ở mép (scroll edge), nên cả tờ là một bề mặt.
- Trình duyệt không làm nhòe được, hoặc người dùng bật "giảm độ trong suốt", thì mọi lớp là giấy đặc.

## Nhẹ hơn

- **Trang chủ 193,4 KB** (vòng 5: 195,6 KB; ngân sách 200 KB) dù có thêm prerender, vật liệu và đèn mới.
- Khoảng 50 handler `onload` lặp lại trên từng bản khắc được thay bằng **một** listener trong script đầu trang (tiết kiệm 5,5 KB).
- Script đầu trang viết để đọc được (`src/lib/editionHead.js`, có chú thích) nhưng khi build được nén lại còn 2,3 KB.

| Trang chủ, điện thoại | Vòng 5 | Vòng 6 |
| --- | --- | --- |
| HTML | 195,6 KB | 193,4 KB |
| Tổng tải | 667 KB, 19 yêu cầu | 667 KB, 19 yêu cầu |
| CLS | 0 | 0 |

Số đo thời gian (FCP/LCP) lần này không dùng được: load average của máy lên tới 20 vì tiến trình ngoài dự án.

## Kiểm chứng

- `astro check`: 0 lỗi, 0 cảnh báo.
- `npm test`: 88/88. Có thêm 4 test:
  - đèn đọc: lớp bóng đúng bằng bản khắc, lớp sáng mờ về 0 ở vành và di chuyển bằng transform, tâm đèn bị giữ trong ảnh, hover chỉ với chuột;
  - menu và các bảng không đổi bố cục khi đóng, và dùng chung vật liệu;
  - bốn kiểu chữ, có font cho người khó đọc;
  - quy tắc prerender, Analytics chờ lượt xem thật, lật trang nghe từ `<head>`, không còn `onload`.
- Test cũ về kiểu chữ bị loại được sửa: Bricolage chỉ được phép là lựa chọn của trang đọc.
- Trình duyệt:
  - đóng menu: đo từng khung hình, bố cục không đổi trong suốt lúc mờ;
  - đèn: lớp bóng trùng khít bản khắc (1085×490); con trỏ ở tít phụ thì đèn soi chân ảnh, không hở;
  - bảng Trang đọc: trong mờ, bốn kiểu chữ vừa một hàng, Lexend đặt tiếng Việt đúng.

## Giới hạn

- Chưa đo được độ mượt thật của lật trang và đèn đọc: máy không có GPU khi chạy tự động, và Chrome tắt prerender khi có công cụ tự động gắn vào. Cần mở trên Chrome và Safari thật để cảm nhận.
- Safari chưa có prerender. Ở đó, ảnh đứng tạm và việc trang đọc chờ lật xong là hai thứ làm mượt.
- Bricolage và Lexend không có chữ nghiêng thật; chữ nghiêng trong bài là nghiêng giả lập.
