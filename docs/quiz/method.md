# La bàn Tư tưởng: phương pháp

Từ v2. Tài liệu này là chuẩn cho cách quiz đọc câu trả lời và gọi tên một hệ tư tưởng. Mã nằm ở `src/lib/quiz/`, dữ liệu ở `src/data/quiz/`, kiểm tra ở `tests/quiz-*.test.mjs`.

Kết quả phải gọi được tên *biến thể*, không chỉ *họ*: không dừng ở "Bảo thủ" mà nói rõ Bảo thủ kiểu Mỹ, Bảo thủ quý tộc hay Bảo thủ Kitô giáo. Muốn vậy, mỗi biến thể trong thư viện có sẵn câu trả lời dự kiến cho từng câu hỏi trong ngân hàng. Quiz hỏi một phần cố định, so cách bạn trả lời với từng biến thể, rồi hỏi thêm những câu chọn riêng để tách các biến thể đang dẫn đầu.

Bản v1 đọc câu trả lời thành vị trí trên 12 trục rồi đo khoảng cách tới hồ sơ trục của biến thể. Bản v2 bỏ bước ấy: nó so thẳng từng câu trả lời của bạn với câu trả lời dự kiến của từng biến thể. Điểm trục và khía cạnh vẫn có, nhưng chỉ để vẽ thanh trên trang kết quả, và được tính riêng: từ phần câu hỏi cố định, không từ những câu chọn riêng để tách biến thể (mục Điểm khía cạnh và trục).

## Dữ liệu

| Tệp | Nội dung |
| --- | --- |
| `axes.json` | 12 trục, mỗi trục 3 khía cạnh (36 khía cạnh), 5 mốc neo 0/25/50/75/100 |
| `themes.json` | 20 chủ đề: những đường chia mà 12 trục không vẽ ra |
| `questions.json` | Ngân hàng câu hỏi: mỗi câu có số cố định (`n`), tầng (`tier`), trạng thái, và khía cạnh cùng chiều (`key`) hoặc chủ đề |
| `library/<họ>.json` | Một họ và các biến thể của nó |
| `ratings/*.json` | Công việc của hai người chấm A và B, kèm lý do và ghi chú |
| `profiles.json` | Câu trả lời dự kiến của mọi biến thể trên mọi câu, biên dịch từ `ratings/` |
| `catalogue/<họ>.json` | Nhân vật, đảng và nhà nước của các biến thể trong họ |
| `figure-answers.json` | Câu trả lời của từng nhân vật đã chấm riêng, mỗi câu một chữ cái như `profiles.json` (`.` là bỏ trống); sinh bởi `node scripts/quiz-figures.mjs <bảng câu trả lời .csv> <tiến độ .json> [--except id]` |

Mọi trục chạy từ cực thứ nhất (0) tới cực thứ hai (100). Khía cạnh chạy cùng chiều với trục của nó.

Thang trả lời có bảy bậc, từ 3 xuống −3:

| Điểm | Nhãn |
| --- | --- |
| 3 | Đồng ý trong mọi trường hợp |
| 2 | Đồng ý trong phần lớn trường hợp |
| 1 | Đồng ý phần nào |
| 0 | Trung lập |
| −1 | Phản đối phần nào |
| −2 | Phản đối trong phần lớn trường hợp |
| −3 | Phản đối trong mọi trường hợp |

Giữa thang là "Trung lập", không phải "Trung dung": Trung dung là tên một họ trong thư viện. Bỏ qua một câu thì câu ấy không tính.

### Ngân hàng câu hỏi

Ngân hàng có 466 câu còn dùng được, gồm hai loại:

- **Câu khía cạnh** (286 câu): mỗi câu thuộc một trong 36 khía cạnh và có chiều (`key`): đồng ý kéo về cực 100 (`key` = +1) hay về cực 0 (`key` = −1). Câu trả lời r đặt người chơi ở vị trí 50 + key · r · 50/3 trên khía cạnh ấy.
- **Câu chủ đề** (180 câu): không thuộc khía cạnh nào, không có `key`, nằm trong 20 chủ đề. Chúng chỉ để phân biệt biến thể với nhau và được hỏi ở chặng hỏi thêm, hay trong phần cố định của bản chuyên sâu.

Các tầng:

- **core**: 48 câu của bản rút gọn, đúng 4 câu mỗi trục, hai câu đồng ý kéo về mỗi cực. Người có thói quen "cứ đồng ý" vì thế rơi vào giữa chứ không lệch hẳn về một phía.
- **long**: 24 câu thêm cho bản tiêu chuẩn (48 + 24 = 72 câu), 2 câu mỗi khía cạnh, một câu mỗi chiều, nên 72 câu cũng cân bằng như 48 câu (`validate.ts` kiểm).
- **deep**: 72 câu thêm cho bản chuyên sâu (72 + 72 = 144 câu): một câu cho mỗi trong 36 khía cạnh, và 36 câu chủ đề, mỗi chủ đề ít nhất một và nhiều nhất hai câu. `scripts/quiz-deep.mjs` chọn chúng: trong mỗi nhóm, câu tách thư viện rõ nhất, tức phương sai câu trả lời dự kiến giữa 168 biến thể chia cho nhiễu của một câu trả lời (NOISE² cộng phương sai trung bình của hồ sơ). Chiều của 36 câu khía cạnh được xếp để mỗi trục lệch nhiều nhất một câu và cả phần cộng lại không lệch: sáu trục mỗi chiều. Chạy lại script khi bảng chấm hay ngân hàng câu đổi.
- **pool**: 322 câu còn lại (178 câu khía cạnh, 144 câu chủ đề), chỉ dùng ở chặng hỏi thêm; ở hai bản ngắn, chặng hỏi thêm cũng có thể chọn câu `long` hay `deep` chưa hỏi. Mỗi khía cạnh cần ít nhất 4 câu còn dùng được, mỗi chủ đề ít nhất 3.

Hai mươi chủ đề: Chính thể; Nguồn chính danh; Đảng và phong trào; Quân đội trong chính trị; Lãnh tụ; Hiến pháp và pháp quyền; Tôn giáo cụ thể; Chủ thể lịch sử; Hình thức sở hữu; Công đoàn và nghiệp đoàn; Tiền, tài chính và thị trường; Lãnh thổ và tự quyết; Trật tự thế giới; Sinh thái sâu; Công nghệ và con người; Giới; Tri thức và giáo dục; Cộng đồng và tự quản; Bạo lực chính trị; Bản chất con người và lịch sử.

`status` của câu: `draft` (nháp), `piloted` (đã thử), `kept` (giữ sau thử nghiệm), `dropped` (bỏ, không bao giờ được hỏi và không có cột trong `profiles.json`). Hiện cả 466 câu là `draft`. Số `n` của mỗi câu không bao giờ dùng lại, vì liên kết chia sẻ gọi câu hỏi bằng số ấy.

Hai người chấm đánh dấu 40 câu là vừa hỏi hai ý vừa mơ hồ; 40 câu ấy đã được viết lại. Ngày 6/10/2026 thêm 24 câu cho các chủ đề giai cấp (Chủ thể lịch sử), tri thức, cộng đồng và bản chất con người, vì bốn chủ đề này còn mỏng.

Câu hỏi về quyền lực dùng mốc lịch sử và nguyên lý chung, không nêu tên cơ quan hay người đương nhiệm; `tests/quiz-data.test.mjs` chặn một số tên gọi.

### Thư viện

Thư viện có 168 biến thể trong 26 họ. Không đưa chính khách Việt Nam còn sống vào thư viện. Mọi biến thể hiện là `draft`; vòng đời vẫn là `draft` → `rated` → `reviewed` (người đọc sử liệu duyệt) → `published`.

Mỗi biến thể có tên, tóm tắt, người tiêu biểu, thời kỳ, và một hồ sơ biên tập trên 12 trục (`axes`, cùng `facets` cho những khía cạnh nó khác trục của chính nó). Hồ sơ biên tập này không còn là thứ đem ra so khớp. Nó chỉ làm hai việc: đứng thay cho câu trả lời dự kiến ở câu chưa ai chấm, và là gốc để danh mục lệch riêng cho từng nhân vật. Khía cạnh ghi riêng không được kéo trung bình trục lệch quá 10 điểm so với điểm trục (`MAX_FACET_DRIFT`). Hai mươi sáu hồ sơ biên tập đã được kéo về phía dữ liệu chuyên gia V-Party, CHES và V-Dem ([validation.md](validation.md)).

Vị trí của một biến thể trên mỗi khía cạnh và mỗi trục, dùng để vẽ thanh và bản đồ, được tính từ chính các câu trả lời dự kiến: một khía cạnh lấy trung bình vị trí của các câu đã chấm (cần ít nhất hai câu, nếu không thì dùng hồ sơ biên tập), một trục là trung bình ba khía cạnh.

## Hồ sơ từ hai người chấm

Mỗi biến thể có một câu trả lời dự kiến trên mọi câu của ngân hàng: 168 × 466 = 78.288 ô. Chúng đến từ hai người chấm độc lập, A và B (cả hai là mô hình ngôn ngữ).

**Cách chấm.** Với mỗi câu, người chấm viết câu trả lời mà một người theo biến thể ấy, cam kết và hiểu biết đầy đủ, sẽ chọn, theo hoàn cảnh nước của chính họ. Biến thể lịch sử trả lời theo nguyên lý của nó. Chỉ chấm ±3 khi đó là cam kết giáo lý; chấm 0 khi người theo thật sự thờ ơ; đánh dấu `split` ở chỗ những người theo bị chia rẽ. Mỗi câu còn có một dòng `why` (câu này vạch ranh giới ở đâu) và ghi chú cho những đáp án ít hiển nhiên nhất.

Hai người chấm không bao giờ thấy bài của nhau. Người B đọc các câu theo thứ tự xáo trộn.

**Gộp hai bài** (`ratings.ts`, `combine`): lấy trung bình, làm tròn tới nửa bậc. Ô được coi là **lỏng** (`split`) nếu một trong hai người đánh dấu `split`, hoặc hai người chênh nhau từ 2 điểm trở lên (`DISAGREE`).

**Hai người đồng thuận tới đâu**, trên 78.288 cặp:

| Đo | Giá trị |
| --- | --- |
| Trùng đúng | 61,9% |
| Lệch tối đa một điểm | 96,8% |
| Hệ số tương quan r | 0,909 |

Phần chấm trước 6/10/2026 đồng thuận hơn (trùng đúng 67%, lệch tối đa một điểm 98%, r = 0,93). Phần chấm sau đó dùng một mô hình rẻ hơn và đồng thuận kém hơn một chút (lệch tối đa một điểm 93–96%, r = 0,87–0,89).

**Tệp.** Bài chấm nằm ở `src/data/quiz/ratings/*.json` (mỗi tệp một khối câu hỏi của một người chấm; `codes.json` đặt mã ngắn cho từng biến thể). `node scripts/quiz-profiles.mjs` biên dịch chúng thành `profiles.json`: mỗi biến thể một chuỗi, mỗi câu một chữ cái (`a`–`m` là câu trả lời −3 … 3 theo nửa bậc, `n`–`z` là cùng mười ba giá trị nhưng lỏng, `.` là chưa chấm). Tập lệnh in ra mức đồng thuận của hai người chấm và liệt kê ô còn thiếu. `version` của `profiles.json` tăng khi bất kỳ câu trả lời dự kiến nào đổi; liên kết chia sẻ mang số ấy (hiện là 3).

## Từ câu trả lời tới so khớp

Mô hình đi theo từng câu (`match.ts`). Một người theo biến thể v trả lời câu i là

r_i = α + λ · m_vi + ε_i,   ε_i ~ N(0, NOISE² + τ_vi²)

- m_vi: câu trả lời dự kiến của v cho câu i (−3 … 3).
- τ_vi: độ lỏng của ràng buộc: 0,6 ở ô người theo đồng thuận, 1,5 ở ô lỏng (`split`), 2,2 ở ô chưa chấm (`PROFILE_SD`). Ô chưa chấm lấy câu trả lời dự kiến từ vị trí khía cạnh của hồ sơ biên tập (câu khía cạnh) hoặc 0 (câu chủ đề).
- λ: bạn dùng thang mạnh bằng bao nhiêu phần so với một người theo cam kết. Người thật hiếm khi chọn hai đầu thang, nên λ có trước ~ N(0,75; 0,35²), và bị giữ dương: không ai khớp với một truyền thống bằng cách trả lời ngược lại nó.
- α: thói quen nghiêng về "đồng ý" bất kể câu nói gì, có trước ~ N(0; 0,4²).
- NOISE = 1,3: độ tản của một câu quanh điều truyền thống của bạn sẽ trả lời, sau khi đã tính cách bạn dùng thang.

α và λ không được đoán. Với mỗi biến thể, quiz tích phân chúng ra theo công thức đóng: vì cả hai có phân phối chuẩn, mọi câu trả lời cùng nhau có phân phối chuẩn nhiều chiều, mật độ của nó chỉ cần đại số 2 × 2 (công thức Woodbury). Việc giữ λ > 0 nhân mật độ ấy với P(λ > 0 | câu trả lời) / P(λ > 0). Kết quả là **bằng chứng** (evidence) của biến thể: lôga mật độ của đúng những câu trả lời bạn đã đưa, nếu bạn theo biến thể ấy. Cách này cũng cho ra ước lượng α và λ của bạn dưới từng biến thể, cùng phương sai Var(α), Var(λ) và hiệp phương sai Cov(α, λ) hậu nghiệm của chúng. Vì λ bị giữ dương, các mô-men lấy theo phân phối chuẩn cắt tại 0: λ có trung bình và phương sai của phân phối cắt, còn α với λ cho trước vẫn chuẩn, trung bình tuyến tính theo λ, nên Var(α) và Cov(α, λ) suy ra đóng (`posterior`, kiểm bằng tích phân lưới trong `tests/quiz-engine.test.mjs`). Quiz so khuôn mẫu câu trả lời, không so độ gắt.

**Xếp hạng.** Các biến thể xếp theo bằng chứng, cao nhất trước. Biến thể đứng đầu là kết quả chính. Cùng bằng chứng thì xếp theo mã. **Họ** xếp theo biến thể tốt nhất của họ, không cộng dồn, nên họ nhiều biến thể không được lợi.

**Trọng số.** Trọng số của một biến thể là softmax của bằng chứng: exp((bằng chứng − bằng chứng cao nhất) / TEMPERATURE), chuẩn hoá trên toàn thư viện. Dùng bên trong: để chọn câu hỏi thêm, để biết hai biến thể có sát nút không, và cho dòng "Mức tin cậy". TEMPERATURE = 1; ý nghĩa của việc chọn số ấy ở mục Thử nghiệm và hiệu chỉnh.

**Độ khớp** là con số trang hiện ra, một chỉ số chứ không phải xác suất. Nó đo bằng chứng trung bình trên mỗi câu so với một hồ sơ tưởng tượng đoán trúng mọi câu trả lời của bạn: 100 · exp((bằng chứng − bằng chứng lý tưởng) / (2n)), tối đa 100. Một người theo thật thường ở quanh 80. Chỉ số tăng đơn điệu theo bằng chứng, nên danh sách đọc đúng theo thứ tự xếp hạng. "Mức tin cậy" cạnh đó là phần của biến thể trong tổng trọng số của cả thư viện, nói bằng lời kèm con số: cao từ 0,9 (cũng là ngưỡng `confident` để thôi hỏi thêm), khá cao từ 0,7, vừa từ 0,4, dưới nữa là thấp (`confidence`, `view.ts`); nó cũng không phải xác suất bạn "thuộc về" biến thể ấy. Trọng số là tương đối: một biến thể có thể giữ gần hết trọng số chỉ vì kém tệ nhất. Nên Mức tin cậy còn đòi biến thể khớp tuyệt đối: lệch khớp trên `FITS` (0,95) thì cao nhất là "vừa", trên `LOOSE` (1,25) thì là "thấp" và thay con số bằng "khớp kém" (mục Khi thư viện thiếu). Trên trang, Độ khớp là một vòng tô theo màu của họ tư tưởng, số ở giữa; Mức tin cậy là một dòng chữ hoa nhỏ dưới hay bên cạnh vòng.

**Lệch khớp** (`misfit`): trung bình bình phương phần dư chuẩn hoá của câu trả lời, tại ước lượng α và λ tốt nhất của biến thể. Theo mô hình, người thật sự theo biến thể ấy ở quanh 1; trong mô phỏng, vì người chơi giả ít nhiễu hơn NOISE giả định, trung vị là 0,56 và phân vị 95 là 0,95. Trên nhiều thì biến thể dẫn đầu cũng không giải thích nổi các câu trả lời.

**Điểm khía cạnh và trục** (`score.ts`) vẫn được tính, chỉ để vẽ thanh, và tách khỏi việc nhận diện:

- *Chỉ phần cố định.* Thanh đọc phần câu hỏi cố định của bản người chơi đã làm: 48 câu core ở bản rút gọn, thêm 24 câu long ở bản tiêu chuẩn, thêm 72 câu deep ở bản chuyên sâu (`lengthOf`, `score.ts`). Quiz coi là bản tiêu chuẩn khi người chơi đã trả lời từ một nửa tầng long trở lên, và là bản chuyên sâu khi đã trả lời thêm từ một nửa tầng deep (`LENGTH_SHARE`); bản ngắn hơn không hỏi những tầng ấy trong phần cố định, và chặng hỏi thêm của nó chọn ít câu từ đó. Trên 168 người chơi giả, mỗi biến thể một người: bản 48+ chọn trung bình 2,0 câu long (nhiều nhất 7 trong 24) và 6,4 câu deep (nhiều nhất 15 trong 72); bản 72+ chọn trung bình 9,7 câu deep (nhiều nhất 19 trong 72); không ai bị đọc thành bản dài hơn bản đã làm. Vì là hàm của chính câu trả lời, đường dẫn chia sẻ dựng lại đúng thanh người gửi thấy. Câu chọn riêng ở chặng hỏi thêm chỉ vào so khớp và vào các lý do (`insight.ts`), không bao giờ vào thanh: chúng được chọn vì tách được các biến thể đang dẫn đầu, không phải vì đại diện cho khía cạnh, và hai người chơi cùng bản phải được đặt lên thanh bằng cùng những câu.
- *Mỗi khía cạnh cân hai cực.* Trong một khía cạnh, đồng ý với câu khoá về cực 100 và phản đối câu khoá về cực 0 chỉ cùng một hướng, còn thói quen "cứ đồng ý" đẩy hai câu ấy ra hai phía. Nên vị trí khía cạnh là trung bình của hai cực, mỗi cực là trung bình các câu khoá theo nó, chứ không phải trung bình mọi câu: khi khía cạnh có câu khoá cả hai chiều, thói quen đồng ý triệt tiêu đúng. Khía cạnh chỉ có câu khoá một chiều thì câu trả lời được trừ thói quen ấy trước: α̂ ước lượng từ các khía cạnh có cả hai chiều, mỗi khía cạnh cho (trung bình cực + + trung bình cực −)/2, gộp theo độ chính xác cùng tiên nghiệm N(0; 0,4²) của α (`ACQUIESCENCE`), nên vài cặp câu chỉ kéo α̂ đi một phần. Vị trí khía cạnh là 50 + (50/3) · hướng, kẹp trong 0–100.
- *Trục* là trung bình các khía cạnh đã đo; khía cạnh chưa có câu nào là chưa đo, không vay điểm từ khía cạnh khác. Câu chủ đề không vào các điểm này.

Vì sao cần cả hai điều trên: `select.ts` chỉ giữ tổng số câu khoá +1 và −1 trên cả trục lệch nhau không quá một, còn thanh lấy trung bình theo khía cạnh với trọng số bằng nhau, nên cân bằng số câu trên trục không bảo đảm cân bằng phần đóng góp vào điểm trục. Ở 48 câu core, mỗi trục có một khía cạnh hai chiều và hai khía cạnh một chiều ngược nhau, nên thói quen đồng ý triệt tiêu ở trục nhưng vẫn làm lệch hai khía cạnh một chiều tới 33 điểm với người luôn chọn "đồng ý phần lớn"; bộ ước lượng mới bỏ phần lớn độ lệch ấy (`tests/quiz-engine.test.mjs`). Ở 72 câu, mọi khía cạnh có cả hai chiều.

Phép kiểm độ phủ (`coverage`) và các cách xếp để so (`baselines.ts`) vẫn đọc mọi câu trả lời, cố định hay chọn riêng (`every`).

**Phân hoá** (`divided`): khi các khía cạnh của một trục chỉ ngược chiều nhau, mỗi bên cách giữa từ 20 điểm (`DIVIDED`, bằng ngưỡng "nghiêng"), điểm trục chỉ là chỗ chúng bù trừ. Trang ghi "Phân hoá" thay cho mức nghiêng, không đọc câu mốc neo, và không lấy trục ấy làm chỗ "bạn đi xa hơn phần lớn", "đứng cùng nhiều hướng" hay một cặp hiếm gặp (mục Trục là giả thuyết).

**Độ tản** (`scatter`): căn của trung bình phương sai mẫu của các vị trí trong cùng một khía cạnh, trên những khía cạnh có từ hai câu trở lên, tính bằng điểm trên thang 0–100 (một bậc của thang bảy là khoảng 16,7 điểm). Người theo biến thể thường ở quanh 21 điểm (trung vị) và hiếm khi quá 34; người bấm ngẫu nhiên ở quanh 33.

## Trục là giả thuyết

Gộp ba khía cạnh thành một trục là một giả thuyết: rằng chúng đo cùng một chiều. Một người có thể ủng hộ dân chủ đa đảng mà vẫn muốn nhà nước đơn nhất, tập trung về lãnh thổ; dân chủ trực tiếp, chống đặc quyền giai cấp và dân tuý không đồng nghĩa; không can thiệp, hoà bình và đa phương là ba lập trường; sinh thái và thái độ với công nghệ không nhất thiết đối lập; tôn giáo trong đời sống xã hội khác quyền lực chính trị của giáo hội; cấp tiến về mục tiêu khác chấp nhận bạo lực về phương tiện. Các khía cạnh đã giữ những khác biệt ấy; câu hỏi là trung bình của chúng có còn nghĩa không.

Chưa có câu trả lời thật, nên phép thử dùng thư viện (`construct.ts`, `coherence`): vị trí của 168 biến thể trên từng khía cạnh, tính từ câu trả lời dự kiến. Trên mỗi trục: tương quan giữa từng cặp khía cạnh qua các biến thể, và hệ số Cronbach α của ba khía cạnh. Trục là **tổng hợp** khi α dưới 0,7 (`COHERENT`, cũng là mục tiêu của đợt thử) hoặc có cặp khía cạnh tương quan dưới 0,3 (`LINKED`).

| Trục | α | Tương quan từng cặp khía cạnh | |
| --- | --- | --- | --- |
| Quyền lực | 0,90 | đa đảng–kiềm chế 0,88; đa đảng–địa phương 0,63; kiềm chế–địa phương 0,74 | |
| Tinh hoa | 0,85 | quyết định–thứ bậc 0,73; quyết định–niềm tin 0,79; thứ bậc–niềm tin 0,50 | |
| Môi trường | 0,91 | tăng trưởng–thiên nhiên 0,89; tăng trưởng–công nghệ 0,80; thiên nhiên–công nghệ 0,59 | |
| Tôn giáo | 0,95 | nhà nước–luật 0,87; nhà nước–đời sống công 0,91; luật–đời sống công 0,94 | |
| Đối ngoại | 0,51 | vũ lực–luật lệ 0,71; vũ lực–can thiệp 0,17; luật lệ–can thiệp −0,34 | tổng hợp |
| Thay đổi | 0,77 | nhịp độ–phương tiện 0,27; nhịp độ–chiều sâu 0,73; phương tiện–chiều sâu 0,56 | tổng hợp |

Sáu trục còn lại đều có α từ 0,93 và mọi cặp từ 0,71. Vậy trong thư viện, Đối ngoại không phải một thang: tuân theo toà án quốc tế (#248) và can thiệp nhân đạo (#255) đi ngược nhau, nên người theo chủ nghĩa quốc tế tự do (đồng ý cả hai) và người theo chủ nghĩa hiện thực biệt lập (phản đối cả hai) đều về gần 50, mỗi người vì một lẽ. Thay đổi cũng vậy ở phương tiện: tốc độ cải cách và chấp nhận bạo lực ít liên quan. Bốn trục Quyền lực, Tinh hoa, Môi trường, Tôn giáo qua được phép thử, nhưng đó là thư viện do hai mô hình ngôn ngữ chấm, không phải người thật; Tôn giáo chẳng hạn chưa tách được tôn giáo trong đời sống với quyền lực của giáo hội vì gần như không biến thể nào giữ hai điều ấy ngược nhau. Đợt thử lặp lại phép tính trên câu trả lời thật.

Trang làm gì với điều này:

- Trục tổng hợp mang một dòng ghi chú rằng điểm trục là trung bình của những lập trường khác nhau, và được đọc từng khía cạnh. Tập trục tổng hợp được tính lại từ dữ liệu mỗi lần biên dịch; `tests/quiz-data.test.mjs` giữ nó đúng bằng danh sách trên, nên dữ liệu đổi thì tài liệu phải đổi theo.
- Trục bạn phân hoá (mục Điểm khía cạnh và trục) ghi "Phân hoá", không ghi "Cân bằng".
- Ô "Điều làm bạn khác biệt" (chỗ đi xa, chỗ đứng cùng nhiều hướng, cặp hiếm gặp) chỉ dùng trục đọc được như một vị trí: không tổng hợp, không phân hoá (`readable`, `insight.ts`).
- Người đứng gần bạn ở mỗi trục được chọn theo từng khía cạnh, không theo điểm trục (mục Người, đảng và nhà nước).
- Bộ so khớp không đổi: nó chưa bao giờ dùng điểm trục.

**Cân bằng số câu chưa phải cân bằng cách diễn đạt.** 48 câu core có 24 câu khoá mỗi chiều; điều đó không chứng minh câu khoá +1 thiên lệch hơn, nhưng cũng không chứng minh hai chiều được viết ngang nhau: một câu có thể dễ được đồng ý hơn câu soi gương của nó. Phép đo (`wording`): độ lệch diễn đạt của một câu là phần một biến thể đồng ý với nó vượt quá điều vị trí của biến thể trên khía cạnh (tính từ các câu khác của khía cạnh) dự báo, lấy trung bình trên thư viện. Cộng độ lệch của các câu cố định theo đúng cách thanh cân khía cạnh và trục, ta có số điểm mà cách diễn đạt tự đẩy thanh đi:

| Trục | 48 câu | 72 câu |
| --- | --- | --- |
| Kinh tế | −1,6 | −3,0 |
| Phân phối | −4,3 | −2,0 |
| Thương mại | −2,5 | −2,3 |
| Quyền lực | +4,2 | +3,8 |
| Tự do | −2,1 | 0,0 |
| Tinh hoa | +1,7 | −1,2 |
| Lối sống | +3,2 | +2,7 |
| Tôn giáo | −5,9 | +0,2 |
| Bản sắc | +0,6 | −1,9 |
| Môi trường | −0,4 | −1,2 |
| Đối ngoại | +2,7 | −0,1 |
| Thay đổi | +4,7 | +4,4 |

Dấu dương là về cực thứ hai. Lớn nhất là Tôn giáo ở 48 câu (−5,9, về phía thế tục, chủ yếu vì câu #176 khó được đồng ý hơn vị trí khía cạnh dự báo gần một bậc) và Thay đổi (+4,7, về phía cách mạng). Các số này đo trên hồ sơ do mô hình chấm, nên chỉ là chỉ báo; quiz không trừ chúng khỏi thanh (làm vậy sẽ đổi nghĩa của điểm 50 từ "trả lời trung lập" thành "trả lời như thư viện"), nhưng `tests/quiz-data.test.mjs` chặn để không trục nào vượt 6,5 điểm khi sửa câu. Đợt thử đo lại bằng câu trả lời thật.

## Khi quiz không kết luận

Trang không gọi tên một kết quả như thể chắc chắn khi câu trả lời không đủ để nói (`verdict`):

| Cờ | Điều kiện | Trang làm gì |
| --- | --- | --- |
| thiếu | Dưới 10 trục (`MIN_AXES`), hoặc dưới 24 trong 36 khía cạnh (`MIN_FACETS`), hoặc dưới 36 câu (`MIN_ANSWERS`) có câu trả lời | Không ra kết quả; đưa người chơi về câu đầu tiên đã bỏ qua |
| ở giữa | Độ lệch khỏi tâm, căn trung bình bình phương trên các khía cạnh đã đo, dưới 10 điểm (`CENTRE`) | "Bạn đứng gần giữa trên hầu hết các khía cạnh; gần nhất là…" |
| lỏng | Lệch khớp của biến thể dẫn đầu trên 1,25 (`LOOSE`) | "Chưa hướng nào khớp rõ; gần nhất là…"; Mức tin cậy "thấp · khớp kém" |
| khớp chưa chặt | Lệch khớp của biến thể dẫn đầu trên 0,95 (`FITS`), chưa tới `LOOSE` | Ghi chú: hướng này dẫn đầu nhưng khớp kém hơn mức một người theo thường khớp, có thể thư viện chưa có hướng gần hơn; Mức tin cậy không quá "vừa"; chặng hỏi thêm dừng ở mức sàn |
| mâu thuẫn | Độ tản trên 36 điểm (`SCATTERED`) | Ghi chú: nhiều câu cùng khía cạnh ngược nhau, kết quả kém chắc |
| sát nút | Biến thể về nhì có trọng số từ một nửa biến thể dẫn đầu trở lên (`CLOSE`) | Hiện cả hai |

Ngưỡng `LOOSE` được chỉnh ngày 6/10/2026 bằng mô phỏng chéo hai người chấm (mục Mô phỏng):

| Đo | Người theo biến thể | Phiếu bấm ngẫu nhiên |
| --- | --- | --- |
| Lệch khớp của biến thể dẫn đầu, trung vị | 0,55 | 1,54 |
| Lệch khớp, phân vị 99 | 1,00 | (nhỏ nhất 1,11) |
| Lệch khớp, lớn nhất | không quá 1,1 | |
| Độ tản, trung vị | 21 | 33 |
| Độ tản, phân vị 99 | 34 | |

Người theo đi ngược lại biến thể của mình (đảo mọi câu trả lời) có lệch khớp trung vị 0,84.

`LOOSE` hạ từ 1,9 xuống 1,25; `SCATTERED` giữ ở 36. Với các ngưỡng ấy, không người theo nào bị gắn cờ lỏng; 0,6% người theo bị gắn một trong hai cờ; khoảng 9 trong 10 phiếu ngẫu nhiên bị gắn cờ (ở ngưỡng 1,2 là 97,8%, ở 1,3 là 90,7%). Phiếu trống hay chỉ một câu thì bị gắn cờ thiếu.

### Khi thư viện thiếu

`LOOSE` được chỉnh để bắt phiếu ngẫu nhiên, không phải để bắt người có thật nhưng nằm ngoài thư viện. Phép thử: lần lượt bỏ từng họ khỏi thư viện (26 họ), cho người theo các biến thể của họ ấy làm quiz trên thư viện còn lại, theo cả hai chiều người chấm (336 người chơi), và so với 336 người theo biến thể có trong thư viện (`simulateOutside`). Lần đo đầu, ngày 9/10/2026 với độ dài cũ:

| Đo, ở cuối quiz | Người theo, có trong thư viện | Người theo một họ bị bỏ |
| --- | --- | --- |
| Lệch khớp của biến thể dẫn đầu, trung vị | 0,56 | 0,71 |
| Bị gắn cờ lỏng (trên 1,25) | 0,3% | 4,5% |
| Trọng số của biến thể dẫn đầu, trung bình | 0,81 | 0,56 |
| Trang nói "Mức tin cậy cao" | 71,7% | 32,1% |

Một phần ba số người ngoài thư viện được nói là quiz chắc chắn về một biến thể mà họ không theo: biến thể ấy vượt hẳn các biến thể khác mà vẫn giải thích họ kém. Phân biệt hai nhóm không dễ: một họ láng giềng thường giải thích người ngoài gần bằng sai lệch giữa hai người chấm, nên không thống kê độ khớp tuyệt đối nào tách gọn được (diện tích dưới đường ROC: lệch khớp 0,69, Độ khớp 0,69, tương quan giữa câu trả lời và hồ sơ 0,75 nhưng kém ở phần đuôi, phần dư gộp theo khía cạnh 0,64, theo trục 0,61). Lệch khớp đơn giản nhất và tốt nhất ở chỗ cần, nên ngưỡng mới đặt trên nó: `FITS` = 0,95, phân vị 95 lệch khớp của người theo (đo trên 1.008 người theo, ba hạt giống). Với ngưỡng ấy:

- Mức tin cậy chỉ "cao" hay "khá cao" khi lệch khớp không quá `FITS`; trên đó cao nhất là "vừa".
- Chặng hỏi thêm, từ mức sàn trở đi, dừng ngay khi biến thể dẫn đầu khớp kém hơn `FITS`: hỏi thêm chỉ làm biến thể kém tệ nhất trông chắc hơn. Trọng số 0,9 chỉ được coi là đã rõ khi biến thể dẫn đầu khớp.
- Trang ghi chú rằng có thể thư viện chưa có hướng nào gần bạn hơn.

So trên cùng người chơi, độ dài hiện hành (48+), ngày 13/10/2026:

| Đo | Người theo, có trong thư viện | Người theo một họ bị bỏ |
| --- | --- | --- |
| Trang nói "Mức tin cậy cao", không có `FITS` | 75,6% | 30,1% |
| Trang nói "Mức tin cậy cao", có `FITS` | 71,1% | 18,8% |
| Khớp chưa chặt (trên 0,95) | 5,7% | 26,5% |
| Bị gắn cờ lỏng | 1,2% | 5,7% |
| Đúng biến thể, không có / có `FITS` | 88,4% / 88,4% | |

Người theo có trong thư viện mất 4,5 điểm phần trăm lời "cao", độ đúng không đổi; người ngoài thư viện nghe lời "cao" ít đi 11 điểm. Phần còn lại là người ngoài mà một họ láng giềng giải thích như người theo của chính nó: với họ, gọi tên họ láng giềng là điều tốt nhất thư viện làm được, và đợt thử với người thật sẽ cho biết bao nhiêu người như thế. `tests/quiz-simulation.test.mjs` lặp lại phép thử trên một phần ba số họ.

## Chặng hỏi thêm

Sau phần cố định (48 câu ở bản rút gọn, 72 ở bản tiêu chuẩn, 144 ở bản chuyên sâu), quiz hỏi thêm những câu chọn riêng cho từng người (`LENGTHS`, `ADAPTIVE` trong `select.ts`). Ba bản ghi là **48+**, **72+** và **144+**: phần cố định là mức sàn, không phải tổng.

| Bản | Phần cố định | Hỏi thêm |
| --- | --- | --- |
| rút gọn (`short`, 48+) | 48 | ít nhất 32, tối đa 48 |
| tiêu chuẩn (`standard`, 72+) | 72 | ít nhất 48, không trần |
| chuyên sâu (`deep`, 144+) | 144 | ít nhất 48, không trần |

Từ 13/10/2026, mức sàn của câu hỏi thêm là trần cũ (trước là 24–32 và 36–48), để quiz không kết luận về khuynh hướng của người chơi quá sớm: chưa đủ mức sàn thì không dừng, dù biến thể dẫn đầu đã giữ bao nhiêu trọng số. Qua mức sàn, quiz chỉ hỏi tiếp khi còn cần (điều kiện dừng ở dưới). Bản 72+ và 144+ không đặt trần; bản 48+ dừng ở 48 câu thêm. Bản 144+ giữ mức sàn của bản 72+, để bản dài hơn không bao giờ hỏi thêm ít câu hơn bản ngắn hơn.

Cả ba gọi tên hướng gần nhất theo cùng một cách; bản dài hơn không đổi cách tính, chỉ cho mỗi khía cạnh thêm câu trả lời và (ở bản chuyên sâu) hỏi thẳng những chủ đề mười hai trục không vẽ, nên ranh giới giữa những hướng sát nhau rõ hơn. Làm xong một bản, người chơi có thể làm tiếp thành bản dài hơn kế tiếp: những câu cố định còn thiếu, rồi chặng hỏi thêm như bản ấy hỏi.

Phần cố định được xáo theo hạt giống (`baseQuestions`), không có hai câu liền nhau cùng trục; câu chủ đề của bản chuyên sâu được chia thành những nhóm lớn bằng một trục và rải đều trong lượt, không dồn về cuối. Chặng hỏi thêm chọn câu theo **thông tin tương hỗ** giữa câu trả lời và biến thể bạn theo, trong số những biến thể đang sát nhau. Mỗi lượt:

1. Lấy các biến thể dẫn đầu cho tới khi có 40 biến thể hoặc đã giữ 99,9% trọng số (`candidates`, `coverage`), chuẩn hoá lại trọng số của chúng.
2. Với mỗi câu chưa hỏi, mỗi biến thể dự đoán xác suất của từng trong bảy câu trả lời: phân phối chuẩn quanh α + λ · m (α, λ là trung bình hậu nghiệm của bạn dưới biến thể ấy), cắt tại các nửa điểm. Độ rộng của nó gồm mọi điều còn chưa biết: NOISE² + τ² + Var(α) + m² · Var(λ) + 2m · Cov(α, λ) (`predictive`). Bản trước chỉ có NOISE² + τ² + m² · Var(λ), bỏ quên độ bất định của α và việc α với λ tương quan, nên một câu có thể trông tách biến thể mạnh hơn hay yếu hơn thực tế.
3. Điểm của câu là thông tin tương hỗ, tính bằng bit: entropy của hỗn hợp các dự đoán trừ trung bình entropy của từng dự đoán, trọng số theo biến thể. Câu nào các biến thể dẫn đầu trả lời khác nhau nhất thì điểm cao nhất.
4. Hỏi câu điểm cao nhất, chấm lại, lặp lại.

Bản trước còn cấm câu khía cạnh làm lệch cân bằng đồng ý/phản đối của trục quá một câu, để thói quen "cứ đồng ý" không hiện ra trên thanh. Thanh giờ không đọc câu hỏi thêm, còn bộ so khớp tự trừ thói quen ấy (α), nên ràng buộc ấy đã bỏ: trên cùng 336 người chơi giả, có nó đúng biến thể 86,6%, top 3 92,3%, log trọng số của biến thể thật −0,599; không có nó 86,3%, 91,1%, −0,596, tức không khác nhau ngoài nhiễu.

Dừng khi đã hỏi tới trần (chỉ bản 48+), hoặc không còn câu nào để hỏi. Chưa đủ mức sàn thì không dừng. Từ mức sàn trở đi, dừng khi biến thể dẫn đầu khớp kém hơn `FITS` (mục Khi thư viện thiếu), khi nó khớp và giữ từ 0,9 trọng số (`confident`), hoặc khi câu tốt nhất còn lại mang dưới 0,05 bit (`idle`): câu ít thông tin hơn thế không còn "cần" hỏi.

**Vì sao 0,05 bit.** Với ngưỡng cũ 0,01 và không trần, bản 72+ hỏi phần lớn người chơi đúng 48 câu thêm, nhưng một số ít bị hỏi rất lâu: hai biến thể gần như sinh đôi dẫn đầu, mỗi câu chỉ tách chúng thêm chừng 0,01–0,02 bit. Hỏi lâu như thế không làm đúng hơn, mà làm quiz chắc hơn mức nó đúng, vì dừng khi trọng số chạm 0,9 tức là chọn đúng lúc trọng số cao. Thử chéo hai người chấm, bản 72+, 336 người chơi giả, cùng người chơi cho mọi ngưỡng:

| Ngưỡng `idle` | Đúng biến thể | Trọng số TB của biến thể dẫn đầu | Câu thêm: trung bình / p90 / p99 / nhiều nhất |
| --- | --- | --- | --- |
| 0,01 | 89,9% | 0,932 | 65,8 / 135 / 253 / 267 |
| 0,02 | 89,3% | 0,903 | 56,6 / 72 / 177 / 200 |
| 0,03 | 88,7% | 0,884 | 51,1 / 48 / 128 / 168 |
| 0,05 | 90,5% | 0,884 | 48,1 / 48 / 48 / 58 |

Ở 0,05 đuôi biến mất, độ đúng không giảm (chênh lệch giữa các hàng nằm trong nhiễu của 336 người), và trọng số trung bình lại nằm dưới tỉ lệ đúng. Bản 48+ trên cùng người chơi: 0,01 cho 87,8% đúng, trung bình 35,2 câu thêm; 0,05 cho 88,4%, trung bình 32,7 câu thêm. Không trần nghĩa là quiz vẫn hỏi tiếp chừng nào còn câu mang từ 0,05 bit mà biến thể dẫn đầu chưa rõ; trên người chơi giả, điều đó hiếm khi kéo quá vài câu.

**Đo trên câu trả lời thật sự đến, không chỉ trên entropy mô hình tự tính.** Thử chéo hai người chấm, bản 48+, 336 người chơi giả, cùng người chơi và cùng câu trả lời cho ba cách tính độ rộng (đo ngày 13/10/2026, với độ dài và điều kiện dừng hiện hành):

| Độ rộng của dự đoán | Đúng biến thể | Trong top 3 | log trọng số của biến thể thật, trung bình | Bit kỳ vọng mỗi câu | Bit thực thu mỗi câu | Bit mỗi câu giữ lại, dưới biến thể thật (thực / kỳ vọng) |
| --- | --- | --- | --- | --- | --- | --- |
| Chỉ NOISE và τ | 88,7% | 91,1% | −0,653 | 0,054 | 0,042 | 2,251 / 2,417 |
| Bản trước: thêm m² · Var(λ) | 88,4% | 91,7% | −0,649 | 0,053 | 0,042 | 2,255 / 2,424 |
| Đầy đủ: thêm Var(α) và 2m · Cov(α, λ) | 88,7% | 92,0% | −0,633 | 0,053 | 0,042 | 2,259 / 2,430 |

"Bit thực thu" là log₂ của tỉ số trọng số của biến thể thật sau và trước câu trả lời; nếu dự đoán đúng, trung bình của nó bằng thông tin kỳ vọng. Cả ba cách đều hứa nhiều hơn thu được (khoảng một phần tư); hai cách có tính độ bất định của λ hứa quá ít hơn một chút. "Bit mỗi câu giữ lại" chấm dự đoán của biến thể thật, sau phần cố định, trên 60 câu chưa hỏi mỗi người: thực là bit mất trên câu trả lời thật, kỳ vọng là entropy của chính dự đoán (hỗn hợp các biến thể dẫn đầu cho cùng kết luận: 2,281, 2,285, 2,288 bit). Mọi cách đều rộng hơn cần với người chơi giả (vì họ ít nhiễu hơn NOISE giả định), nên thêm độ rộng làm điểm câu giữ lại kém đi chừng 0,004–0,008 bit mỗi câu, một mức không đáng kể.

Nói thẳng: độ đúng của ba cách không khác nhau ngoài nhiễu. Ở lần đo này cách đầy đủ giữ cho biến thể thật nhiều trọng số nhất; ở hai lần đo trước với độ dài cũ, nó lần thì hơn (89,3% so với 88,1%), lần thì kém (88,7% so với 89,3%). Cách đầy đủ được giữ vì nó là đúng dự đoán của chính mô hình, không vì nó tỏ ra đúng hơn trên người chơi giả. `simulate.ts` giữ hai phép đo này (`expectedBits`/`realisedBits` trong `simulate`, và `heldOut`), và `tests/quiz-simulation.test.mjs` giữ chúng không lệch.

## Người, đảng và nhà nước

Danh mục có 421 nhân vật, 151 đảng và 140 nhà nước. Cả 421 nhân vật đã được chấm riêng từng câu (`figure-answers.json`): với họ, câu trả lời dự kiến là chính câu đã chấm, chặt như câu mà người theo biến thể đồng thuận (`PROFILE_SD.agreed`).

**Ô trống không mang giá trị.** Khoảng 13% số ô bị người chấm bỏ trống: không có cơ sở để đoán người ấy nghĩ gì, thường vì vấn đề ấy không tồn tại vào thời họ (Khổng Tử, Lão Tử hay Cicero không có ý kiến về trí tuệ nhân tạo, công nghiệp hoá hay toàn cầu hoá). Ô trống không được điền bằng câu trả lời của biến thể hay bất cứ giá trị nào, và không vào vectơ dùng để đặt hay so khớp người ấy:

- *So khớp.* Bằng chứng của một người được tính trên những câu bạn đã trả lời mà người ấy có câu trả lời (tích phân α và λ như với biến thể, `covered` đếm số câu ấy). Mỗi câu bạn trả lời mà người ấy bỏ trống được tính bằng **mật độ điển hình** (`typicalDensity`): trung bình, trên 168 biến thể của thư viện, lôga mật độ mà mỗi biến thể cho câu trả lời ấy (ở α, λ của bạn dưới biến thể đó). Con số này không nói gì về người ấy và như nhau với mọi người, nên ô trống không giúp cũng không hại ai. Lệch khớp của người ấy chỉ tính trên các câu họ có.
- *Vị trí.* Một khía cạnh được đặt bằng trung bình vị trí các câu của chính người ấy trên khía cạnh đó (từ một câu trở lên); khía cạnh họ không có câu nào là chưa đo, trục là trung bình các khía cạnh đã đo, và trục không có khía cạnh nào là chưa đo. Trang không nêu một người ở trục họ chưa đo, và ở khía cạnh họ chưa đo thì nói thẳng là không câu nào cho biết họ nghĩ gì.

Vì sao là mật độ điển hình, không phải mật độ biên của thư viện (phân phối câu trả lời khi không biết gì về người ấy, rộng bằng độ tản của cả thư viện): mật độ biên quá rộng nên rộng lượng với câu trả lời không ai giải thích nổi. Thử trên người chơi giả (mỗi người trả lời 48 câu core cộng 30 câu ngẫu nhiên; hai lần đo, mỗi lần 421 người chơi cho mỗi dòng đầu và 200 phiếu cho mỗi dòng sau):

| Đo | Cũ: điền biến thể | Mật độ biên | Mật độ điển hình |
| --- | --- | --- | --- |
| Người chơi sinh từ câu chấm của một nhân vật, ô trống thật ra giống biến thể: nhân vật ấy đứng đầu / trong năm | 88,6% / 94,4% | 79,9% / 86,6% | 87,3% / 94,1% |
| Như trên, ô trống thật ra như một biến thể bất kỳ | 77,6% / 90,6% | 79,8% / 90,0% | 84,9% / 94,7% |
| Người theo một biến thể / pha hai biến thể: người đứng đầu bị bỏ trống trên 150 câu (nhóm này là 6,2% danh mục) | 4,5% / 2,3% | 1,0% / 0% | 3,8% / 2,3% |
| Phiếu ngẫu nhiên: như trên | 62% | 80% | 46% |

Khi giả định của cách cũ đúng, mật độ điển hình kém nó một chút (87,3% so với 88,6%, trong khoảng hai lần nhiễu); khi giả định ấy sai, mật độ điển hình hơn rõ (84,9% so với 77,6%). Với người chơi có một hướng, người bị bỏ trống nhiều không đứng đầu nhiều hơn phần của họ trong danh mục. Phiếu ngẫu nhiên, không ai giải thích được, thì ngược lại: người ít dữ liệu đứng đầu gần một nửa số lần, theo cả ba cách, vì ô đã chấm của một người chặt hơn mọi mức chung. Đã thử một mức chung cũng chặt như thế: trung bình lôga mật độ mà các nhân vật đã chấm câu ấy cho câu trả lời. Cách này nhận đúng hơn chừng một điểm và hạ dòng cuối xuống 27%. Nhưng nó đẩy người bị bỏ trống nhiều lên đầu với 12–15% người chơi có một hướng, gấp đôi phần của họ, nên không dùng.

Một người được thêm vào danh mục mà chưa chấm riêng sẽ trả lời như biến thể của họ, dời theo vị trí trục riêng của họ trong danh mục nếu có, theo chiều của từng câu: họ chưa có câu nào của riêng mình, nên biến thể là toàn bộ điều biết về họ. Vị trí trục riêng trong danh mục (87 người có) không áp vào người đã chấm riêng: vị trí của họ đọc từ chính câu trả lời của họ. Trang vẫn chọn người theo biến thể và theo trục, không xếp hạng mọi người như một bảng:

- **Ba người tiêu biểu**: mỗi người đại diện một trong các biến thể dẫn đầu, theo thứ tự các biến thể; trong các người của biến thể ấy lấy người có bằng chứng cao nhất (`representatives`).
- **Mỗi trục một người**: người đứng gần bạn nhất trên đúng trục ấy, đo theo từng khía cạnh: căn trung bình bình phương khoảng cách trên những khía cạnh của trục mà cả hai cùng đã đo (`axisGap`), và người ấy phải đo được ít nhất mọi khía cạnh bạn đã trả lời trừ một. Hai người cùng 50 trên Đối ngoại, một vì luật lệ mà can thiệp, một vì chủ quyền mà không can thiệp, không còn bị coi là đứng cùng chỗ. Những ai cách người gần nhất không quá 2,5 điểm (`AXIS_TIE`) coi như ngang nhau, khi đó chọn người có bằng chứng cao nhất trên toàn bộ câu trả lời và ưu tiên người chưa được nêu ở trục khác.

Đảng và nhà nước lấy theo biến thể dẫn đầu; biến thể chưa có đảng hay nhà nước riêng thì mượn của biến thể gần nhất cùng họ, và trang nói rõ là mượn.

## Trang kết quả

Trang kết quả xếp thành các ô (`view.ts`). Mọi lý do trên đó đều đọc ra từ chính những tổng mà bộ so khớp dùng, từng câu một (`insight.ts`), nên trang không giải thích kết quả bằng con số mà bảng xếp hạng không dùng.

- **Tiêu đề kết quả.** Biến thể dẫn đầu, kèm vòng Độ khớp và Mức tin cậy, các cờ ở mục trên, và biến thể về nhì nếu sát nút.
- **Bảy hướng gần nhất.** Xếp theo bằng chứng. Mỗi hướng không ghi phần trăm mà ghi nó đứng sau hướng đầu bao xa: trọng số của nó chia trọng số của hướng đầu (tức tỉ số khả năng giữa hai hướng), vẽ thành thanh và nói bằng lời: sát nút từ 0,5 (cùng ngưỡng `CLOSE` của lời "Sát nút" dưới kết luận), khá gần từ 0,15, dưới nữa là xa hơn (`standing`, `view.ts`). Độ khớp chỉ in một lần, trong vòng của kết luận: vì chia cho 2n, nó nén khác biệt giữa các hướng đầu còn một hai điểm, và một cột số 82%, 82%, 81% không cho biết gì. Khi từ ba hướng trở lên sát nút, ô đổi tên thành "Những hướng bạn chia sẻ quan điểm" và nói thẳng rằng thứ tự giữa chúng chỉ để tham khảo (`topHeading`). Trên la bàn ba chiều, bảy hướng này là bảy dấu đánh số theo đúng thứ tự ấy. Ảnh lưu về chỉ in năm hướng đầu cho đủ chỗ.
- **Mười hai trục.** Thanh đọc phần câu hỏi cố định (mục Điểm khía cạnh và trục). Mỗi trục ghi phía bạn nghiêng và độ mạnh bằng lời: cân bằng (lệch khỏi giữa dưới 8 điểm), hơi nghiêng (8–20), nghiêng (20–35), nghiêng mạnh (từ 35); hay "phân hoá" khi các khía cạnh của bạn ngược chiều nhau, và khi ấy thay câu mốc neo bằng lời nói rằng điểm trục là chỗ chúng bù trừ. Trục tổng hợp (Đối ngoại, Thay đổi) mang thêm một dòng ghi chú. Thanh mực kẻ từ giữa ra phía ấy; hai đầu ghi bạn đi được bao nhiêu phần đường về mỗi cực. Vạch màu là chỗ một biến thể đứng: mặc định biến thể dẫn đầu, người chơi đổi được sang một trong ba biến thể kế tiếp. Dưới thanh là câu mốc neo gần nhất của trục, rồi người đứng gần bạn nhất ở trục ấy (đo theo từng khía cạnh) và một câu cho mỗi khía cạnh: người ấy và bạn cùng hơi nghiêng về, đồng tình với hay tin chắc vào một cực (theo mức yếu hơn trong hai người), hay khác phía nhau, hay một bên đứng giữa; khía cạnh người ấy chưa từng được hỏi thì nói không câu nào cho biết họ nghĩ gì. Khía cạnh cả hai cùng đứng giữa gộp thành một câu. Ô của mỗi trục nhuốm rất nhạt màu họ của người đứng gần bạn ở trục ấy.
- **Hồ sơ một biến thể.** Mười hai trục, mỗi trục một thanh: vòng là bạn, vạch màu là biến thể, đoạn tô giữa hai dấu là khoảng cách; nhãn ghi cùng phía, ngược phía hay một bên ở giữa, và lệch bao nhiêu điểm (dưới 8 điểm là gần như trùng), hay "bạn phân hoá" ở trục mà khía cạnh của bạn ngược chiều nhau, và trục ấy không vào câu tóm tắt gần nhất, xa nhất. Kèm hai câu trả lời của bạn khớp nhất và lệch nhất với biến thể ấy.
- **Vì sao**, bốn khối, đều tính từng câu:
  - *Cùng hướng*: những câu trả lời khớp với biến thể dẫn đầu nhất so với việc không có chính kiến (dự kiến "Trung lập"), tối đa ba câu, mỗi câu từ một trục hay chủ đề khác nhau.
  - *Chỗ khác* (`partings`): những câu biến thể dẫn đầu giải thích tệ nhất, tức phần dư chuẩn hoá lớn nhất, với điều kiện bạn cách điều nó dự đoán ít nhất 1,5 điểm (`PART`); tối đa hai câu.
  - *Hơn hướng nhì*: phần chênh bằng chứng giữa hai biến thể được chia ra từng câu (`contrast`, tổng các phần cộng với một phần dư khớp đúng chênh lệch) rồi cộng theo trục hay chủ đề. Trang nêu nhóm đóng góp nhiều nhất, tỉ lệ của nó, và hai câu rõ nhất mà hai biến thể dự đoán khác nhau. Phần dư là chuyện cách bạn dùng thang hợp với biến thể nào hơn; nếu nó chiếm từ 35% trở lên thì trang nói thế. Chênh dưới 0,5 thì trang nói hai hướng ngang nhau.
  - *Cách dùng thang*: λ và α của bạn dưới biến thể dẫn đầu, bằng lời (vừa phải hơn nhiều, hơn một chút, như người theo, hay chọn hai đầu nhiều hơn; nghiêng về đồng ý hay phản đối bất kể câu). Có lời nhắc rằng quiz so khuôn mẫu chứ không so độ gắt. Khối này ẩn khi cờ "ở giữa" bật.
- **Điều làm bạn khác biệt.** Chỉ trên các trục đọc được như một vị trí (không tổng hợp, không phân hoá). Trục bạn đứng xa trung vị của thư viện nhất, kèm tỉ lệ biến thể nghiêng ít hơn bạn về phía ấy (từ 75% mới nêu); trục có nhiều biến thể nhất đứng cách bạn không quá 10 điểm (từ 30% mới nêu); và, nếu có, một cặp hiếm gặp: hai trục mà các biến thể thường giữ cùng chiều (tương quan từ 0,45) còn bạn giữ ngược lại, mỗi trục lệch từ 10 điểm, và không quá 12% biến thể cũng giữ như bạn.
- **Xa bạn nhất.** Biến thể có bằng chứng thấp nhất, và hai trục làm nên khoảng cách ấy (không tính trục bạn phân hoá).

## Chia sẻ

Kết quả đi trong phần băm của đường dẫn (`#k=…`), phần mà trình duyệt không gửi lên máy chủ nên Google Analytics không bao giờ thấy câu trả lời hay kết quả; chỉ có sự kiện đếm lượt, không kèm nội dung (`share.ts`, `app.ts`).

Phiên bản 3 (từ 1/10/2026) mang chính các câu trả lời, nên đường dẫn dựng lại đúng kết quả người gửi thấy, kể cả các câu bỏ qua và các cờ. Dạng đường dẫn là `#k=3.<phiên bản hồ sơ>.<câu trả lời>`. Phiên bản hồ sơ (`profiles.json`) viết hệ 36. Phần câu trả lời, theo bit: số hiệu câu lớn nhất (10 bit), rồi mỗi số từ 1 tới đó một bit cho biết câu ấy có được trả lời không, rồi mỗi câu đã trả lời 3 bit (giá trị cộng 3) theo thứ tự số hiệu; mã hoá base64url. Một bản 72+ khoảng 140 ký tự.

Nếu từ lúc tạo liên kết, hồ sơ đã được cập nhật (phiên bản khác) hoặc có câu đã bỏ, kết quả được tính lại bằng dữ liệu hiện hành và trang nói rõ là có thể khác đôi chút. Liên kết quá ít câu trả lời không dựng được kết quả; trang báo thế.

Liên kết phiên bản 1 (12 điểm trục) và 2 (tổng theo khía cạnh) vẫn được nhận ra nhưng **không dựng lại**: chúng được tạo cho thang năm bậc và bộ so khớp đã thay, nên dựng lại sẽ cho một kết quả mà người gửi chưa từng thấy. Trang báo liên kết thuộc phiên bản trước và mời làm lại quiz.

La bàn ba chiều (`compass.ts`), dựng quanh la bàn hai chiều quen thuộc: **Kinh tế** = trung bình Kinh tế và Phân phối (Định hướng 0, Tự do kinh tế 100); **Cai trị** = 100 trừ trung bình Quyền lực và Tự do (Mềm mỏng 0, Cứng rắn 100); **Thay đổi** = trục Thay đổi (Bảo thủ 0, Cách mạng 100). Nhìn thẳng mặt trước là la bàn hai chiều cũ (tả hữu kinh tế, và độc đoán ở trên); chiều sâu là thái độ trước thay đổi. Khối chỉ gộp năm trong mười hai trục nên một chấm sát bạn trong khối vẫn có thể xa bạn ở những trục khác; chấm càng đậm càng đứng cao trong bảng xếp hạng trên mọi câu trả lời. Trang đầu vẽ cùng khối ấy với cả thư viện, chưa có người chơi.

## Hằng số

| Hằng số | Giá trị | Ý nghĩa | Chỉnh lại khi |
| --- | --- | --- | --- |
| NOISE | 1,3 | Độ tản của một câu quanh điều truyền thống của người chơi sẽ trả lời (bậc) | Thử nghiệm: từ phần dư thực |
| PROFILE_SD | 0,6; 1,5; 2,2 | Độ lỏng của ràng buộc: người theo đồng thuận, lỏng (`split`), chưa chấm | Thử nghiệm |
| SCALE_USE | 0,75; 0,35 | Trung bình và độ lệch chuẩn của λ, cách người chơi dùng thang | Thử nghiệm: từ λ thực |
| ACQUIESCENCE | 0,4 | Độ lệch chuẩn của α, thói quen nghiêng về đồng ý (bậc) | Thử nghiệm |
| TEMPERATURE | 1 | Bằng chứng chia cho số này trước khi thành trọng số | Để trọng số trung bình của biến thể dẫn đầu không vượt tỉ lệ đoán đúng |
| DISAGREE | 2 | Hai người chấm chênh từ ngần này thì ô là lỏng | Khi có thêm người chấm |
| MIN_AXES, MIN_FACETS, MIN_ANSWERS | 10, 24, 36 | Đủ câu trả lời để ra kết quả | Hiếm khi |
| CENTRE | 10 | Dưới ngần này điểm lệch khỏi tâm thì "ở giữa" | Thử nghiệm |
| LOOSE | 1,25 | Lệch khớp của biến thể dẫn đầu quá ngần này thì "lỏng" | Thử nghiệm |
| FITS | 0,95 | Lệch khớp quá ngần này thì "khớp chưa chặt": Mức tin cậy không quá "vừa", chặng hỏi thêm dừng ở mức sàn | Thử nghiệm: phân vị 95 lệch khớp của người được nhận đúng |
| SCATTERED | 36 | Độ tản quá ngần này điểm thì "mâu thuẫn" | Thử nghiệm |
| CLOSE | 0,5 | Về nhì có từ ngần này trọng số của dẫn đầu thì "sát nút" | Thử nghiệm |
| LENGTHS | 48 + 32..48; 72 + 48.. | Phần cố định, mức sàn và trần câu hỏi thêm của hai bản (72+ không trần) | Thử nghiệm |
| ADAPTIVE | 0,9; 40; 0,999; 0,05 | Ngưỡng dừng theo trọng số, số biến thể xét, phần trọng số bao phủ, số bit một câu phải mang để còn đáng hỏi sau mức sàn | Mô phỏng |
| PART | 1,5 | Câu trả lời lệch từ ngần này bậc mới tính là "chỗ khác" | Hiếm khi |
| LEAN | 8, 20, 35 | Ngưỡng hơi nghiêng, nghiêng, nghiêng mạnh (điểm) | Hiếm khi |
| AXIS_TIE | 2,5 | Hai người cách nhau không quá ngần này điểm trên một trục coi như ngang nhau | Hiếm khi |
| MAX_FACET_DRIFT | 10 | Khía cạnh ghi riêng được kéo trung bình trục lệch tối đa ngần này điểm | Hiếm khi |
| DIVIDED | 20 | Các khía cạnh của một trục ngược chiều nhau, mỗi bên cách giữa từ ngần này điểm, thì trục "phân hoá" | Hiếm khi |
| LENGTH_SHARE | 0,5 | Trả lời từ ngần này phần tầng long (rồi tầng deep) thì thanh đọc phần cố định của bản 72+ (rồi 144+) | Hiếm khi |
| COHERENT, LINKED | 0,7; 0,3 | Cronbach α của ba khía cạnh, và tương quan thấp nhất giữa hai khía cạnh, dưới ngần này thì trục là tổng hợp | Thử nghiệm: tính lại trên câu trả lời thật |

## Mô phỏng

`simulate.ts` cho người chơi giả làm cả quiz: phần cố định, rồi chặng hỏi thêm. Mỗi người theo một biến thể nhưng trả lời từ một nguồn `truth` (mặc định là câu trả lời dự kiến của chính mô hình): họ lệch khỏi truyền thống ở từng câu (độ lệch riêng 0,9 bậc, thêm 1,2 ở ô lỏng), dùng thang mạnh yếu khác nhau (λ ~ N(0,7; 0,25²)), nghiêng về đồng ý (α ~ N(0; 0,4²)), thêm nhiễu 0,7 bậc, và bỏ qua 2% số câu. Mọi giả định của bộ chấm đều bị người giả phá.

**Thử chéo hai người chấm.** Để không tự chấm bài của chính mình, người chơi được sinh từ hồ sơ của một người chấm, còn bộ so khớp chỉ dùng mô hình dựng từ hồ sơ của người kia, theo cả hai chiều (A sinh, B so; B sinh, A so). Khoảng cách giữa hai người đọc cẩn thận cùng một biến thể đứng thay cho khoảng cách giữa hồ sơ và một người theo thật.

Mỗi người chơi giả có dòng số ngẫu nhiên riêng, gieo từ hạt giống, biến thể và thứ tự của họ (`playerStream`). Trước 13/10/2026 mọi người chơi dùng chung một dòng, nên đổi độ dài chặng hỏi thêm của một người làm đổi câu trả lời của mọi người sau, và hai phiên bản mã không được đo trên cùng người chơi: chỉ riêng việc ấy đã xê dịch các tỉ lệ ở phần cố định tới 5–8 điểm, dù bộ so khớp phần cố định không đổi.

Hiệu chỉnh ngày 13/10/2026: mỗi biến thể một người cho mỗi chiều, tổng 336 người chơi mỗi bản. Kết quả chính là biến thể dẫn đầu.

| Đo | 48+ | 72+ |
| --- | --- | --- |
| Đúng biến thể | 88,4% | 90,5% |
| Biến thể đúng trong top 3 | 93,2% | 94,4% |
| Đúng họ | 90,5% | 92,6% |
| Trọng số trung bình của biến thể dẫn đầu | 0,860 | 0,885 |
| Mức tin cậy "cao" | 71,1% | 77,4% |
| Khớp chưa chặt / lỏng | 5,7% / 1,2% | 4,8% / 0,9% |
| Số câu hỏi trung bình | 80,7 | 120,1 |
| Bit kỳ vọng / thực thu mỗi câu hỏi thêm | 0,050 / 0,043 | 0,024 / 0,018 |

Trọng số trung bình nằm dưới tỉ lệ đoán đúng ở cả hai bản: quiz không tỏ ra chắc hơn mức nó đúng. Vì thế TEMPERATURE giữ nguyên ở 1 (lần hiệu chỉnh 6/10/2026 cũng cho thấy trong khoảng 0,5 đến 6, giá trị 1 cho lôga khả năng cao nhất của biến thể thật). `tests/quiz-simulation.test.mjs` chạy lại thử chéo ở cỡ nhỏ và giữ các con số này không tụt khi sửa mã hay dữ liệu.

NOISE giữ ở 1,3. Số liệu về cờ "lỏng" và "mâu thuẫn" nằm ở mục Khi quiz không kết luận.

### So với các cách xếp khác

`baselines.ts` giữ ba cách xếp khác chỉ để đo, trên đúng những người chơi giả ấy (người của B so trên mô hình của A, mỗi biến thể một người). Trang không dùng chúng.

- **twelveAxes**: điểm tổng hợp theo kiểu 12axes, gồm các số hạng bậc hai theo từng trục, cosin tăng cường, độ lớn và ngoại lệ, tính trên dữ liệu của chính La bàn, không dùng dữ liệu của họ.
- **facets**: trung bình khía cạnh: co hồ sơ về tâm theo cường độ khớp nhất, như bộ so khớp của phiên bản trước.
- **nearest**: biến thể có câu trả lời dự kiến gần câu trả lời của bạn nhất.

Mỗi hàng là đúng biến thể ở vị trí đầu / trong ba vị trí đầu, tính bằng %:

| Điều kiện | La bàn | twelveAxes | facets | nearest |
| --- | --- | --- | --- | --- |
| 48+, chỉ 48 câu cố định | 58,9 / 79,8 | 38,1 / 61,3 | 51,8 / 74,4 | 42,9 / 64,9 |
| 48+, có hỏi thêm chọn riêng | 87,5 / 92,9 | 46,4 / 62,5 | 70,8 / 86,3 | 53,6 / 72,0 |
| 48+, 48 câu cố định cộng cùng số câu thêm ngẫu nhiên | 73,8 / 82,1 | 42,3 / 61,3 | 54,2 / 82,1 | 47,0 / 69,0 |
| 72+, chỉ 72 câu cố định | 69,6 / 86,9 | 47,6 / 69,0 | 69,6 / 88,1 | 60,7 / 76,2 |
| 72+, có hỏi thêm chọn riêng | 89,9 / 94,6 | 53,0 / 68,5 | 78,6 / 92,9 | 61,9 / 75,0 |
| 72+, 72 câu cố định cộng câu thêm ngẫu nhiên | 80,4 / 88,7 | 50,6 / 70,2 | 70,8 / 88,1 | 58,3 / 73,8 |

Nói thẳng: phần lớn mức lợi đến từ chặng hỏi thêm. Chỉ với phần cố định, La bàn hơn hẳn ở 48+, nhưng ở 72+ trung bình khía cạnh ngang La bàn ở vị trí đầu (69,6) và nhỉnh hơn ở top 3 (88,1 so với 86,9); qua năm hạt giống, thứ tự hai cách này ở phần cố định của 72+ đổi qua đổi lại, nên ở đó chúng ngang nhau. Chọn câu hỏi thêm theo thông tin tăng thêm gần 14 điểm so với cùng số câu thêm ngẫu nhiên ở 48+ (87,5 so với 73,8), và gần 10 điểm ở 72+ (89,9 so với 80,4). Mỗi tỉ lệ ở đây là trên 168 người, nên một người là 0,6 điểm và nhiễu thường cỡ 3 điểm.

### Giới hạn

- Người chơi giả được sinh từ chính hồ sơ của hai người chấm, nên đây là giới hạn trên. Người thật có thể nằm giữa các hồ sơ, hoặc đứng ở chỗ không biến thể nào chiếm.
- Hai người chấm đều là mô hình ngôn ngữ, và phần chấm sau 6/10/2026 dùng mô hình rẻ hơn. Họ có thể sai giống nhau, nên đồng thuận cao chưa chứng minh là đúng.
- Câu trả lời dự kiến là câu một người theo cam kết sẽ chọn, không phải điều mọi người tự nhận theo biến thể ấy nghĩ.
- Đợt thử với người thật mới là phép đo quyết định.

## Thử nghiệm và hiệu chỉnh

Thử nghiệm qua Google Form quyết định quiz có chính xác hay không. Mục tiêu:

- Mỗi trục: Cronbach α ≥ 0,7; tương quan câu–tổng ≥ 0,3 (câu thấp hơn thì sửa hoặc bỏ).
- Làm lại sau hai tuần: tương quan ≥ 0,8.
- Ít nhất 70% người làm thấy biến thể được nêu tên là đúng với mình.

Từ dữ liệu thử nghiệm sẽ ước lượng lại NOISE, SCALE_USE, ACQUIESCENCE và PROFILE_SD, đặt TEMPERATURE sao cho mức tin cậy khớp tỉ lệ đúng thực tế, và tìm những câu mà người thật trả lời khác hồ sơ một cách hệ thống (để sửa câu hỏi hoặc sửa hồ sơ, rồi biên dịch lại `profiles.json`).

## Thêm một biến thể

1. Chọn họ, thêm biến thể vào `library/<họ>.json` với `status: "draft"`: tên, tóm tắt, người tiêu biểu, thời kỳ, và hồ sơ biên tập 12 trục.
2. Thêm mã ngắn cho biến thể vào `ratings/codes.json`.
3. Để cả hai người chấm, độc lập, chấm biến thể ấy trên mọi câu của ngân hàng, đúng quy tắc ở mục Hồ sơ từ hai người chấm: người cam kết, theo hoàn cảnh nước mình, ±3 chỉ cho cam kết giáo lý, `split` ở chỗ bị chia rẽ, kèm ghi chú cho những đáp án ít hiển nhiên.
4. Chạy `node scripts/quiz-profiles.mjs`. Tập lệnh báo ô còn thiếu, mức đồng thuận, và tăng phiên bản của `profiles.json`.
5. Chạy `node --test tests/quiz-*.test.mjs`. Nếu biến thể mới hay bị nhầm với một biến thể khác, hoặc hai hồ sơ ấy gần nhau thật và nên gộp, hoặc ngân hàng thiếu câu tách được chúng; khi ấy thêm câu chủ đề hay câu khía cạnh, và nhờ hai người chấm chấm câu mới cho cả thư viện.
