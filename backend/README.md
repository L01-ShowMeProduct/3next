# 3Next API — NestJS Backend

REST API backend cho ứng dụng **3Next Task Manager**, phục vụ bài tập nhóm.

## Tech Stack

- **NestJS** (Node.js framework)
- **In-memory store** (không cần database)
- **Swagger UI** – test API trực tiếp trên trình duyệt
- **Render** – deploy miễn phí

---

## Chạy local

```bash
cd backend
npm ci
npm test
npm run start:dev
```

Yêu cầu Node.js 22 trở lên. Swagger UI: http://localhost:3000/api. Health check: http://localhost:3000/healthz.

`npm test` build backend rồi chạy test Node: HTTP flow dùng cùng cấu hình server thật, parser tại nhiều múi giờ, ranking và parse/confirm đồng thời. Các test Gemini dùng phản hồi giả cục bộ, không gửi request hoặc API key ra Google.

---

## Deploy lên Render

1. Dùng **New → Blueprint**, chọn repo và `render.yaml` ở gốc. Blueprint dùng Docker, root directory `backend`, health check `/healthz`.
2. Nếu tạo **Web Service** thủ công: root directory `backend`, Node 22, build `npm ci --include=dev && npm test && npm prune --omit=dev`, start `npm run start:prod`, health check `/healthz`. `backend/render.yaml` mô tả cấu hình native Node tương đương khi được chọn làm Blueprint path.
3. Cấu hình Gemini qua biến môi trường của Render nếu cần. Dữ liệu lưu trong bộ nhớ, sẽ mất sau mỗi restart/deploy.
4. Kiểm tra `/healthz`, `/api` và luồng capture → parse → confirm trên môi trường thử trước khi cập nhật server đang dùng.

Không dùng `/health` cho deploy: endpoint đó là dấu nhận diện API cũ của widget. Backend này chỉ cung cấp `/healthz` và giữ các endpoint Tasks/Captures của Team API.

## Deadline và cập nhật widget

- Parser tính ngày theo `Asia/Ho_Chi_Minh`, không phụ thuộc TZ của máy chủ; `due` được lưu/trả về dưới dạng ISO UTC thật. Khi tạo/sửa task thủ công hoặc nhận kết quả Gemini, timestamp phải có `Z` hoặc offset (ví dụ `+07:00`); chuỗi chỉ có ngày hoặc thiếu múi giờ bị từ chối thay vì phụ thuộc TZ server.
- Ví dụ 09:00 ngày 04/11 ở Việt Nam là `2026-11-04T02:00:00.000Z`. Hạn chỉ có ngày lưu lúc 23:59 Việt Nam và `hasTime=false`.
- Danh sách task trả thêm `timeSemantics: "utc"`. Widget cập nhật đọc dấu này để đổi sang giờ địa phương; server cũ không có dấu thì widget vẫn đọc theo giờ trần như trước.
- **Cài bản widget cập nhật trước khi deploy backend này.** APK cũ luôn dùng `floatingTime=true`, sẽ hiển thị sai giờ với UTC thật. API endpoint và envelope `tasks`/`total` vẫn giữ nguyên; có thêm trường `timeSemantics`.
- Ngày `dd/mm` không ghi năm được hiểu là lần sắp tới; ngày có năm rõ ràng được giữ nguyên. Ngày không hợp lệ có warning, không tự cuộn sang tháng khác.

## Cấu hình Gemini

Request parse cần `apiKey` và model đang được Google hỗ trợ cho dự án của bạn. Có hai cách chọn model:

- Truyền `model` trong request.
- Hoặc đặt biến môi trường `GEMINI_MODEL` trên server. Không có giá trị mặc định cố định.

`GEMINI_TIMEOUT_MS` mặc định 30000, cho phép 1–120000 ms, áp dụng cả lúc đọc response. Timeout trả 504 và đưa capture về `draft` để có thể thử lại. `.env.example` chỉ liệt kê cấu hình; server đọc `process.env`, không tự nạp `.env`. Khi chạy local, đặt biến môi trường trong terminal trước khi khởi động; trên Render dùng Environment.

```powershell
$env:GEMINI_MODEL = 'model-supported-by-your-project'
$env:GEMINI_TIMEOUT_MS = '30000'
npm run start:dev
```

Giá trị model trong ví dụ là placeholder, cần thay bằng model dự án Google thực sự được phép gọi. Kiểm thử tự động không xác minh quyền truy cập, quota hoặc kết quả của Gemini thật.

Trong khi parse đang chạy, request parse hoặc huỷ cùng capture trả 409. Confirm chỉ chấp nhận IDs thuộc danh sách draft hiện tại; IDs sai trả 400 và giữ capture, còn `selectedIds: []` vẫn huỷ tất cả theo hợp đồng.

---

## API Collections

### 📦 Collection 1: Tasks

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/tasks` | Danh sách task (filter + rank) |
| `POST` | `/tasks` | Tạo task thủ công |
| `GET` | `/tasks/:id` | Chi tiết task |
| `PATCH` | `/tasks/:id` | Cập nhật task |
| `PATCH` | `/tasks/:id/status` | Đánh dấu done/open |
| `PATCH` | `/tasks/reorder` | Sắp xếp thủ công |
| `DELETE` | `/tasks/:id` | Xoá task |

### 📦 Collection 2: Captures

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/captures` | Danh sách captures |
| `POST` | `/captures` | Tạo capture (văn bản đầu vào) |
| `GET` | `/captures/:id` | Chi tiết + drafts |
| `POST` | `/captures/:id/parse` | Tách task (local / Gemini) |
| `POST` | `/captures/:id/confirm` | Xác nhận → tạo Task |
| `DELETE` | `/captures/:id` | Huỷ capture |

---

## Ví dụ flow đầy đủ

```bash
# 1. Tạo capture
POST /captures
{ "text": "Ngày mai 9h họp nhóm, cuối tuần nộp bài", "mode": "text" }

# 2. Tách task (engine local)
POST /captures/{id}/parse
{ "engine": "local" }

# 3. Xem drafts → chọn id muốn lưu
GET /captures/{id}

# 4. Xác nhận → tạo Tasks
POST /captures/{id}/confirm
{ "selectedIds": ["draft-uuid-1", "draft-uuid-2"] }

# 5. Xem Tasks đã tạo
GET /tasks?status=open&ranked=true
```

