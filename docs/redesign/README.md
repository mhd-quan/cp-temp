# Ấn bản: tái thiết kế The Cochinchine Pensées

1. [Đánh giá](01-danh-gia.md): trang live và bản r12, 14 phát hiện xếp theo mức độ, chẩn đoán nguyên nhân.
2. [Đề xuất hệ thống Ấn bản](02-de-xuat-he-thong-an-ban.md): nguyên tắc, typography, Sáu mực, bản in, bố cục, thành phần, chuyển động, tiếp cận, lời.
3. [Kế hoạch hành động](03-ke-hoach-hanh-dong.md): quyết định cần bạn, bảy giai đoạn, tiêu chí nghiệm thu, rủi ro.
4. [MVP trang chủ](04-mvp-trang-chu.md): tính năng, tệp, kiểm chứng, giới hạn (vòng 1).
5. [Vòng 2](05-vong-2.md): phản hồi → điều chỉnh, khảo sát font, bố cục mới, trang đọc.
6. [Vòng 3](06-vong-3.md): Pliego + Mona Sans, bộ glyph Ấn ký, in bản khắc bằng GPU, trích đoạn, điểm sách, 13 trang phụ, chuyển trang.
7. [Vòng 4](07-vong-4.md): kệ sách, tờ trích, menu điện thoại, footer theo menu, chuyện chuyển động, hiệu năng trước/sau.
8. [Vòng 5](08-vong-5.md): đèn đọc thay "ấn lại", kệ trượt vẽ bằng bóng, menu góc phải với nút "Nhận bài mới" ở chân, giao diện ba dòng, thanh đọc căn giữa.
9. [Vòng 6](09-vong-6.md): menu đóng không lóe (và đóng như mở chạy ngược), đèn đọc viết lại (nhẹ, rộng, không hở), prerender và ảnh đứng tạm cho lật trang, bốn kiểu chữ đọc (có Lexend cho người khó đọc), vật liệu trong mờ chung cho menu và các bảng.
10. [v1.1](10-v1-1.md): một thang chữ cho cả tập san (nhãn và tag nhỏ lại), masthead điện thoại dạng lockup, module nối liền thay vì ngắt trang, thanh trên một tấm với thanh trạng thái Safari 26 và trượt theo cuộn, sửa nền Rêu, cuộn không còn đánh thức hover, ảnh Chuyên đề nhẹ và sẵn sàng sớm, mọi chuyển động có vào có ra.
11. [v1.1.1](11-v1-1-1.md): hiệu năng, không đổi thiết kế. Hover chờ bàn tay động (không còn đánh thức khi trang cuộn dưới chuột đứng yên), tải trước theo ý định, bản in bìa không bị ẩn, bản in ngoài tầm mắt đặt ngay, font cố định trục không dùng (Pensees Sans), chuỗi fallback gọn. **Tài liệu hiện hành** (thiết kế: xem 10).

Chuyển động (từ v1.2.1, bổ sung ở v1.2.2): [docs/motion.md](../motion.md), chuẩn cho đường cong, thời lượng, đường vào và đường ra, cách nhấn, và lần khắc tên duy nhất.

Trang chủ: `/`. Màu: `node scripts/edition-palette.mjs`. Trang chủ cũ (`/r12`) và trang nhận diện Chàm & khoáng (`/identity`) đã gỡ cùng toàn bộ giao diện kế thừa; xem lịch sử git nếu cần đối chiếu.
