# La bàn Tư tưởng: đối chiếu với dữ liệu chuyên gia

Lần đầu: 30/9/2026. Tài liệu này ghi lại việc so các hồ sơ biến thể (đều là bản nháp Claude chấm) với ba bộ dữ liệu chuyên gia, những gì lệch, và những gì đã sửa. Nó bổ sung cho [method.md](method.md), không thay thế việc hai người chấm độc lập và đợt thử với người thật.

## Nguồn

| Bộ dữ liệu | Đo gì | Phạm vi | Dùng cho |
| --- | --- | --- | --- |
| V-Party v2 (V-Dem Institute, qua gói `vdemdata` 16.0) | Lập trường của đảng ở mỗi kỳ bầu cử, do chuyên gia chấm | 1.955 đảng, 169 nước, 1900–2019 | 60 đảng trong danh mục |
| CHES 1999–2024 (Chapel Hill Expert Survey, bản xu hướng V2) | Lập trường đảng trên nhiều vấn đề, thang 0–10 | Đảng ở các nước EU | 26 đảng |
| V-Dem v16, theo nước và năm | Chế độ chính trị: bầu cử, kiểm soát quyền lực, tự do dân sự, sở hữu nhà nước, ý thức hệ chính danh | 202 nước, 1789–2025 | 99 nhà nước |

62 trong 121 đảng khớp được với ít nhất một nguồn. Số còn lại là phong trào, hội đoàn hay đảng không dự bầu cử (IWW, Hội Mont Pèlerin, Việt Nam Quang Phục hội…), đảng trước năm 1900, hoặc đảng quá nhỏ. 14 trong 113 nhà nước nằm ngoài dữ liệu (trước 1789, hay một vùng như Catalonia 1936–1939).

## Cách so

Mỗi đảng hay nhà nước được gắn với từng biến thể mà danh mục gán cho nó, kèm khoảng năm nó thể hiện biến thể đó. Ví dụ Công đảng Anh là Chủ nghĩa Fabian 1918–1945, Dân chủ xã hội hậu chiến 1945–1979, Con đường thứ ba 1994–2010. Giá trị dữ liệu trong khoảng năm được lấy trung bình rồi đọc sang thang 0–100 của trục qua các mốc neo:

| Trục | V-Party | CHES | V-Dem |
| --- | --- | --- | --- |
| Kinh tế + Phân phối | Tả–hữu kinh tế (so với trung bình hai trục) | Can thiệp nhà nước, bãi bỏ điều tiết; tái phân phối, thuế hay dịch vụ công | Sở hữu nhà nước; phúc lợi phổ quát (yếu) |
| Quyền lực | Cam kết với bầu cử đa đảng và các quyền tự do | Quyền hành pháp, độc lập tư pháp (chỉ 2024) | Dân chủ bầu cử, ràng buộc tư pháp và lập pháp |
| Tự do | Như trên, cộng với quyền thiểu số | Tự do dân sự hay luật lệ và trật tự | Chỉ số tự do dân sự |
| Tinh hoa | Chỉ số dân tuý | Dân hay dân biểu quyết định (chỉ 2024) | Quyền lực theo giàu nghèo và nhóm xã hội (yếu) |
| Lối sống | Quyền LGBT, phụ nữ đi làm (chỉ từ 1990) | Lối sống xã hội | |
| Tôn giáo | Viện dẫn tôn giáo | Nguyên tắc tôn giáo trong chính trị | |
| Bản sắc | Nhập cư, đề cao ưu thế văn hoá | Nhập cư, đa văn hoá, chủ nghĩa dân tộc | |
| Thương mại, Môi trường | | Bảo hộ (2019), môi trường | |

Đối ngoại và Thay đổi không có nguồn nào đo. Việc đọc thang này là xấp xỉ, nên thước đo chính là **thứ tự**: biến thể nào đứng trên biến thể nào (hệ số Spearman ρ, 1 là trùng thứ tự hoàn toàn). Độ lệch tuyệt đối chỉ đáng tin khi nhiều nguồn cùng chỉ một hướng.

## Kết quả, trước khi sửa

| Nguồn | Số cặp | ρ theo trục | Sai số trung bình |
| --- | --- | --- | --- |
| V-Party | 87 | Tự do 0,86; Quyền lực 0,82; Lối sống 0,82; Tôn giáo 0,79; Bản sắc 0,77; Kinh tế 0,74; Tinh hoa 0,62 | 10–15 điểm |
| CHES | 35 | Lối sống 0,91; Bản sắc 0,90; Môi trường 0,88; Tôn giáo 0,87; Phân phối 0,82; Thương mại 0,81; Tự do 0,80; Kinh tế 0,79; Quyền lực 0,79; Tinh hoa 0,77 | 8–16 điểm |
| V-Dem | 132 | Quyền lực 0,82; Tự do 0,79; Kinh tế 0,63; Tinh hoa 0,37; Phân phối 0,34 | 14–19 điểm |

Nghĩa là thứ tự các hồ sơ khớp khá tốt với chuyên gia ở những trục đo được, nhưng có những lệch hệ thống:

1. **Các biến thể độc tài bị vẽ quá cực đoan.** Độc tài quân sự, Quốc gia Công giáo, Quân phiệt Nhật, Chủ nghĩa Caesar, Chủ nghĩa Nhân vị, Tư bản độc tài, Dân tuý trật tự, Chủ nghĩa Perón, Nhà nước kiến tạo phát triển đều nằm ở 0–15 trên Quyền lực hay Tự do, sát Quốc xã và Chủ nghĩa Stalin, trong khi các chế độ thể hiện chúng theo V-Dem mở hơn 15–40 điểm (Argentina 1976–1983: 35; Tây Ban Nha thời Franco: 18; Nga từ 2000: tự do dân sự 47; El Salvador từ 2019: 54). Đáy thang bị dồn nên máy khó tách các biến thể này với nhau.
2. **Kinh tế của vài biến thể lệch rõ.** Bảo thủ dân tộc (PiS, Fidesz theo CHES là can thiệp và tái phân phối: kinh tế 26–30, không phải 55); Mô hình Bắc Âu (SAP, Đảng Dân chủ xã hội Đan Mạch ở 37–40 trên kinh tế, không phải 60, trái với CDU ở 57); Con đường thứ ba (SPD, Công đảng 41–52, không phải 70).
3. **Bản sắc của phía trung dung và tự do bị đặt quá cởi mở.** Trung tâm cấp tiến (LREM: 48, hồ sơ 75); Bảo thủ tự do (Bảo thủ Anh 2005–2016: 26–28, hồ sơ 55); Kinh tế thị trường xã hội (CDU, CDA: 36–50, hồ sơ 60); Liên bang thế giới (Volt: 70, hồ sơ 100).
4. **Tinh hoa: vài biến thể bị đặt quá "số đông".** Xanh chủ lưu (Đảng Xanh Đức, Áo: 27–54, hồ sơ 65); Xã hội chủ nghĩa dân chủ đương đại (Die Linke, Công đảng thời Corbyn: 40–50, hồ sơ 70); Dân tộc dân tuý (hồ sơ 85, dữ liệu 50–87, thường khoảng 70). Ngược lại Thần quyền Hồi giáo (hồ sơ 20) có luận điệu dân tuý mạnh (68–82).

Tự do theo CHES lệch trung bình −22 điểm với mọi đảng, kể cả đảng chủ lưu. Đó là do cách đọc thang (CHES đo cứng rắn với tội phạm trong không gian châu Âu), không phải lỗi hồ sơ: khoảng cách giữa các đảng vẫn đúng (CDU với Tập hợp Quốc gia cách nhau 26 điểm, hồ sơ cách nhau 25), nên không sửa theo nó.

## Đã sửa

26 hồ sơ được kéo về phía dữ liệu, chỉ ở những chỗ có từ hai nguồn trở lên cùng chỉ một hướng, hoặc một nguồn lệch rất xa. Khía cạnh ghi riêng được sửa theo để trung bình khớp trục.

| Biến thể | Thay đổi |
| --- | --- |
| Chủ nghĩa Caesar | Quyền lực 5→15 (Cạnh tranh chính trị 10→25, Giới hạn quyền lực 0→10, Trung ương và địa phương 5→10) |
| Độc tài quân sự | Quyền lực 5→15 |
| Tư bản độc tài | Quyền lực 10→20, Tự do 20→30, Kinh tế 65→55 (Sở hữu 65→50, Điều tiết và dẫn dắt 40→25), Phân phối 75→65 |
| Chủ nghĩa Nhân vị | Quyền lực 15→25, Kinh tế 45→55 |
| Trung tâm cấp tiến | Bản sắc 75→50, Thương mại 80→65 |
| Kinh tế thị trường xã hội | Bản sắc 60→45, Phân phối 45→50 |
| Bảo thủ dân tộc | Kinh tế 55→40, Phân phối 60→50, Thương mại 45→25, Tôn giáo 70→80 |
| Bảo thủ tự do | Bản sắc 55→40, Tôn giáo 45→55 |
| Chủ nghĩa De Gaulle | Quyền lực 45→55 (Giới hạn quyền lực 35→50, Trung ương và địa phương 20→35), Tự do 50→60 |
| Xã hội chủ nghĩa dân chủ đương đại | Tinh hoa 70→55, Kinh tế 25→20 |
| Nhà nước kiến tạo phát triển | Tự do 25→35 |
| Quốc gia Công giáo | Quyền lực 5→15, Tự do 10→20, Kinh tế 40→50 |
| Quân phiệt Nhật | Quyền lực 5→15, Tự do 5→15 |
| Xanh chủ lưu | Tinh hoa 65→55, Kinh tế 45→40, Thương mại 65→55 |
| Chủ nghĩa Chávez | Kinh tế 15→20 |
| Chủ nghĩa Perón | Quyền lực 25→35, Tự do 30→40, Bản sắc 20→35, Tôn giáo 60→50 |
| Dân tuý cánh tả châu Âu | Kinh tế 25→20, Bản sắc 60→70 |
| Liên bang thế giới | Bản sắc 100→90 |
| Thần quyền Hồi giáo | Tinh hoa 20→35 |
| Dân tộc Phật giáo | Quyền lực 30→45 |
| Dân tộc Ấn giáo | Quyền lực 45→55, Tự do 35→45, Lối sống 15→25 |
| Dân tộc dân tuý | Tinh hoa 85→75 (Ai quyết định 75→65, Đẳng cấp 75→60), Môi trường 10→25, Kinh tế 60→50, Phân phối 60→55 |
| Phúc lợi cho người bản xứ | Kinh tế 40→45, Phân phối 30→40, Tự do 50→40, Môi trường 40→30 |
| Dân tuý trật tự | Tự do 5→20 (Ngôn luận và hội họp 30, Riêng tư 30; Tư pháp hình sự vẫn 0) |
| Mô hình Bắc Âu | Kinh tế 60→45 (Sở hữu 70→60, Kế hoạch và giá cả 80→60, Điều tiết và dẫn dắt 35→20), Tinh hoa 50→40, Thương mại 80→65 |
| Con đường thứ ba | Kinh tế 70→58, Phân phối 45→40 |

Việc sửa không làm máy kém phân biệt. Mô phỏng (20 người ảo mỗi biến thể, ba lần gieo ngẫu nhiên) gọi đúng biến thể khoảng 68% với bản chuẩn và 77–82% khi có chặng hỏi thêm (trung bình 80%, trước khi sửa cũng 80%), nằm trong ba kết quả đầu 94–97%. Một lần gieo đơn lẻ có thể lệch 2–3 điểm, nên chỉ so trung bình. Các hồ sơ vẫn là `draft`: dữ liệu chỉ phủ 6 đến 10 trên 12 trục, nên bước hai người chấm vẫn cần. Các con số này đo bằng bộ so khớp cũ; bộ so khớp viết lại ngày 30/9 và số liệu mô phỏng mới nằm ở [method.md](method.md#mô-phỏng).

## Ví dụ đã chuyển

Những chỗ này là chuyện gán ví dụ hay định nghĩa biến thể, không phải một con số. Đã áp dụng ngày 30/9 theo đề xuất, chờ Archie xác nhận:

- **Đan Mạch ra khỏi Dân chủ xã hội bảo thủ.** Đảng Dân chủ xã hội Đan Mạch (2015 trở đi) và Đan Mạch 2019–2022 cứng rắn về nhập cư nhưng rất cởi mở về lối sống (73, hồ sơ 35) và tự do (78, hồ sơ 50). Hồ sơ theo Maurice Glasman vẫn đúng; ví dụ Đan Mạch thì không. Đảng, nhà nước và Mette Frederiksen nay thuộc Mô hình Bắc Âu. Dân chủ xã hội bảo thủ không còn đảng hay nhà nước riêng, nên mượn của biến thể gần nhất trong họ và trang kết quả nói rõ điều đó.
- **AKP chỉ còn Dân chủ Hồi giáo (2002–2011).** Sau 2014 AKP độc đoán hơn nhiều (Quyền lực 8, Tự do 13) và tôn giáo hơn nhiều (86) so với Dân tộc dân tuý, và không biến thể nào hiện có đủ gần để gán thay.
- **Tách Tiến bộ, thêm Tự do New Deal.** Hồ sơ Tiến bộ (Lối sống 90, Bản sắc 80) là cánh tiến bộ hiện nay, nhưng danh mục gán cả Hoa Kỳ 1913–1921, 1933–1945 và Đảng Dân chủ 1932–1990, vốn chỉ ở 53–54 trên hai trục đó. Biến thể mới Tự do New Deal (1933–1968; Roosevelt, Truman, Johnson) dựng theo dữ liệu V-Party của Đảng Dân chủ 1932–1990 và là biến thể khớp nhất với nó trong 125 (lệch trung bình 4 điểm). Hoa Kỳ 1933–1945 và Franklin D. Roosevelt chuyển sang đó, Hoa Kỳ 1913–1921 chỉ còn Dân chủ can thiệp, và Tiến bộ tính từ 1990.
- **Bỏ Ý 2011–2013 khỏi Kỹ trị.** Hồ sơ theo Saint-Simon và phong trào Technocracy (Quyền lực 35), còn chính phủ Monti vận hành trong một nền dân chủ (V-Dem: 84). Mario Monti chuyển sang Trật tự tự do, gần với kinh tế thị trường xã hội mà ông cổ vũ. Kỹ trị giữ PAP Singapore.

Giữ nguyên:

- **Đảng Cộng hoà Mỹ ở Bảo thủ Kitô giáo (1980 trở đi).** Cả đảng gần Bảo thủ kiểu Mỹ hơn; phong trào mới đúng hồ sơ. Giữ, vì đảng là phương tiện của phong trào. Đảng Dân chủ từ 2010 ở Tiến bộ cũng vậy: cả đảng ôn hoà hơn cánh tiến bộ của nó (Lối sống 66, Bản sắc 54).

## Giới hạn

- Hai trục Đối ngoại và Thay đổi, cùng Thương mại và Môi trường ngoài châu Âu, chưa được nguồn nào kiểm.
- V-Party và CHES đo **đảng**, V-Dem đo **chế độ khi cầm quyền**. Một chế độ luôn bị thực tế ràng buộc, nên mở hơn lý tưởng của hệ tư tưởng là bình thường; chỉ lệch lớn và lặp lại mới được sửa.
- Với nhà nước trước 1914, "ít sở hữu nhà nước" phần lớn là do nhà nước thời đó yếu, không phải lựa chọn; trục Kinh tế của chúng không được dùng để sửa.
- 298 nhân vật chưa được kiểm với nguồn nào.
- Chiều và sức nặng của từng câu hỏi chỉ kiểm được bằng đợt thử với người thật. Mô phỏng chỉ cho biết máy phân biệt được các hồ sơ, không cho biết hồ sơ đúng.

## Làm lại

Bảng khớp đảng và nhà nước với mã của từng bộ dữ liệu, cùng mã so sánh, nằm ở thư mục chung của dự án (`v1.3/doi-chieu/`), không nằm trong kho mã. Dữ liệu tải từ `raw.githubusercontent.com/vdeminstitute/vdemdata` (V-Party, V-Dem) và `github.com/chesdata/chesdata.github.io/releases` (CHES).
