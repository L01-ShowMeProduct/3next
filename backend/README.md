# 3Next Backend

REST API cho 3Next, viết bằng NestJS 11 (TypeScript). Có **Swagger Docs** để thử API trực tiếp tại `/docs`.

## Hai collection

| Collection | Vai trò | Endpoint chính |
|---|---|---|
| **Captures** | Nhận một câu (gõ hoặc nói), AI tách thành các task nháp, người dùng xác nhận hoặc bỏ qua | `POST /captures`, `POST /captures/{id}/confirm`, `DELETE /captures/{id}`, `GET /captures`, `GET /captures/{id}` |
| **Tasks** | Quản lý task và lấy các việc nên làm tiếp | `POST /tasks`, `GET /tasks`, `GET /tasks/top`, `GET /tasks/{id}`, `PATCH /tasks/{id}`, `POST /tasks/{id}/complete`, `DELETE /tasks/{id}` |

Ngoài ra có `GET /health` để kiểm tra server.

Luồng chính của sản phẩm tương ứng với các API:

1. `POST /captures` với `{"text": "Thứ 6 nộp báo cáo, mai họp nhóm lúc 9 giờ"}` nhận về các task nháp.
2. `POST /captures/{id}/confirm` để lưu (gửi body rỗng, hoặc gửi `tasks` đã sửa).
3. `GET /tasks/top` lấy Top 3 việc nên làm tiếp, kèm điểm và lý do.
4. `POST /tasks/{id}/complete` đánh dấu xong, việc đó rời khỏi Top 3.

## Chạy trên máy

Cần Node.js 20 trở lên.

```bash
cd backend
npm install
npm run start:dev      # chạy ở http://localhost:3000, Swagger ở http://localhost:3000/docs
npm test               # chạy toàn bộ test
npm run build          # build ra dist/
npm run start:prod     # chạy bản đã build
```

Biến môi trường (xem `.env.example`):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | Cổng server |
| `SEED_DEMO_DATA` | `true` | Tạo sẵn vài task mẫu khi khởi động để thử Top 3 |

## Cách hoạt động

- **Tách câu (`src/captures/parser`)**: bộ quy tắc cho tiếng Việt, hiểu "hôm nay", "mai", "mốt", "thứ 2 đến chủ nhật", "tuần sau", ngày `dd/mm`, giờ như "9 giờ", "7h30", "3 giờ chiều", cùng từ khóa ưu tiên như "gấp", "không gấp". Câu không có mốc thời gian thì deadline để trống, không tự đoán. Múi giờ Việt Nam (UTC+7). Đây là bản heuristic, chưa dùng LLM, có thể thay bằng LLM mà không đổi API.
- **Xếp hạng (`src/tasks/ranking.ts`)**: điểm = độ gấp của deadline (tối đa 100, quá hạn là cao nhất) + trọng số ưu tiên (cao 30, trung bình 15, thấp 0). Mỗi việc trong Top 3 kèm lý do bằng tiếng Việt.
- **Lưu trữ**: trong bộ nhớ, dữ liệu mất khi server khởi động lại. Khi nối Firestore chỉ cần thay phần lưu trữ trong `TasksService` và `CapturesService`.
- **Kiểm tra dữ liệu**: dữ liệu sai trả `400`, không tìm thấy trả `404`, xác nhận capture hai lần trả `409`, câu không tách được việc nào trả `422`.

## Deploy

### Render (miễn phí)

Repo có sẵn `render.yaml` ở thư mục gốc.

1. Vào https://dashboard.render.com, chọn **New**, rồi **Blueprint**.
2. Kết nối GitHub và chọn repo `L01-ShowMeProduct/3next`, chọn nhánh chứa code backend.
3. Bấm **Apply**. Render tự build bằng `backend/Dockerfile` và cấp địa chỉ dạng `https://3next-api.onrender.com`.
4. Swagger Docs nằm ở `<địa chỉ>/docs`. Mở địa chỉ gốc cũng tự chuyển sang trang này.

Gói miễn phí của Render tự tắt sau khoảng 15 phút không có người dùng, nên lần mở đầu tiên có thể chờ 30 đến 60 giây.

### Docker

```bash
cd backend
docker build -t 3next-api .
docker run -p 3000:3000 3next-api
```
