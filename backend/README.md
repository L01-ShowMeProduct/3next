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
cd app/backend
npm install
npm run start:dev
```

Swagger UI: http://localhost:3000/api

---

## Deploy lên Render

1. Push code lên GitHub (chỉ cần thư mục `app/backend/`)
2. Vào [render.com](https://render.com) → **New → Web Service**
3. Kết nối repo → Render tự đọc `render.yaml`
4. Đặt **Root Directory** = `app/backend`
5. Deploy → lấy URL dạng `https://3next-api.onrender.com/api`

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

