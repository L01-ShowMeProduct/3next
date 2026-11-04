# 3Next Backend

REST API cho 3Next, viết bằng NestJS 11 (TypeScript), lưu dữ liệu trong **PostgreSQL**, đăng nhập bằng **email + mật khẩu (JWT)**. Có **Swagger Docs** để thử API trực tiếp tại `/docs`.

> Giải thích chi tiết (schema, auth, deploy, nhật ký): xem [`docs/backend/`](../docs/backend/README.md).

## Các collection

| Collection | Vai trò | Endpoint chính |
|---|---|---|
| **Auth** | Đăng ký, đăng nhập, làm mới token, đăng xuất | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `GET /auth/me` |
| **Captures** | Nhận một câu (gõ hoặc nói), AI tách thành các task nháp, người dùng xác nhận hoặc bỏ qua | `POST /captures`, `POST /captures/{id}/confirm`, `DELETE /captures/{id}`, `GET /captures`, `GET /captures/{id}` |
| **Tasks** | Quản lý task và lấy các việc nên làm tiếp | `POST /tasks`, `GET /tasks`, `GET /tasks/top`, `GET /tasks/{id}`, `PATCH /tasks/{id}`, `POST /tasks/{id}/complete`, `DELETE /tasks/{id}` |

Ngoài ra có `GET /health` để kiểm tra server và database.

**Tasks và Captures cần header `Authorization: Bearer <accessToken>`** và chỉ thấy dữ liệu của tài khoản đang đăng nhập.

Luồng chính của sản phẩm tương ứng với các API:

1. `POST /auth/login` (hoặc `/auth/register`) lấy `accessToken` và `refreshToken`.
2. `POST /captures` với `{"text": "Thứ 6 nộp báo cáo, mai họp nhóm lúc 9 giờ"}` nhận về các task nháp.
3. `POST /captures/{id}/confirm` để lưu (gửi body rỗng, hoặc gửi `tasks` đã sửa).
4. `GET /tasks/top` lấy Top 3 việc nên làm tiếp, kèm điểm và lý do.
5. `POST /tasks/{id}/complete` đánh dấu xong, việc đó rời khỏi Top 3.
6. Access token hết hạn sau 15 phút (`401`): gọi `POST /auth/refresh` lấy cặp token mới.

## Chạy trên máy

Cần **Node.js 20+** và **Docker Desktop**.

```bash
# ở thư mục gốc repo: bật PostgreSQL
docker compose up -d db

cd backend
npm install
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
npm run start:dev      # http://localhost:3000, Swagger ở http://localhost:3000/docs
```

Lần đầu khởi động, server tự tạo bảng và tài khoản demo `demo@3next.app` / `demo12345`.

| Lệnh | Việc |
|---|---|
| `npm run start:dev` | Chạy dev, tự reload khi sửa code |
| `npm test` | Unit test + e2e (e2e cần Postgres và `TEST_DATABASE_URL`, không có thì tự bỏ qua) |
| `npm run build` / `npm run start:prod` | Build ra `dist/` / chạy bản đã build |
| `npm run migration:run` | Chạy migration còn thiếu (server cũng tự chạy khi khởi động) |
| `npm run migration:revert` | Quay lại migration gần nhất |
| `npm run migration:generate -- src/database/migrations/TenThayDoi` | Sinh migration từ thay đổi trong entity |
| `npm run migration:show` | Xem migration nào đã chạy |

## Biến môi trường

Xem đầy đủ trong `.env.example`.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | Cổng server |
| `DATABASE_URL` | (bắt buộc) | Chuỗi kết nối PostgreSQL |
| `DATABASE_SSL` | `false` | Bật SSL khi nối database cloud từ ngoài |
| `DB_RUN_MIGRATIONS` | `true` | Tự chạy migration khi khởi động |
| `JWT_SECRET` | khóa dev | **Bắt buộc trên production**, tối thiểu 32 ký tự |
| `JWT_ACCESS_TTL_SECONDS` | `900` | Thời gian sống của access token |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Thời gian sống của refresh token |
| `SEED_DEMO_DATA` | `false` | Tạo tài khoản demo kèm task mẫu |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | `demo@3next.app` / `demo12345` | Tài khoản demo. Production phải tự đặt mật khẩu, không thì bỏ qua seed. |
| `TEST_DATABASE_URL` | trống | Database riêng cho test e2e (tên phải có chữ `test`) |

## Cách hoạt động

- **Tách câu (`src/captures/parser`)**: bộ quy tắc cho tiếng Việt, hiểu "hôm nay", "mai", "mốt", "thứ 2 đến chủ nhật", "tuần sau", ngày `dd/mm`, giờ như "9 giờ", "7h30", "3 giờ chiều", cùng từ khóa ưu tiên như "gấp", "không gấp". Câu không có mốc thời gian thì deadline để trống, không tự đoán. Múi giờ Việt Nam (UTC+7). Đây là bản heuristic, chưa dùng LLM, có thể thay bằng LLM mà không đổi API.
- **Xếp hạng (`src/tasks/ranking.ts`)**: điểm = độ gấp của deadline (tối đa 100, quá hạn là cao nhất) + trọng số ưu tiên (cao 30, trung bình 15, thấp 0). Mỗi việc trong Top 3 kèm lý do bằng tiếng Việt.
- **Lưu trữ**: PostgreSQL qua TypeORM. Schema chỉ đổi qua migration (`src/database/migrations`). Xem [`docs/backend/02-database.md`](../docs/backend/02-database.md).
- **Đăng nhập**: access token JWT 15 phút + refresh token 30 ngày có rotation. Xem [`docs/backend/03-auth.md`](../docs/backend/03-auth.md).
- **Kiểm tra dữ liệu**: dữ liệu sai trả `400`, chưa đăng nhập trả `401`, không tìm thấy (hoặc thuộc tài khoản khác) trả `404`, trùng email hoặc xác nhận capture hai lần trả `409`, câu không tách được việc nào trả `422`.

## Deploy

### Render (miễn phí)

Repo có sẵn `render.yaml` ở thư mục gốc, tạo cả web service lẫn PostgreSQL.

1. Vào https://dashboard.render.com, chọn **New**, rồi **Blueprint**.
2. Kết nối GitHub và chọn repo `L01-ShowMeProduct/3next`, chọn nhánh chứa code backend.
3. Nhập `DEMO_PASSWORD` khi được hỏi (hoặc để trống nếu không cần tài khoản demo), bấm **Apply**.
4. Swagger Docs nằm ở `<địa chỉ>/docs`. `/health` phải trả `"database": "ok"`.

Lưu ý gói free: web service tự tắt sau khoảng 15 phút không dùng (mở lại mất khoảng 1 phút); **Postgres free hết hạn 30 ngày sau khi tạo**. Chi tiết và cách dùng Postgres bên ngoài: [`docs/backend/05-chay-va-deploy.md`](../docs/backend/05-chay-va-deploy.md).

### Docker

```bash
# ở thư mục gốc repo: chạy cả database và backend trong container
docker compose --profile api up --build
```
