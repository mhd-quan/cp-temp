# 02 · Đề xuất: hệ thống Ấn bản

> Vòng 2 (xem [`05-vong-2.md`](05-vong-2.md)) thay mục 3 (typography), 6 (bố cục), 7 (thành phần), 10 (lời) và bỏ dòng chú thích cặp mực ở mục 5. Sáu mực, quy tắc va chạm và bản in vẫn giữ nguyên.

Một hệ thiết kế thay cho "Chàm & khoáng". Tên gọi: **Ấn bản**, tức một tập san in, được đọc trên màn hình. Toàn bộ hệ đã hiện thực ở trang chủ MVP (xem [`04-mvp-trang-chu.md`](04-mvp-trang-chu.md)).

## 1. Đọc brief

> Tạp chí tiểu luận tiếng Việt về chính trị, lịch sử, văn hóa, xã hội, dành cho người đọc nghiêm túc trên máy tính và điện thoại. Ngôn ngữ in ấn tân cổ điển, hành vi của một ứng dụng hiện đại. Màu sắc thông minh, chọn lọc, dám va chạm.

Ba "núm" của `design-taste-frontend`: **Variance 5 · Motion 3 · Density 4**. Biên độ bố cục vừa phải vì đây là ấn phẩm cần uy tín. Chuyển động thấp, chỉ trả lời thao tác. Mật độ trung bình vì trang chủ là mục lục, không phải poster.

## 2. Năm nguyên tắc

1. **Chữ trước, công cụ sau.** Mỗi màn hình đầu tiên phải có thứ để đọc: tiêu đề, đề từ, câu mở bài. Công cụ (lọc, tìm, giao diện) xuất hiện khi được gọi.
2. **Màu có nghĩa.** Màu chỉ gọi tên một lĩnh vực. Mọi thứ khác dùng mực và giấy. Không có "màu thương hiệu" thứ hai để trang trí nút.
3. **Bản in, không hiệu ứng.** Tranh khắc gốc giữ nguyên nét, chỉ được in lại bằng hai mực. Không dither, không canvas, không poster dựng sẵn.
4. **Chuyển động trả lời người đọc.** Chỉ có chuyển động khi người đọc làm gì đó. Mọi chuyển động có phương án reduced motion.
5. **Một nguồn sự thật.** Màu sinh từ một script, CSS mới không ghi đè CSS cũ, không `!important` trong hệ mới.

## 3. Typography: ba giọng, một dòng dõi

| Vai trò | Họ chữ | Vì sao |
| --- | --- | --- |
| Hiển thị: tên ấn phẩm, tiêu đề | **Libre Bodoni** (variable 400–700, có nghiêng) | Didone là typography của thời Tân cổ điển (Bodoni, Didot, cuối thế kỷ XVIII) và là mặt chữ chuẩn của ngành in Pháp thế kỷ XIX. Giả thuyết cần đối chiếu với bản in gốc: báo chí quốc ngữ đầu thế kỷ XX (các tập san như *Nam Phong*, *Đông Dương tạp chí*) thừa hưởng kỹ thuật in đó. Nếu đúng, lựa chọn này nối ấn phẩm với tiền thân của chính thể loại. Dấu thanh gọn, móc ơ/ư gắn chắc ở cỡ lớn (đã thử trực tiếp ở 64 và 120px). |
| Đọc: đề từ, mở bài, trích đoạn, bài viết | **Source Serif 4** (giữ nguyên) | Thuộc dòng Fournier, tiền thân trực tiếp của Didone. Hai mặt chữ có chung một dòng dõi nên không va nhau. Giữ nguyên cũng giúp reader không phải đổi. |
| Giao diện: điều hướng, ngày, nút, bộ lọc | **Be Vietnam Pro** (400/500/600) | Do người Việt thiết kế cho tiếng Việt. Trung tính, đọc tốt ở 13–15px. |

Bỏ **Fraunces** (serif mà các skill liệt vào danh sách "mặc định của AI") và **Bricolage Grotesque** (quá cá tính cho nhãn, khiến mọi nhãn phải viết hoa để trông "có thiết kế").

**Thang chữ** (nhịp major third quanh 18px; tên theo vai trò):

| Token | Cỡ | Dùng cho | Line-height |
| --- | --- | --- | --- |
| `--t-caption` | 13px | ngày, tác giả, số phút, nhãn chủ đề | 1.4–1.45 |
| `--t-ui` | 15px | điều hướng, nút | 1 |
| `--t-body` | 18px | câu mở bài, đoạn đọc | 1.62–1.65 |
| `--t-dek` | 21px nghiêng | phụ đề bài mở đầu | 1.4 |
| `--t-title-s` | 28px (22px mobile) | tiêu đề trong mục lục | 1.16 |
| `--t-title-m` | 30→44px | tiêu đề mục | 1.1 |
| `--t-title-l` | 40→72px | tiêu đề bài mở đầu | 1.05 |
| wordmark | `min(116px, 8.6cqi)` | tên ấn phẩm, luôn một dòng | 1 |

Quy tắc:

- Không nhãn nào viết hoa toàn bộ. Nhãn viết thường theo câu, phân cấp bằng cỡ, độ đậm và màu.
- Nghiêng chỉ dùng cho phụ đề và đề từ, không để nhấn một chữ trong tiêu đề.
- Ngày và số phút dùng `tabular-nums`. Tiêu đề `text-wrap: balance`, đoạn văn `pretty`.
- Chữ tiếng Việt cần khoảng thở cho dấu: thân văn tối thiểu 1.6, tiêu đề lớn không dưới 1.05, tracking âm nhẹ (-0.018em) chỉ ở cỡ từ 40px trở lên.
- Mọi chuỗi hiển thị được chuẩn hóa NFC.

## 4. Màu: Sáu mực

Sáu lĩnh vực của tập san, sáu mực in. Tên màu là tên chất màu Việt; nghĩa là nghĩa biên tập.

| Mực | Lĩnh vực | H | Chữ (sáng) | Pigment | Mực in | Giấy in | Chữ (tối) | Chữ / giấy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Son | Chính trị | 31° | `#9a2b1b` | `#d24f3b` | `#651005` | `#fcd8d1` | `#f7a696` | 7,29:1 |
| Nghệ | Kinh tế | 78° | `#755000` | `#a97500` | `#493000` | `#f1dfc3` | `#e1b671` | 6,87:1 |
| Lục | Xã hội | 152° | `#006a34` | `#009a4e` | `#00411d` | `#ceead4` | `#8cd19e` | 6,41:1 |
| Lam | Hiện đại | 228° | `#00617f` | `#008db7` | `#003b4f` | `#c5e8f8` | `#73cbf0` | 6,61:1 |
| Chàm | Tư tưởng | 281° | `#4d48a8` | `#716fe2` | `#2e2870` | `#dcdffd` | `#b2b6fd` | 7,10:1 |
| Tía | Căn tính | 348° | `#902a66` | `#c54d92` | `#5e1040` | `#f8d7e6` | `#eea3c9` | 7,36:1 |

Vì sao chọn các mực này: *son* là mực của châu phê, lời phán quyết của quyền lực. *Nghệ* là vàng đồng thau, màu của trao đổi. *Lục* là xanh đồng của đời sống chung. *Lam* cobalt là màu tổng hợp của kỹ nghệ. *Chàm* là suy tưởng và cũng là gốc nhận diện cũ. *Tía* là màu dòng tộc, ký ức. Sáu góc màu cách nhau 43–76° trên vòng OKLCH, nên hai mực bất kỳ gặp nhau vẫn phân biệt được.

**Trung tính.** Giấy `#faf9f6` là giấy trắng không tráng phủ, cố ý không dùng màu kem. Mực chữ là đen ngả chàm `#161828`: màu chàm của nhận diện nằm ngay trong màu chữ. Tối: giấy `#11131b`, mực `#ebeae2`. Mọi cặp chữ/nền đều từ 6,1:1 đến 16,7:1.

**Quy tắc va chạm.** Một bài có hai chủ đề thì bản in dùng **mực của chủ đề thứ nhất trên giấy của chủ đề thứ hai**. Chẳng hạn *Lời hứa Ngày Độc lập* (Chính trị × Tư tưởng) là mực son trên giấy chàm; *Đám đông Trần trụi* (Xã hội × Chính trị) là mực lục trên giấy son. Màu chỉ va chạm ở nơi ý tưởng giao nhau. Bài một chủ đề in trên giấy cùng màu. Cả 36 cặp mực/giấy có tương phản nét 8,9:1 đến 10,1:1, nên nét khắc luôn rõ, kể cả với người mù màu đỏ–lục (độ sáng của mực và giấy chênh 0,58 L).

**Màu được phép xuất hiện ở:** bản in; nhãn chủ đề (luôn kèm tên); chip lọc; dải gáy của chuyên đề; đường kẻ đề từ; bảng chú giải "Sáu mực" ở footer.
**Màu không bao giờ dùng cho:** nút, liên kết, focus, nền của cả một mục. Hành động dùng mực chữ (nút đặc màu mực). Nhờ vậy màu không bao giờ phải mang hai nghĩa.

Nguồn: `scripts/edition-palette.mjs` định nghĩa màu bằng OKLCH, ánh xạ vào gamut sRGB bằng cách chỉ giảm chroma (giữ L và H), tự đẩy L cho tới khi chữ đạt 4,6:1 trên cả ba bề mặt, rồi xuất `src/styles/edition/palette.css` và `public/brand/edition/palette.json` (có bảng đo). Không sửa tay hai file đầu ra.

## 5. Hình ảnh: bản in

- Nguồn là ảnh khắc gốc của bài, qua pipeline responsive sẵn có (AVIF/WebP 160–1600px).
- Khi hiển thị, `feColorMatrix` đưa ảnh về độ sáng, rồi `feComponentTransfer` ánh xạ tuyến tính từ đen sang mực và từ trắng sang giấy. Mỗi trang chỉ sinh filter cho những cặp nó dùng (`PlateFilters.astro`).
- Giấy được lót trước khi ảnh tải, nên ảnh đang tải trông như tờ giấy chưa in, không phải ô trống.
- Theme tối: bản in không đổi màu (nó là một vật thể), chỉ giảm sáng còn 86%.
- `prefers-contrast: more` cho bản in đen trắng tương phản cao. Chế độ màu cưỡng bức giữ swatch có viền.
- Không dùng xử lý này cho bìa sách, sơ đồ hay ảnh cần đọc chi tiết. Bìa sách giữ màu xuất bản gốc.
- Ảnh mở đầu có chú thích giải thích cặp mực, chẳng hạn "Bản in: mực **Son** của Chính trị trên giấy **Chàm** của Tư tưởng." Chú giải đặt đúng chỗ người đọc cần.

## 6. Bố cục

- Khung tối đa 1320px; lề `clamp(20px → 64px)`; rãnh `clamp(16px → 32px)`; lưới 12 cột.
- Nhịp mục `clamp(64px → 128px)`. Mỗi mục mở bằng một đường kẻ mực 1px, tiêu đề bên trái, liên kết "xem tất cả" bên phải.
- Masthead: tên ấn phẩm căn giữa, dòng mô tả nghiêng, rồi **đường kẻ dày–mảnh** (2px + 1px), dấu phân cách lâu đời nhất của typography tạp chí, ngăn nhận diện với điều hướng.
- Trang chủ dùng bốn họ bố cục, không họ nào lặp lại:

```
┌ lead: chữ 5 cột │ bản in 7 cột ─────────────────────────┐
├ mục lục 8 cột (lọc theo lĩnh vực) │ lề 3 cột: Pensées  │
├ chuyên đề: 4 "tập sách" có gáy màu                    │
├ kệ sách: cuộn ngang, bìa đứng trên một đường kệ       │
└ colophon: nhận bài · điều hướng · Sáu mực · giao diện ┘
```

- Mobile: một cột. Bản in bài mở đầu lên trước tiêu đề (chỉ đổi thứ tự hình ảnh, thứ tự đọc trong DOM vẫn là chữ trước). Các chuyên mục **không giấu sau menu** mà cuộn ngang, tràn ra mép màn hình, trong khi đường kẻ vẫn giữ lề. Wordmark co theo container nên luôn một dòng từ 320px.

## 7. Thành phần và trạng thái

| Thành phần | Trạng thái |
| --- | --- |
| Nút mực `button--ink` | nghỉ, hover (mực nhạt 16%), nhấn `scale(.97)` 100ms, focus 2px |
| Nút biểu tượng 44×44 | hover nền 9% currentColor, nhấn `scale(.94)`, disabled 30% và không bấm được |
| Liên kết đứng riêng `text-link` | gạch chân 35% → 100% khi hover, 160ms |
| Liên kết tiêu đề `title-link` | không gạch chân lúc nghỉ; đường chỉ 1px tự "viết" trái sang phải, từng dòng, 320ms; cả ảnh và chữ của một bài cùng đánh thức nó |
| Chip lọc | hover nền wash của lĩnh vực; đang chọn: nền wash, chữ màu lĩnh vực, vạch 2px, đậm 600, `aria-pressed` |
| Nhãn chủ đề | ô màu vuông 10px (thước màu của nhà in) + tên; không bao giờ màu đứng một mình |
| Bản in | giấy lót trước; viền trong 1px 7%; tối: sáng 86% |
| Thanh gọn | xuất hiện khi masthead rời màn hình; vật liệu mờ `blur(14px)`; `inert` khi ẩn; nền đặc nếu `prefers-reduced-transparency` |
| Hộp tìm kiếm | `<dialog>` gốc; ⌘K/Ctrl K và `/` để mở; Escape đóng ngay; trả focus về nơi mở |
| Giao diện | nhóm radio gốc vẽ thành segmented control: Tự động · Sáng · Tối |

## 8. Tương tác và chuyển động

| Thao tác | Phản hồi | Thời lượng, easing | Reduced motion |
| --- | --- | --- | --- |
| Hover tiêu đề hoặc ảnh của bài | đường chỉ tự viết | 320ms, `cubic-bezier(.2,.8,.2,1)` | hiện ngay |
| Nhấn nút | co 3% | 100ms | giữ đổi màu |
| Chọn lĩnh vực | View Transition: bài ở lại trượt tới vị trí mới, bài đi/đến mờ dần; số bài đọc qua `role=status`; URL `?chu-de=` | 240ms | đổi tức thì |
| Cuộn qua masthead | thanh gọn trượt xuống | vào 320ms ease-out, ra 240ms ease-in | tức thì |
| Mở tìm kiếm | hộp nổi lên 8px, nền mờ dần (`@starting-style`) | vào 240ms, ra 160ms | chỉ còn hiện/ẩn |
| Đổi giao diện | cả trang hòa sắc bằng View Transition, thay vì chớp | 240ms | tức thì |
| Hover sách | bìa nhấc 4px khỏi đường kệ, bóng sâu hơn | 240ms | không nhấc |
| Nút kệ sách | cuộn 80% khung; vệt mờ ở mép chỉ hiện khi còn sách phía sau | cuộn mượt | cuộn tức thì |

Không có animation khi tải trang, không cuộn thị sai, không hiện dần khi cuộn. Theo `frontend-design`, giao diện chỉ nên có một khoảnh khắc đáng nhớ, và ở đây đó là bản in, không phải chuyển động.

## 9. Khả năng tiếp cận

- Một `h1` (tên ấn phẩm), `h2` cho từng mục, `h3` cho từng bài. Landmark: header, 2 nav, main, aside (Pensées), footer.
- Không có JavaScript: 8 bài hiện, bộ lọc và nút kệ sách ẩn (không có nút chết), thanh gọn `inert`, liên kết tìm kiếm dẫn tới `/search`.
- Vùng chạm từ 44px ở mobile. Focus 2px có offset trên mọi nền; footer dùng màu focus sáng.
- Màu luôn đi kèm chữ. Trạng thái chọn có ba tín hiệu: màu, độ đậm, vạch.

## 10. Lời trong giao diện

- Chỉ tiếng Việt. Một nhãn cho một ý định: "Nhận bài mới" ở header, thanh gọn và footer.
- Tiêu đề mục phẳng và có chức năng: *Bài mới, Pensées, Chuyên đề, Điểm sách*.
- Mô tả lấy từ copy sẵn có của ấn phẩm: "Tập san tiếng Việt dành cho tiểu luận, pensées và điểm sách" (trang Về tập san), "Đọc miễn phí. Rời đi bất cứ lúc nào." (r12). Hai câu mới cần bạn duyệt: "Những bài viết ngắn hơn tiểu luận." và "Những loạt bài nên đọc theo thứ tự."

## 11. Những gì đã cân nhắc và loại bỏ

| Gợi ý từ skill | Quyết định |
| --- | --- |
| `high-end-visual-design`: nút pill, "double-bezel", nav kính nổi, hiện dần mọi phần tử khi cuộn | Loại. Đó là ngôn ngữ của landing page cao cấp; với tập san nó làm chậm việc đọc và làm yếu uy tín. |
| `gpt-taste`: GSAP pin/scrub, cấu trúc AIDA | Loại. Đây không phải trang bán hàng. |
| `industrial-brutalist-ui` | Loại. Sai giọng. |
| `design-taste-frontend`: cấm hoàn toàn gạch ngang dài | Chỉ áp dụng cho nhãn giao diện. Văn xuôi tiếng Việt của tác giả giữ nguyên dấu câu. |
| `uncodixfy`: "không phối serif với sans" | Không theo. Tạp chí là trường hợp chính đáng; ba mặt chữ có vai trò tách bạch và có dòng dõi rõ. |
| `redesign-existing-projects`: thêm noise, grain | Loại. Kết cấu đã nằm sẵn trong nét khắc thật. |
| `better-ui`: viền ảnh 1px đen 10% | Áp dụng ở mức 7% cho bản in; bìa sách 10%. |
| `apple-design`: vật liệu mờ cho thanh nổi; theme theo hệ thống; chuyển động nhường reduced motion | Áp dụng. |

## 12. Ánh xạ token cũ → mới

| Cũ (r12) | Mới (Ấn bản) |
| --- | --- |
| `--paper #f3f2ed`, `--ink #23243e` | `--paper #faf9f6`, `--ink #161828` |
| `--accent` son `#a73b27` (link, hành động) | không còn; hành động dùng `--ink` |
| `--lilac / --chalk / --clay` (alias nói dối) | bỏ; màu theo lĩnh vực `--{mực}-text / -pigment / -wash / -print-ink / -print-paper` |
| `print-tone-0..3` theo hàm băm | `data-ink` + `data-paper` theo chủ đề |
| `--display: Fraunces`, `--sans: Bricolage` | `--font-display: Libre Bodoni`, `--font-ui: Be Vietnam Pro` |
| 46 giá trị font-size | 8 token vai trò |
