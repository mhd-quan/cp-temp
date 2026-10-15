# Chuyển động của Ấn bản

Từ v1.2.1, bổ sung ở v1.2.2 (nhấn, sheet, vết loang, khắc tên). Tài liệu này là chuẩn cho mọi animation, transition và vi chuyển động trên trang. Token nằm ở `src/styles/edition/foundation.css` (mục *Motion*); script dùng cùng giá trị (`src/lib/editionMotion.ts`, `editionDeck.ts`, `editionTurn.ts`).

Trước v1.2.1, chuyển động *nhanh* nhưng không *trôi*: mọi thứ bật tới gần hết quãng ngay khung hình đầu rồi bò nốt phần còn lại, và mọi thứ biến mất thì đứng yên gần hết thời gian rồi vụt tắt. Trôi là khi người đọc đoán trước được chuyển động sẽ đi đâu và dừng lúc nào, và điều đó cần một bộ đường cong và thời lượng dùng chung cho cả trang.

## Nguyên tắc

Dựa trên phần Motion của Apple Human Interface Guidelines, áp cho một tập san đọc chữ:

1. **Chuyển động trả lời người đọc.** Chỉ có chuyển động khi người đọc làm gì đó (giữ nguyên từ [đề xuất hệ thống](redesign/02-de-xuat-he-thong-an-ban.md)). Không animation khi tải trang, không hiện dần khi cuộn. Một ngoại lệ duy nhất, từ v1.2.2: tên tập san được khắc trên trang đầu tiên của một lượt đọc (xem *Khắc tên*).
2. **Thứ gì đến cũng có đường về.** Mở và đóng dùng cùng một bộ đường cong, cùng quãng đường (đóng thì chìm về một nửa quãng). Đường ra mất ba phần tư thời gian của đường vào: người đọc chờ một thứ mở ra, nhưng không chờ nó đóng lại.
3. **Đến là lắng.** Thứ đi vào hoặc đổi tại chỗ dừng lại như một lò xo tắt dần vừa đủ (critically damped, không nảy): trả lời ngay khung hình đầu nhưng không bật, rồi hạ cánh êm.
4. **Đi là trượt khỏi.** Thứ rời đi bắt đầu ngay, đi đều, và kết thúc mềm. Không đứng yên rồi vụt tắt.
5. **Đổi cả trang là lật.** Đổi giao diện thì giấy mới loang ra từ chỗ chạm; đổi giấy hay chữ thì trang cũ tan vào trang mới. Kính mờ giữ nguyên độ mờ suốt lượt lật.
6. **Chỉ transform, opacity và màu.** Ngoại lệ có ghi chú tại chỗ: `top` của dải tháng (phải dính dưới thanh), `block-size` của lịch sử xuất bản (mở tới `auto`), nét và mực của tên khi khắc (`stroke-dashoffset`, `fill-opacity`, trên một hình vẽ nhỏ).
7. **Ngắt được giữa chừng.** Trạng thái đi bằng CSS transition, nên đổi ý giữa chừng thì chuyển động quay đầu từ chỗ nó đang đứng. Keyframe chỉ dành cho chuyển động một lần (glyph xoay, hàng mục menu nổi lên, lượt lật trang).
8. **Giảm chuyển động (Reduce Motion)** thì mọi thứ đổi tức thì: toàn cục 0.01ms trong CSS; lượt lật trang và `animate()` tự kiểm tra `prefers-reduced-motion`.

## Ba đường cong

| Token | Giá trị | Tiến độ ở 10% · 25% · 50% · 90% thời gian | Dùng cho |
| --- | --- | --- | --- |
| `--ease-out` (lắng) | `cubic-bezier(0.32, 0.72, 0, 1)` | 27% · 78% · 95% · 100% | Mọi đường vào; mọi thay đổi tại chỗ (màu, chỉ báo trượt, co khi nhấn, nhấc khi hover); bản in lướt thành ảnh bìa |
| `--ease-leave` (rời) | `cubic-bezier(0.3, 0, 0.2, 1)` | 5% · 35% · 80% · 99% | Mọi đường ra: sheet, menu, tìm kiếm, thanh nổi, về đầu trang, `reveal()`, trang cũ khi chuyển trang |
| `--ease-turn` (lật) | `cubic-bezier(0.45, 0, 0.2, 1)` | 2% · 19% · 76% · 99% | Thay đổi cả trang: trang tan khi đổi giấy hoặc chữ; nét khắc tên |
| `--ease-spread` (loang) | `linear(…)`, bán kính = √smoothstep(t) | 17% · 40% · 71% · 99% | Bán kính của vết loang đổi giao diện |

Đường *lắng* là đường xấp xỉ cách iOS trình bày một sheet. Nó thay quint-out cũ (`0.22, 1, 0.36, 1`), vốn đi 40% quãng trong 10% đầu: đó là cảm giác "bật". Đường *rời* thay `0.55, 0, 1, 0.45` cũ, vốn mới đi 57% quãng khi đã hết 90% thời gian, rồi dồn 43% còn lại vào khung hình cuối: đó là cảm giác "giật" khi đóng.

Đường *loang* (v1.2.2) thay đường lật cho vết loang. Mắt đọc vết loang bằng lượng giấy mới đã phủ, tức là diện tích, mà diện tích tăng theo bình phương bán kính: với đường lật, vết loang phủ chưa tới 1% màn hình trong một phần năm thời gian đầu, rồi phủ gần nửa màn hình chỉ trong một phần năm thời gian ở giữa (từ 30% đến 50%), và đó là chỗ "giật". Đường loang cho *diện tích* đi theo smoothstep (vào êm, ra êm, đều ở giữa), nên bán kính là căn bậc hai của nó. Viết bằng `linear()` 11 điểm (sai lệch dưới 0,4% bán kính) vì không đường bezier nào vẽ được hình này.

Đèn đọc giữ đường riêng (`--ease-lamp`) vì nó bám theo bàn tay, là một việc khác.

Số liệu tiến độ đo bằng cách giải chính các đường bezier này, không phải ước lượng bằng mắt.

## Thang thời lượng

| Token | Trước | Nay | Dùng cho |
| --- | --- | --- | --- |
| `--d-press` | 110ms | **130ms** (+18%) | Co lại khi nhấn; nhả ra theo thời lượng của trạng thái thường |
| `--d-quick` | 180ms | **220ms** (+22%) | Đổi màu khi hover hoặc chọn; trang cũ mờ đi khi chuyển trang |
| `--d-close` | (không có) | **260ms** | Mọi đường ra của thứ mở bằng `base` hoặc `slow` |
| `--d-base` | 280ms | **340ms** (+21%) | Mở sheet, menu, tìm kiếm; chỉ báo trượt của các nhóm chọn; `reveal()`; trang tan khi đổi cài đặt; trang mới hiện khi chuyển trang |
| `--d-slow` | 460ms | **540ms** (+17%) | Quãng dài: thanh nổi trượt vào, hàng mục menu nổi lên, bản in nhấc khi hover, gạch chân dài |
| `--d-plate` | 620ms | 620ms | Bản in lướt thành ảnh bìa (560 → 620), bộ bài Chuyên đề (520/560 → 620) |
| `--d-spread` | 620ms | **720ms** (+16%, v1.2.2) | Vết loang đổi giao diện |
| `--d-trace` · `--d-letter` | (không có) | **600ms** · **20ms** (v1.2.2) | Khắc tên: nét vạch mỗi chữ; khoảng cách giữa hai chữ |
| `--d-ink` | 700ms | 700ms | Giấy của bản in đổi màu |
| `--d-lamp-*` | 360/640/150ms | giữ | Đèn đọc bật, tắt, bám tay |

Cảm giác nhanh chậm tính bằng lúc chuyển động đi được 90% quãng, vì mắt coi đó là lúc nó dừng. Với một sheet: trước là 104ms, nay 126ms (chậm hơn 21%), và bước nhảy ở khung hình đầu giảm từ 22% xuống 12% quãng. Với một lần đóng: trước chỉ thật sự chuyển động ở 20ms cuối của 180ms; nay đi đều trong 160ms đầu của 260ms.

## Bản đồ chuyển động

| Thành phần | Vào | Ra |
| --- | --- | --- |
| Thanh nổi (khi không bám theo cuộn) | `slow` lắng, trượt xuống | `close` rời, trượt lên |
| Thanh nổi (nơi trình duyệt hỗ trợ `animation-timeline`) | bám theo cuộn từng khung hình | bám theo cuộn |
| Dải tháng (lưu trữ) | `slow` lắng, bước xuống cùng thanh | `close` rời |
| Menu | `base` lắng; hàng mục nổi 14px trong `slow`, trễ 60ms + 30ms mỗi mục; ba vạch thành dấu nhân: vạch giữa tan và hai vạch kia gặp nhau trong `quick`, rồi xoay chéo trong `base` sau 90ms | `close` rời; hàng mục chìm 10px; dấu nhân thành ba vạch theo thứ tự ngược lại: gỡ chéo trong `quick`, tách ra sau 70ms |
| Sheet trên màn hình rộng (Trang đọc, Mục lục) | tấm kính đến ngay, mọc từ góc nút mở (97%, 6px) trong `base` lắng và mờ dần lên; nội dung hiện sau 40ms trong `base` | nội dung rời trước, `quick`, chìm 4px; tấm kính lùi về nút mở nửa quãng trong `close`; chỉ khi đã trống, ở nửa sau (từ 130ms), tấm kính mới tan và hết mờ trong `press` |
| Sheet trên điện thoại, chú thích | trượt cả tấm lên từ mép dưới trong `slow` lắng | trượt cả tấm xuống quá mép trong `base` rời; kính giữ nguyên độ mờ suốt đường, không mờ đi |
| Tìm kiếm | `base` lắng, nổi 8px, từ 98,5%; nền tối dần | `close` rời; nền sáng lại cùng lúc |
| Về đầu trang | `base` lắng, từ 80% | `close` rời; nhấn `press` |
| Lịch sử xuất bản | `base` lắng, mở chiều cao | `close` rời |
| Đọc tiếp, quay lại bài, công cụ trích, ô chép đường dẫn (`reveal()`) | `base` lắng, nổi 6–10px | `close` rời, chìm nửa quãng |
| Thông báo "Đã chép" (`flash()`) | `base` lắng, nổi 4px | `close` rời sau 2,4s |
| Chỉ báo của nhóm chọn (cài đặt đọc, giao diện) | `base` lắng, cả hai chiều | |
| Glyph giao diện vừa chọn | xoay một lần, 640ms (mặt trời, trăng), 760ms (tự động) | |
| Đổi giao diện | giấy mới loang từ chỗ chạm, `spread` theo đường loang; kính giữ độ mờ, bị cắt cùng vòng loang | |
| Tên trang, trang đầu tiên của lượt đọc | khắc: xem *Khắc tên* | |
| Nhấn | xem *Nhấn* | |
| Đổi giấy, cỡ chữ, kiểu chữ, giãn dòng, khổ chữ, về mặc định | trang cũ tan vào trang mới, `base` lật; giữ nguyên dòng đang đọc; kính giữ độ mờ | |
| Chuyển trang | trang mới hiện trong `base` lắng sau 80ms, nổi 10px; bản in lướt thành ảnh bìa trong `plate` | trang cũ mờ trong `quick` rời |
| Bộ bài Chuyên đề | chia bài trong `plate` lắng, cách nhau 70ms; lá được chọn nhấc lên trong `plate` | |
| Hover | gạch chân tự viết (`base` hoặc `slow`); bản in nhấc (`slow`); màu (`quick`) | cùng thời lượng, cùng đường lắng |
| Chỗ vừa tới trong bài, chú thích lóe | 2,6s và 1,2s: tín hiệu cần được thấy, cố ý dài | |
| Bản in hiện lần đầu | lưới chấm tan trong 760ms; giấy đổi màu trong `ink` | |
| Cuộn (về đầu trang, đọc tiếp, kệ sách, kệ Pensées trang chủ) | cuộn mượt của trình duyệt | |
| La bàn Tư tưởng: trả lời | thang bảy vòng mực: rê chuột lên một vòng thì vòng phủ nước mực nhạt và tên nó đậm lên trong `quick`; nhấn thì vòng lún còn 94% trong `press`, rồi mực loang từ tâm ra kín vòng trong `quick` lắng; giữ `press` rồi câu mới vào trong `base` lắng, trượt 12px theo chiều đi | câu cũ rời trong `quick` rời, trượt 6px; mực rút khỏi vòng trong `quick` khi câu mới tới |
| La bàn Tư tưởng: kết quả | dấu ấn in xuống trong `slow` lắng, từ 106%; vòng độ khớp được vạch một nét đều từ mười hai giờ trong `slow` + `base` theo đường lật, như nét khắc tên (`stroke-dashoffset` tính bằng đơn vị của chính vòng, không qua `pathLength`, vì có trình duyệt chỉ co giãn `pathLength` khi nét đã vẽ xong, và vòng nhảy lên xuống), con số hiện trong `base` khi nét tới gần; thanh xếp hạng kẻ ra trong `slow`, cách nhau 30ms; các ô nổi 8px trong `base`, cách nhau 30ms, tối đa 300ms | trang câu hỏi rời trong `close` rời, chìm 4px |
| La bàn Tư tưởng: đường đi dưới câu hỏi | dấu của câu đang hỏi phóng 135% và có viền mờ, dấu đã trả lời đổ mực, trong `quick` lắng; rê chuột lên một dấu đã qua thì nó phóng trong `base`; nhấn thì co về 90% trong `press` | như lúc vào |
| La bàn Tư tưởng: khối ba chiều | kéo thì khối theo tay một một (mỗi pixel một góc cố định); buông thì khối giữ tốc độ của tay rồi chậm dần như lăn quả địa cầu (giữ 0,997 tốc độ mỗi mili giây, đường giảm tốc cuộn trang của Apple); nhấn một góc nhìn hay phím mũi tên thì khối quay tới đó trên một lò xo tắt dần vừa đủ (response 0,42s, không nảy), từ đúng chỗ nó đang đứng; bắt lại được giữa chừng; ở trang đầu khối nghiêng nhẹ về phía con trỏ đang nghỉ (±9°, ±6°) | như lúc vào; Giảm chuyển động thì khối quay tới ngay, không trôi |
| Cửa La bàn Tư tưởng (trang chủ, Thể nghiệm) | chuột di tới gần khối thì khối nghiêng về phía nó (tối đa ±11° ngang, ±7° dọc, mạnh nhất trong lòng khối, nhạt dần tới hết ở 1,1 bề rộng khối) và trôi theo tối đa 6px dưới cái tên nằm yên, trên một lò xo tắt dần vừa đủ (response 0,6s, không nảy); chỉ trả lời bàn tay đang động (`pointermove`), không trả lời trang cuộn dưới tay đứng yên | chuột rời vùng thì khối lắng về chỗ cũ trên cùng lò xo; màn hình cảm ứng và Giảm chuyển động: khối đứng yên |
| Cửa La bàn Tư tưởng, riêng trang chủ: khối tự xoay | khối tự xoay quanh cả ba trục, mỗi trục là tổng hai nhịp có độ dài không chia hết cho nhau (tỉ lệ vàng, căn hai) nên đường xoay không bao giờ lặp; đường chạy nhanh gấp 1,4 lần đồng hồ (`TEMPO`): quanh trục đứng trung bình 4,2°/s (một vòng chừng 86 giây), lúc nhanh lúc chậm, thỉnh thoảng dừng rồi quay ngược; nhìn từ trên xuống giữa 16° và 40°; lăn trong mặt phẳng nhìn không quá ±5°; tối đa 13°/s, gia tốc không quá 4°/s²; mỗi lượt vào một đường mới; khởi hành từ chỗ nghỉ, nhịp tăng dần trên lò xo (response 1,2s); vẽ theo nhịp màn hình (60 khung/giây trở lên) trên canvas trong một worker (OffscreenCanvas), trang không đổi phần tử nào khi khối quay (`src/lib/quiz/doorScene.ts`, `drift.ts`) | chuột tới gần hoặc phím Tab tới cửa thì khối chậm dần rồi dừng, chuột rời thì đi tiếp; ra khỏi màn hình, trang bị ẩn, hoặc 90 giây không ai chạm/cuộn thì dừng; Giảm chuyển động và khi in: hình tĩnh (SVG); cửa ở trang Thể nghiệm không tự xoay |
| La bàn Tư tưởng: đổi hướng so trên mười hai trục | ô được chọn viền mực trong `quick`; vạch màu trên mỗi trục trượt tới chỗ biến thể mới và đổi mực trong `base` lắng (ngoại lệ `left`: vạch nằm trên thanh phần trăm, dời theo phần trăm) | như lúc vào |

## Nhấn

Từ v1.2.2. Thứ gì bấm được cũng đáp lại ngón tay, và đáp khẽ: vào trong `press` lắng, nhả ra trong `base` lắng (thời lượng của trạng thái thường), nên cú nhấn đến nhanh mà lúc nhả thì lắng lại, không bật.

| Thành phần | Khi nhấn |
| --- | --- |
| Nút chữ (Nhận bài mới, …) | co về 97%; nút mực đậm thêm một chút |
| Nút biểu tượng (tìm kiếm, Aa, …) | co về 93%, nền đậm lên 11% |
| Ba vạch (nút menu) | vạch trên và vạch dưới khép vào 1px |
| Glyph giao diện | co về 88% |
| Lựa chọn trong cài đặt đọc | chữ hay mẫu của lựa chọn co về 92%; ô chọn trượt tới sau đó |
| Mũi tên trong menu | nhích 3px theo hướng nó chỉ (mũi tên ra ngoài: chéo 2px), như khi rê chuột qua |
| Về đầu trang | mũi tên nhích lên 2px |
| Chip, nút kệ (sách, Pensées) | co như nút chữ |

Hover chỉ có ở nơi có con trỏ thật (`@media (hover: hover)`), để một cú chạm trên điện thoại không để lại trạng thái hover đứng đó. Safari trên iPhone chỉ áp `:active` khi trang có lắng nghe `touchstart`; `editionHead.js` đặt một listener thụ động, không làm gì, cho việc đó.

## Khắc tên

Từ v1.2.2, ngoại lệ duy nhất của nguyên tắc 1. Trên trang đầu tiên của một lượt đọc (một lần mỗi phiên, không khi tải lại, không bao giờ khi bật Giảm chuyển động), tên tập san được khắc như một bản khắc đồng: một nét mảnh vạch theo đường viền mỗi chữ, trái sang phải, như mũi dao khắc; mực tràn vào khi nét khép lại, và nét tan vào mực.

- Mỗi đường viền được vạch cùng một tốc độ trong `trace` (600ms, đường lật), nên nét ngắn khép trước. Chữ sau bắt đầu sau chữ trước `letter` (20ms). Mực tràn trong `slow` lắng, từ 56% nét vạch. Cả chuỗi khoảng 1,3 giây: dài hơn giới hạn 1 giây ở dưới, vì chỉ chạy một lần.
- Tên lúc nghỉ vẫn là chữ: là thứ trang vẽ đầu tiên, và thứ công cụ tìm kiếm và trình đọc màn hình đọc. Bản vẽ (các đường viền của chính Libre Bodoni, dàn như trình duyệt dàn chữ; `lib/nameplate.mjs`) cùng đoạn mã khắc (`lib/nameplateEngrave.js`) là một tệp nhỏ, khoảng 2,4KB nén, chỉ được tải ở trang đầu tiên; mọi trang khác không nặng thêm.
- Trong lúc chờ, chữ đã ở đúng chỗ nhưng trong suốt (vẫn là thứ trình duyệt tính là nội dung lớn nhất). Bản vẽ được đặt đè lên đúng đường chân chữ của chính chữ bên dưới (trình duyệt làm tròn số đo của dòng theo cách riêng), rồi được gỡ đi khi mực đã khô.
- Không đọc gì từ trang trước khung hình đầu tiên (đo tên sớm hơn buộc trình duyệt dàn cả trang sớm, và trang hiện ra chậm hơn), và không thêm stylesheet nào (một stylesheet thêm vào giữa lúc tải bắt cả trang tính lại kiểu): chuyển động đặt bằng Web Animations, từ chính các token của trang.
- Nếu bản vẽ đến trễ hơn 1 giây kể từ lúc trang bắt đầu, tên hiện ra như bình thường, không khắc.
- Đo ở v1.2.2 (lượt đầu, giả lập điện thoại, HTTP/2 nén brotli): trang hiện ra (FCP) không đổi; ảnh lớn nhất hiện ra (LCP) không đổi ở tốc độ CPU bình thường, chậm hơn khoảng 30ms ở trang chủ khi CPU bị làm chậm 4 lần, vì chữ đang được khắc trong lúc ảnh bìa đang in; thời gian chặn luồng chính (TBT) không đổi. Các trang sau trong lượt đọc không chịu gì.

## Khi thêm một chuyển động

1. Dùng token. Không viết số mili giây hay `cubic-bezier` mới, trừ keyframe một lần, và khi đó ghi lý do tại chỗ.
2. Viết cả đường vào lẫn đường ra. Transition đặt trên trạng thái *đích*: trạng thái mở mang `base` và đường lắng; trạng thái gốc (đóng) mang `close` và đường rời.
3. Thứ rời màn hình hay ẩn đi dùng `close` và đường rời. Thứ đổi tại chỗ (màu, chỉ báo) dùng `quick` hoặc `base` và đường lắng cho cả hai chiều.
4. Popover và dialog: `@starting-style` cho đường vào; `overlay` và `display` với `allow-discrete` theo `close` cho đường ra. Hình dạng đặt trên chính phần tử, không chỉ lúc mở, để nó không đổi dáng khi đang mờ đi.
5. Hiện hay ẩn bằng script thì dùng `reveal()` và `flash()` (`editionMotion.ts`), không đặt `hidden` trực tiếp cho thứ người đọc thấy xuất hiện.
6. Thay đổi cả trang dùng `turnPage()` (`editionTurn.ts`): nó nhấc kính ra khỏi ảnh chụp của trang để kính không mất độ mờ.
7. Cách nhau không quá 30ms mỗi bước, và cả chuỗi không quá khoảng 1 giây.
8. Quãng đường nhỏ: 4–14px cho lớp giao diện nổi lên (bản in trong bộ bài 40px); co không dưới 94%, trừ glyph nhỏ khi nhấn (88–93%). Sheet gắn vào mép màn hình thì trượt cả tấm từ mép, như sheet của chính điện thoại.
10. Kính mờ không mờ dần đi khi vẫn còn chữ trên nó: một tấm kính đang mờ dần cho thấy trang bên dưới sắc nét xuyên qua độ mờ của chính nó. Làm trống tấm kính trước, rồi mới cho kính tan.
9. Không animate `width`, `height`, `top`, `left` trừ khi không có cách khác, và ghi chú lý do.

Một đánh đổi đã biết: trong lúc lật trang (340ms khi đổi cài đặt, 720ms khi đổi giao diện) trình duyệt không nhận chạm lên trang. Hai lần chọn liền nhau nhanh hơn thế thì lần sau không được ghi.
