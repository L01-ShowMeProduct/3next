# 05 · Chạy trên máy và deploy

## Chạy trên máy (Windows / macOS / Linux)

Cần: **Node.js 20+** và **Docker Desktop**.

```bash
# 1. Bật PostgreSQL (ở thư mục gốc repo). Lần đầu tự tạo thêm database next3_test cho test.
docker compose up -d db

# 2. Cài và cấu hình backend
cd backend
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env

# 3. Chạy. Lần đầu server tự tạo bảng (migration) và tài khoản demo.
npm run start:dev
```

Mở `http://localhost:3000/docs`, đăng nhập bằng `demo@3next.app` / `demo12345` hoặc tự đăng ký.

Muốn chạy cả backend trong container (không cần cài Node):

```bash
docker compose --profile api up --build
```

### Lỗi hay gặp

| Triệu chứng | Nguyên nhân / cách sửa |
|---|---|
| `Thiếu DATABASE_URL` | Chưa tạo `backend/.env`. Copy từ `.env.example`. |
| `ECONNREFUSED 127.0.0.1:5432` | Postgres chưa chạy: `docker compose up -d db`, chờ vài giây. |
| Cổng 5432 đã bị chiếm | Máy đã cài Postgres riêng. Tắt nó đi, hoặc đổi `"5432:5432"` thành `"5433:5432"` trong `docker-compose.yml` và sửa `DATABASE_URL` thành `...localhost:5433/...`. |
| `database "next3_test" does not exist` | Volume Postgres được tạo trước khi có file init. Chạy `docker exec 3next-db createdb -U next next3_test`. |
| Muốn xóa sạch dữ liệu làm lại | `docker compose down -v` (mất hết dữ liệu local) rồi `docker compose up -d db`. |
| `dist/` thiếu file sau `npm run build` | Đã sửa (tắt `incremental` trong `tsconfig.build.json`). Nếu vẫn gặp, xóa `*.tsbuildinfo` và `dist/`. |

## Deploy lên Render

`render.yaml` ở thư mục gốc giờ tạo **2 thứ**: web service `3next-api` và PostgreSQL `3next-db`. `DATABASE_URL` được nối tự động, `JWT_SECRET` do Render tự sinh.

1. Render Dashboard → **New** → **Blueprint** → chọn repo, chọn nhánh.
2. Render hỏi giá trị `DEMO_PASSWORD` (đánh dấu `sync: false`): đặt mật khẩu cho tài khoản demo, hoặc bỏ trống nếu không cần tài khoản demo.
3. **Apply**. Lần khởi động đầu server tự chạy migration.
4. Kiểm tra `<địa chỉ>/health` trả `"database": "ok"`.

> **Nếu service `3next-api` đã tồn tại** (tạo từ `render.yaml` cũ), vào Blueprint đó bấm **Manual sync** để Render tạo thêm database và biến môi trường. Biến cũ `SEED_DEMO_DATA` giữ nguyên.

### Giới hạn gói free cần biết trước khi demo

- **Postgres free hết hạn 30 ngày sau khi tạo.** Sau đó có 14 ngày để nâng cấp, quá hạn thì Render **xóa database và toàn bộ dữ liệu**. Mỗi workspace chỉ có 1 Postgres free, dung lượng 1 GB.
  → Tính ngày: tạo database quá sớm thì có thể hết hạn đúng tuần demo cuối kỳ. Nên tạo lại database gần ngày demo, hoặc dùng Postgres bên ngoài (bên dưới).
- **Web service free tự tắt sau 15 phút không có request**, mở lại mất khoảng 1 phút. Widget đã đặt timeout dài cho trường hợp này.

### Dùng Postgres bên ngoài thay cho Render (không hết hạn)

Các dịch vụ như Neon hoặc Supabase có gói free không bị xóa sau 30 ngày (kiểm tra lại điều khoản hiện tại của từng bên trước khi dùng). Cách nối:

1. Tạo database, copy connection string dạng `postgres://user:pass@host/db`.
2. Trên Render, sửa biến `DATABASE_URL` thành chuỗi đó (thay cho `fromDatabase`), và đặt `DATABASE_SSL=true` (nối từ ngoài vào cần SSL).
3. Xóa khối `databases:` trong `render.yaml` nếu không dùng Postgres của Render nữa.

### Docker image

`backend/Dockerfile` không đổi: build 2 tầng, chạy `node dist/main`. Trước đây `npm ci` trong Dockerfile **bị lỗi** vì `package-lock.json` lệch với `package.json` (thiếu `webpack`), giờ đã đồng bộ lại.

> Chưa build thử được Docker image trong lúc làm (máy làm việc không có Docker daemon). Đã kiểm tra: `npm ci`, `npm run build`, chạy `node dist/main.js` ở chế độ production với Postgres thật, và cú pháp `docker-compose.yml` (`docker compose config`). Lần đầu chạy `docker compose --profile api up --build` trên máy bạn nhớ xem log.
