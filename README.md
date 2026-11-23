# 3Next — AI Quick Capture & Next Action Assistant

> **Nói một câu – biết ngay 3 việc cần làm tiếp.** 

3Next là mobile app giúp sinh viên và người trẻ bận rộn ghi lại task/deadline thật nhanh bằng giọng nói hoặc text. AI tự tách nội dung thành **task, deadline, mức ưu tiên** và luôn chỉ hiển thị **3 việc quan trọng nhất** cần làm tiếp theo.


## 1. Links

| Tài nguyên | Link |
|---|---|
| Wiki (tài liệu dự án) | https://github.com/L01-ShowMeProduct/3next/wiki |
| Project board | https://github.com/orgs/L01-ShowMeProduct/projects/1 |
| Design (Figma) | https://www.figma.com/design/4RREZGItQj0N0mV3ZdMH3W/Untitled--Copy-?node-id=0-1 |
| Prototype tương tác | https://www.figma.com/proto/4RREZGItQj0N0mV3ZdMH3W/?page-id=0%3A1&node-id=22-681&starting-point-node-id=22%3A681&scaling=min-zoom&content-scaling=fixed&show-proto-sidebar=1 |
| Landing page | https://l01-showmeproduct.github.io/3next/ |
| Case study Behance | https://www.behance.net/gallery/258883263/3Next-AI-Quick-Capture-Next-Action-Assistant |

> Toàn bộ tài liệu của Assignment (Project Direction, Mobile Rationale, Evidence Plan, User Research, Existing Solutions, Business Canvas, MVP Scope, User Stories, User Flows, Project Plan...) nằm trên **Wiki**, không nằm trong repo.

## 2. Tech stack (dự kiến)

- **Frontend:** React + TypeScript
- **AI:** _TBD_ — LLM để tách task / deadline / priority từ text hoặc voice
- **Backend:** NestJS (TypeScript), REST API có Swagger Docs, xem `backend/README.md`
- **Database:** _TBD_ (hiện lưu trong bộ nhớ)

## 3. Cấu trúc thư mục

```text
3next/
├── README.md
├── .gitignore
├── mobile/        # source code mobile app
├── backend/       # API / AI service (nếu cần)
└── docs/          # tài liệu phụ
    └── assets/    # hình ảnh, diagram dùng cho wiki
```

## 4. Chạy dự án

```bash
cd mobile
flutter pub get
flutter run
```

MVP hiện có: màn hình Capture (nhập text) → mock AI tách task/deadline → màn hình Top 3 (kéo thả đổi thứ tự + xác nhận). Voice input và kết nối AI thật/backend sẽ làm ở bước sau.

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

## Landing page BTL2

Trang đã được đăng công khai tại https://l01-showmeproduct.github.io/3next/ (GitHub Pages, nhánh `main`, thư mục `/docs`).

| File | Nội dung |
|---|---|
| `docs/index.html` | **Trang chính**, do Chính làm (dùng `landing.css`, `landing.js` và font Inter tự lưu trong repo). Đã bổ sung khối trạng thái phát triển, số liệu khảo sát, tên nhóm và thẻ chia sẻ |
| `docs/landing-v1.html` | Bản thay thế, CSS nhúng sẵn, xem tại `/landing-v1.html` |
| `docs/assets/landing/` | Logo (`logo.png` cho trang chính, `logo-alt.png` cho bản thay thế), ảnh màn hình thiết kế, font |

Chạy thử trên máy, từ thư mục gốc repo:

```bash
python -m http.server 5188 --directory docs
```

Mở `http://localhost:5188` (trang chính) hoặc `http://localhost:5188/landing-v1.html`.

Link Behance đã gắn vào thẻ BEHANCE trong `docs/index.html`. Sau khi đẩy lên `main`, Pages tự cập nhật trong khoảng một phút. Kiểm tra trên điện thoại và bằng tab ẩn danh trước khi nộp.

AI hỗ trợ soạn nội dung, viết mã và kiểm tra responsive cho landing page. Nhóm cần rà soát, xác nhận nội dung và cập nhật tình trạng sản phẩm trước khi công bố.
