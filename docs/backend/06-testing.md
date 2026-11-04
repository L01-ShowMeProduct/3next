# 06 · Testing

## Chạy

```bash
docker compose up -d db     # cần cho test e2e
cd backend
npm test
```

`npm test` đọc `TEST_DATABASE_URL` trong `backend/.env`. Không có biến này thì **test e2e tự bỏ qua**, chỉ chạy unit test, nên ai chưa cài Docker vẫn chạy được.

Kết quả lần chạy gần nhất: **4 suite, 47 test, tất cả pass** (PostgreSQL 16).

## Chốt an toàn

Test e2e `TRUNCATE` toàn bộ bảng trước mỗi test. Để không lỡ xóa dữ liệu thật, test **từ chối chạy** nếu tên database trong `TEST_DATABASE_URL` không chứa chữ `test`, hoặc trùng với `DATABASE_URL`.

## Có gì trong bộ test

| File | Loại | Kiểm tra |
|---|---|---|
| `src/tasks/ranking.spec.ts` | Unit | Công thức Top 3 (giữ nguyên từ trước) |
| `src/captures/parser/vi-task-parser.spec.ts` | Unit | Tách câu tiếng Việt (giữ nguyên) |
| `src/config/env.spec.ts` | Unit (mới) | Thiếu `DATABASE_URL`, `JWT_SECRET` yếu trên production, không dùng mật khẩu demo mặc định trên production, số sai định dạng |
| `test/api.e2e.spec.ts` | E2E trên Postgres thật | Toàn bộ API qua HTTP |

### Test e2e mới thêm

**Auth**
- Đăng ký trả token, email được chuẩn hóa (khoảng trắng, chữ hoa), không lộ mật khẩu.
- Trùng email (khác hoa thường) → `409`.
- Sai mật khẩu và email không tồn tại trả cùng thông báo.
- Không token / token rác / dùng refresh token thay access token → `401`.
- Refresh đổi token; dùng lại token đã rotate → thu hồi mọi phiên.
- Đăng xuất điện thoại không ảnh hưởng laptop; `logout-all` thu hồi hết.

**Cô lập dữ liệu**
- User B không thấy, không sửa, không hoàn thành, không xóa được task của A (đều `404`), Top 3 của B rỗng.
- User B không đọc, không xác nhận, không bỏ qua được capture của A.
- Gửi `userId` trong body để gán task cho người khác → `400`.

**Đồng thời và lưu bền**
- 4 request xác nhận cùng một capture cùng lúc: đúng 1 cái `200`, 3 cái `409`, không có task trùng.
- Tắt và bật lại server: tài khoản và task vẫn còn, đăng nhập lại (như đổi thiết bị) thấy đủ task.

Toàn bộ test Tasks và Captures cũ được giữ lại, chỉ thêm bước đăng nhập.

## Kiểm tra schema khớp entity

Sau khi sửa entity hoặc migration:

```bash
npm run migration:generate -- src/database/migrations/Check
```

Báo "No changes in database schema were found" là khớp. Nếu nó sinh ra file thì entity và migration đang lệch nhau: đọc file đó để biết lệch chỗ nào, rồi xóa nó đi (hoặc giữ lại nếu đó đúng là thay đổi bạn muốn).
