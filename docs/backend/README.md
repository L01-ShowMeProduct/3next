# Backend & Data — ghi chú kỹ thuật

Thư mục này ghi lại chi tiết những gì đã làm cho phần **Backend & Data** của 3Next: vì sao chọn như vậy, chạy thế nào, và những chỗ các bạn khác (mobile, widget, AI) cần biết.

> Code nằm trong `backend/`. Hướng dẫn chạy nhanh xem `backend/README.md`. Thư mục này là phần giải thích sâu hơn.

## Đọc theo thứ tự

| File | Nội dung |
|---|---|
| [01-kien-truc.md](01-kien-truc.md) | Stack, các module, một request đi qua những đâu |
| [02-database.md](02-database.md) | Schema PostgreSQL, sơ đồ bảng, quy trình migration |
| [03-auth.md](03-auth.md) | Đăng ký, đăng nhập, access/refresh token, cách client nên gọi |
| [04-api.md](04-api.md) | Danh sách endpoint, mã lỗi, **thay đổi phá vỡ** so với bản cũ |
| [05-chay-va-deploy.md](05-chay-va-deploy.md) | Chạy trên máy bằng Docker, deploy Render, giới hạn gói free |
| [06-testing.md](06-testing.md) | Bộ test, cách chạy, test đang kiểm tra những gì |
| [nhat-ky.md](nhat-ky.md) | Nhật ký làm việc theo từng bước, kể cả các bug tìm ra dọc đường |

## Tóm tắt một dòng

Backend NestJS giờ lưu dữ liệu trong **PostgreSQL** (TypeORM + migration) thay vì RAM, có **đăng nhập email + mật khẩu (JWT)**, mỗi task/capture thuộc về một tài khoản, nên đổi điện thoại hay xóa app vẫn còn dữ liệu.

## Việc người khác cần làm theo

- **Mobile (React Native)**: thêm màn hình đăng nhập/đăng ký, lưu token, gắn header `Authorization`. Xem [03-auth.md](03-auth.md#cách-client-mobile-nên-làm).
- **Widget Android**: bản hiện tại gọi API không kèm token nên sẽ nhận `401`. Cần thêm đăng nhập. Xem [04-api.md](04-api.md#thay-đổi-phá-vỡ).
- **AI**: parser vẫn nằm ở `backend/src/captures/parser`, hợp đồng `ParsedTask` không đổi, thay bằng LLM không cần đụng tới database.
