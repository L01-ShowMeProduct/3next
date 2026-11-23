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

_Sẽ cập nhật khi chốt tech stack._

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

Trang giới thiệu nằm trong `docs/index.html`, dùng HTML, CSS và JavaScript tĩnh. Chạy từ thư mục gốc repo:

```bash
python -m http.server 5188 --directory docs
```

Mở `http://localhost:5188`. Logo, ảnh thiết kế Figma và font Inter được phục vụ từ `docs/assets/landing/`.

Để phát hành bằng GitHub Pages, đưa các thay đổi lên nhánh được nhóm duyệt, sau đó chọn **Settings → Pages → Deploy from a branch**, chọn nhánh chứa trang và thư mục **/docs**. Kiểm tra URL do GitHub cung cấp trên điện thoại và ở cửa sổ ẩn danh trước khi nộp.

Mục Behance đang hiển thị trạng thái chờ công bố. Khi có URL bài công khai, đổi khối `resource-pending` trong `docs/index.html` thành liên kết đến bài đó. Prototype được tải sau khi người xem bấm nút và có liên kết mở toàn màn hình.

AI hỗ trợ soạn nội dung, viết mã và kiểm tra responsive cho landing page. Nhóm cần rà soát, xác nhận nội dung và cập nhật tình trạng sản phẩm trước khi công bố.
