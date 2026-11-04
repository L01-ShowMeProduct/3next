# Nhật ký làm việc · Backend & Data

Ghi theo thứ tự đã làm. Mỗi lần làm tiếp thì thêm mục mới ở cuối.

---

## 2026-11-04 · Thêm PostgreSQL và đăng nhập

**Nhánh:** `khoa` · **Người làm:** Khoa

### Bối cảnh

- Backend NestJS trên `main` (commit `c4be97f`) đã có đủ API Tasks và Captures, Swagger, test e2e, nhưng **lưu trong RAM**: khởi động lại server là mất hết, và mọi người dùng chung một danh sách task.
- Nhóm đã chốt: có server trung tâm, user đăng nhập, dữ liệu theo tài khoản để đổi thiết bị không mất.
- Quyết định: **giữ NestJS** (không viết lại bằng FastAPI như dự tính ban đầu) vì code đã chạy, có test, widget đang dùng. Thêm PostgreSQL + đăng nhập email/mật khẩu bằng JWT.

### Đã làm

1. **Đọc code cũ**, ghi lại hợp đồng API mà widget Android đang dùng (`/health` trả `service: "3next-backend"`, `/tasks/top`, `/tasks/{id}/complete`, `/captures` + `/confirm`) để không phá định dạng dữ liệu.
2. **Thêm thư viện:** `typeorm` 0.3, `@nestjs/typeorm` 11, `pg`, `@nestjs/jwt` 11, `bcryptjs`. Thử bản 12 trước nhưng là ESM-only, Jest không load được với project CommonJS, nên hạ về bản 11.
3. **Config** (`src/config/`): đọc và kiểm tra biến môi trường ở một chỗ, thiếu biến bắt buộc thì dừng ngay lúc khởi động với thông báo tiếng Việt. Tự đọc `backend/.env`.
4. **4 entity + migration đầu tiên:** `users`, `refresh_tokens`, `captures`, `tasks`. Khai báo tên PK/FK/index/check trong entity cho khớp migration. Kiểm tra bằng `migration:generate`: không còn khác biệt.
5. **Auth module:** đăng ký, đăng nhập, refresh (có rotation và phát hiện token bị lộ), đăng xuất 1 thiết bị, đăng xuất tất cả, `/auth/me`. Guard JWT toàn cục, endpoint công khai phải gắn `@Public()`.
6. **Viết lại `TasksService`, `CapturesService`** dùng repository, mọi hàm nhận `userId`. Xác nhận capture chạy trong transaction có khóa dòng.
7. **`/health`** kiểm tra cả database.
8. **Seed demo** thành tài khoản `demo@3next.app` kèm 4 task, chỉ tạo khi chưa có.
9. **Docker Compose** cho Postgres local (kèm database test), **`render.yaml`** thêm Postgres và `JWT_SECRET` tự sinh.
10. **Test:** viết lại e2e chạy trên Postgres thật, thêm test auth, cô lập dữ liệu, xác nhận song song, restart server. Thêm unit test cho config. Kết quả 47/47 pass.
11. **Docs:** thư mục `docs/backend/` này, cập nhật `backend/README.md` và cây thư mục trong `README.md`.

### Bug tìm ra dọc đường

| # | Bug | Ở đâu | Đã sửa |
|---|---|---|---|
| 1 | `npm ci` lỗi vì `package-lock.json` lệch với `package.json` (thiếu `webpack`). Docker build và deploy Render dùng `npm ci` nên cũng sẽ lỗi. | Có sẵn trên `main` | Đồng bộ lại lock file |
| 2 | Build lần thứ hai thiếu file trong `dist/`: `incremental: true` + `deleteOutDir` làm tsc tưởng file chưa đổi nên không emit lại. Server báo `Cannot find module`. | Có sẵn trên `main`, chỉ lộ khi build 2 lần trên cùng máy | Tắt `incremental` trong `tsconfig.build.json` |
| 3 | Email có khoảng trắng thừa (`"  Khoa@HCMUT.edu.vn "`) bị `@IsEmail` từ chối vì kiểm tra trước khi bỏ khoảng trắng. Bàn phím điện thoại hay tự thêm dấu cách. | Code mới | Chuẩn hóa email trước khi validate |
| 4 | Đăng xuất trên điện thoại, app lỡ gửi lại token cũ → server tưởng token bị lộ → **đá văng cả laptop**. Do lúc đầu không phân biệt "thu hồi vì đổi token" với "thu hồi vì đăng xuất". | Code mới, test bắt được | Thêm cột `revoked_reason`, chỉ token `rotated` bị gửi lại mới tính là lộ |
| 5 | Trên production nếu quên đặt `DEMO_PASSWORD`, tài khoản demo sẽ dùng mật khẩu mặc định ai đọc repo cũng biết. | Code mới | Production thiếu `DEMO_PASSWORD` thì bỏ qua seed và log cảnh báo |
| 6 | Cột `drafts` có default `'[]'::jsonb` làm `migration:generate` lúc nào cũng sinh migration rác (TypeORM so chuỗi default của jsonb không chuẩn). | Code mới | Bỏ default ở DB, code luôn tự gán giá trị |

### Chưa làm / việc tiếp theo

- [ ] **Widget Android** cần thêm đăng nhập, nếu không sẽ nhận `401` khi trỏ vào backend mới (chi tiết trong [04-api.md](04-api.md#ảnh-hưởng-tới-widget-android-android-widget)).
- [ ] **Notification nhắc việc gấp** (phần còn lại của vai trò Backend & Data): cần app mobile có trước để lấy push token. Hướng dự kiến: bảng `devices` lưu push token theo user, job định kỳ quét task sắp tới hạn.
- [ ] Rate limit cho `/auth/login` và `/auth/register` (`@nestjs/throttler`).
- [ ] Job dọn refresh token đã hết hạn.
- [ ] Chạy thử `docker compose --profile api up --build` trên máy có Docker (chưa build được image lúc làm).
- [ ] Chuyển sang phần AI: thay parser quy tắc bằng LLM, giữ nguyên hợp đồng `ParsedTask`.
