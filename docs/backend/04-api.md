# 04 · API

Swagger đầy đủ (có thể bấm thử) ở `http://localhost:3000/docs` khi chạy local.

## Endpoint

### Công khai (không cần token)

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/health` | Server và database còn sống. Trả `503` nếu không nối được database. |
| `POST` | `/auth/register` | Đăng ký, trả luôn cặp token (`201`) |
| `POST` | `/auth/login` | Đăng nhập (`200`) |
| `POST` | `/auth/refresh` | Đổi refresh token lấy cặp mới (`200`) |
| `POST` | `/auth/logout` | Thu hồi refresh token của thiết bị này (`204`) |

### Cần `Authorization: Bearer <accessToken>`

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/auth/me` | Thông tin tài khoản |
| `POST` | `/auth/logout-all` | Đăng xuất mọi thiết bị (`204`) |
| `POST` | `/captures` | Gửi một câu, nhận task nháp |
| `GET` | `/captures` | Danh sách capture (lọc `?status=`) |
| `GET` | `/captures/{id}` | Chi tiết |
| `POST` | `/captures/{id}/confirm` | Lưu task nháp thành task thật (body rỗng hoặc `tasks` đã sửa) |
| `DELETE` | `/captures/{id}` | Bỏ qua capture |
| `POST` | `/tasks` | Tạo task trực tiếp |
| `GET` | `/tasks` | Danh sách (lọc `?status=&priority=`) |
| `GET` | `/tasks/top` | Top N việc nên làm tiếp (`?limit=1..10`, mặc định 3) |
| `GET` | `/tasks/{id}` | Chi tiết |
| `PATCH` | `/tasks/{id}` | Sửa (gửi `deadline: null` để xóa deadline) |
| `POST` | `/tasks/{id}/complete` | Đánh dấu xong |
| `DELETE` | `/tasks/{id}` | Xóa (`204`) |

Mọi endpoint của Tasks và Captures chỉ thấy dữ liệu của tài khoản đang đăng nhập.

### Ví dụ response đăng nhập

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "refreshToken": "6f1c...-...-....Zx8kQ...",
  "user": { "id": "7c0f4f6e-...", "email": "khoa@hcmut.edu.vn", "displayName": "Khoa", "createdAt": "2026-11-04T..." }
}
```

## Mã lỗi

| Mã | Khi nào |
|---|---|
| `400` | Dữ liệu sai định dạng, có trường lạ trong body (kể cả `userId`), id không phải UUID |
| `401` | Thiếu token, token sai/hết hạn, sai email hoặc mật khẩu, refresh token đã dùng |
| `404` | Không tìm thấy, **hoặc thuộc về tài khoản khác** |
| `409` | Email đã đăng ký; capture đã xác nhận/bỏ qua rồi |
| `422` | Câu gửi lên không tách được việc nào |
| `503` | `/health` không nối được database |

## Thay đổi phá vỡ

So với bản lưu RAM trước đó (commit `c4be97f`):

1. **Tasks và Captures bắt buộc có token.** Gọi như cũ sẽ nhận `401`.
2. **Dữ liệu tách theo tài khoản.** Không còn danh sách task dùng chung cho mọi người.
3. `SEED_DEMO_DATA=true` giờ tạo **tài khoản demo** (`demo@3next.app`) kèm 4 task, thay vì 4 task dùng chung. Máy dev mật khẩu mặc định là `demo12345`. Trên production phải tự đặt `DEMO_PASSWORD`, không đặt thì bỏ qua không seed.
4. `/health` có thêm trường `database`. Trường `service: "3next-backend"` giữ nguyên vì widget dựa vào nó để nhận biết API.

Định dạng JSON của task và capture **không đổi**.

### Ảnh hưởng tới widget Android (`android-widget/`)

`NextBackend` trong `Api.kt` gọi `GET /tasks/top`, `POST /tasks/{id}/complete`, `POST /captures` không kèm token, nên với backend mới sẽ nhận `401`. Cần thêm:

- Màn hình (hoặc ô nhập) đăng nhập trong `MainActivity`, gọi `POST /auth/login`.
- Lưu `refreshToken` trong `Prefs` (tốt nhất là `EncryptedSharedPreferences`).
- `ApiClient.request` gắn header `Authorization`, gặp `401` thì refresh một lần rồi thử lại.

Phần này chưa làm vì thuộc phạm vi widget. Trong lúc chờ, widget vẫn chạy được nếu trỏ vào bản backend cũ.
