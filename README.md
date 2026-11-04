# 3Next — AI Quick Capture & Next Action Assistant

> **Nói một câu – biết ngay 3 việc cần làm tiếp.** 

3Next là mobile app giúp sinh viên và người trẻ bận rộn ghi lại task/deadline thật nhanh bằng giọng nói hoặc text. AI tự tách nội dung thành **task, deadline, mức ưu tiên** và luôn chỉ hiển thị **3 việc quan trọng nhất** cần làm tiếp theo.


## 1. Links

| Tài nguyên | Link |
|---|---|
| Wiki (tài liệu dự án) | https://github.com/L01-ShowMeProduct/3next/wiki |
| Project board | https://github.com/orgs/L01-ShowMeProduct/projects/1 |
| Design (Figma) | _TBD_ |

> Toàn bộ tài liệu của Assignment (Project Direction, Mobile Rationale, Evidence Plan, User Research, Existing Solutions, Business Canvas, MVP Scope, User Stories, User Flows, Project Plan...) nằm trên **Wiki**, không nằm trong repo.

## 2. Tech stack (dự kiến)

- **Frontend:** React + TypeScript
- **AI:** _TBD_ — LLM để tách task / deadline / priority từ text hoặc voice
- **Backend:** NestJS 11 (TypeScript), REST API có Swagger Docs, đăng nhập email + mật khẩu (JWT), xem `backend/README.md`
- **Database:** PostgreSQL 16 (TypeORM + migration), chạy local bằng Docker Compose
- **Widget:** Android home screen widget (Kotlin) hiển thị Top 3

## 3. Cấu trúc thư mục

```text
3next/
├── mobile/                     # source code mobile app
├── backend/                    # REST API (NestJS)
│   ├── docker/                 # script khởi tạo PostgreSQL cho Docker
│   ├── src/
│   │   ├── auth/               # đăng ký, đăng nhập, JWT, refresh token
│   │   │   └── dto/
│   │   ├── captures/           # nhận câu nói/gõ, tách thành task nháp, xác nhận
│   │   │   ├── dto/
│   │   │   └── parser/         # bộ tách task tiếng Việt
│   │   ├── config/             # đọc và kiểm tra biến môi trường
│   │   ├── database/           # kết nối PostgreSQL, seed dữ liệu demo
│   │   │   └── migrations/     # thay đổi schema theo từng phiên bản
│   │   ├── tasks/              # quản lý task, xếp hạng Top 3
│   │   │   └── dto/
│   │   └── users/              # tài khoản người dùng
│   └── test/                   # test e2e
├── android-widget/             # widget Top 3 trên màn hình chính Android
│   ├── app/
│   │   └── src/
│   │       ├── main/
│   │       │   ├── java/       # code Kotlin
│   │       │   └── res/        # layout, drawable, values
│   │       └── test/           # unit test
│   └── gradle/
└── docs/                       # tài liệu phụ
    ├── assets/                 # hình ảnh, diagram dùng cho wiki
    └── backend/                # ghi chú kỹ thuật phần Backend & Data
```

## 4. Chạy dự án

**Backend** (cần Node.js 20+ và Docker Desktop):

```bash
docker compose up -d db        # bật PostgreSQL
cd backend
npm install
cp .env.example .env
npm run start:dev              # API ở http://localhost:3000, Swagger ở /docs
```

Chi tiết: [`backend/README.md`](backend/README.md) và [`docs/backend/`](docs/backend/README.md).

**Widget Android:** xem [`android-widget/README.md`](android-widget/README.md).

**Mobile:** _sẽ cập nhật._

## 5. Git workflow

### Các nhánh chính

| Branch | Mục đích |
|---|---|
| `main` | Bản ổn định, luôn demo được. Chỉ merge từ `develop` khi release. |
| `develop` | Nhánh tích hợp, mọi task merge vào đây. |
| `feature/<ten-task>` | Mỗi task một nhánh riêng, tách từ `develop`. |

### Làm một task mới

```bash
git switch develop
git pull origin develop
git switch -c feature/<ten-task>

# ... code ...

git add .
git commit -m "feat: mô tả ngắn thay đổi"
git push -u origin feature/<ten-task>
```

Sau đó tạo Pull Request `feature/<ten-task> → develop`. Ghi `Closes #<số issue>` trong mô tả PR để tự đóng task trên Project board. Ít nhất 1 thành viên khác review rồi mới merge.

### Cập nhật nhánh của mình khi `develop` có code mới

```bash
git switch develop
git pull origin develop
git switch feature/<ten-task>
git merge develop
```

### Quy ước đặt tên

```text
Branch:  feature/...   chức năng mới
         fix/...       sửa lỗi
         docs/...      tài liệu
         chore/...     cấu hình, bảo trì
         test/...      kiểm thử

Commit:  feat: add quick capture screen
         fix: correct deadline parsing
         docs: update setup instructions
         chore: add gitignore
```

## 6. Nguyên tắc làm việc nhóm

- Không push trực tiếp vào `main`.
- Mỗi task = 1 issue trên Project board = 1 branch riêng.
- Pull Request nhỏ, tập trung vào một thay đổi.
- Ít nhất một thành viên khác review trước khi merge.
- Không commit `.env`, API key hoặc secret.
