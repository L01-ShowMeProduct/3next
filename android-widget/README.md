# 3Next Android Widget

Widget màn hình chính hiển thị **3 việc nên làm tiếp theo**, lấy từ API của 3Next (`GET /tasks/top`). Viết bằng Kotlin thuần, không phụ thuộc framework của app chính, nên dùng được cho cả bản React hay Flutter (xem phần Tích hợp).

## Widget làm được gì

- Hiện 3 việc theo thứ tự do server xếp, mỗi việc có **vạch màu ưu tiên** (đỏ cao, cam trung bình, xanh thấp) và hạn chót tiếng Việt ("Hôm nay 22:41", "Thứ Sáu 23:59", "Quá hạn 02/11").
- **Bấm nút tròn** bên phải một việc để đánh dấu hoàn thành. Việc đó biến mất ngay, server xếp lại và việc kế tiếp được bổ sung.
- **Bấm nút làm mới** ở góc để tải lại. Widget cũng tự cập nhật khoảng 30 phút một lần.
- **Bấm vào nội dung** để mở app.
- Khi **mất mạng**, widget vẫn hiện danh sách lần cập nhật gần nhất, kèm dòng "Không kết nối được, đang hiện dữ liệu cũ".
- Hỗ trợ giao diện tối. Kích thước mặc định 4×2, kéo giãn được.

## App đi kèm

App có một màn hình để cấu hình và demo:

- **Máy chủ API**: nhập địa chỉ server rồi bấm "Lưu và thử kết nối".
- **Ghi nhanh**: gõ hoặc bấm "Nói" (nhận dạng giọng nói tiếng Việt của hệ thống) rồi "Ghi lại". App gọi `POST /captures` và `POST /captures/{id}/confirm`, widget tự cập nhật.
- **Top 3 hiện tại** và nút **Thêm widget vào màn hình chính**.

## Chạy thử

Cần Android Studio (hoặc JDK 17 trở lên cùng Android SDK 36).

```bash
cd android-widget
# Tạo local.properties trỏ tới Android SDK, ví dụ: sdk.dir=C\:\\Users\\<tên>\\AppData\\Local\\Android\\Sdk
./gradlew assembleDebug          # file APK ở app/build/outputs/apk/debug/app-debug.apk
./gradlew testDebugUnitTest      # chạy test
```

Hoặc mở thư mục `android-widget` bằng Android Studio và bấm Run.

### Nối với server

Widget tự nhận biết đang nối vào API nào và dùng đúng endpoint:

| API | Cách nhận biết | Lấy Top 3 | Hoàn thành | Ghi nhanh |
|---|---|---|---|---|
| **API nhóm đã deploy** (mặc định) `https://threenext-test.onrender.com` | không có `GET /health` | `GET /tasks?status=open&ranked=true`, lấy 3 việc đầu | `PATCH /tasks/{id}/status` | `POST /captures`, `/parse`, `/confirm` |
| **API trong thư mục `backend/`** | `GET /health` trả `service: 3next-backend` | `GET /tasks/top` | `POST /tasks/{id}/complete` | `POST /captures`, `/confirm` |

| Chạy ở đâu | Địa chỉ nhập trong app |
|---|---|
| Server đã deploy | `https://<tên>.onrender.com` |
| Server trên máy tính, chạy trên emulator | `http://10.0.2.2:3000` |
| Server trên máy tính, chạy trên điện thoại thật | `http://<IP máy tính>:3000` (cùng mạng Wi-Fi, cần bật cleartext cho IP đó trong `network_security_config.xml`) |

Địa chỉ mặc định nằm trong `app/build.gradle.kts` (`DEFAULT_API_URL`).

API nhóm ghi giờ theo kiểu "giờ trần": "9h ngày mai" được lưu thành `09:00Z` mà không đổi múi giờ. Widget đọc giờ đó đúng như đã ghi (không cộng 7 tiếng), và hạn chỉ có ngày thì không hiện giờ.

Gói miễn phí của Render tự ngủ khi không có ai dùng, nên lần gọi đầu có thể mất 30 đến 60 giây. App cho phép chờ tối đa 70 giây.

### Thêm widget

Mở app, bấm **Thêm widget vào màn hình chính** rồi xác nhận. Nếu launcher không hỗ trợ, nhấn giữ màn hình chính, chọn **Widget**, rồi tìm **3Next**.

## Cấu trúc

| File | Vai trò |
|---|---|
| `Top3Widget.kt` | Widget: vẽ giao diện, xử lý bấm hoàn thành, làm mới, cache khi mất mạng |
| `Api.kt` | Nhận biết loại API và gọi đúng endpoint (hai bản: API nhóm và API trong `backend/`) |
| `ApiClient.kt` | Gọi HTTP bằng OkHttp (cần vì Android không hỗ trợ PATCH trong HttpURLConnection) |
| `TopTask.kt` | Chuẩn hóa dữ liệu từ hai API về một dạng chung, lưu cache |
| `DeadlineFormatter.kt` | Đổi hạn chót ISO thành chữ ngắn tiếng Việt |
| `Prefs.kt` | Lưu địa chỉ API và bản Top 3 gần nhất |
| `MainActivity.kt` | Màn hình cấu hình, ghi nhanh, thêm widget |
| `res/layout/widget_top3.xml` | Bố cục widget |

## Tích hợp vào app chính (React hoặc Flutter)

Widget phải là code native Android dù app chính dùng framework nào. Để dùng trong app chính, sao chép vào `android/app/src/main`:

1. Các file `Top3Widget.kt`, `ApiClient.kt`, `TopTask.kt`, `DeadlineFormatter.kt`, `Prefs.kt` và đổi `package` cho khớp.
2. Các file trong `res/` mà widget dùng (`layout/widget_top3.xml`, `xml/top3_widget_info.xml`, các drawable, color, string).
3. Khai báo `<receiver>` và quyền `INTERNET` trong `AndroidManifest.xml`, giống file manifest ở đây.
4. Thêm `buildConfigField("String", "DEFAULT_API_URL", ...)` hoặc sửa `Prefs.kt` để lấy địa chỉ API từ chỗ khác.

App chính có thể gọi `Top3Widget.requestRefresh(context)` (qua một native module) mỗi khi người dùng thêm hoặc hoàn thành việc để widget cập nhật ngay.

## Hạn chế hiện tại

- Chỉ có widget màn hình chính trên Android. Android không có widget trên màn hình khóa, iOS cần làm riêng bằng WidgetKit.
- Chưa có đăng nhập: mọi người dùng chung dữ liệu trên server.
- Chưa hiện lý do xếp hạng trên widget (API đã trả sẵn trường `reason`).
- Bản APK được ký bằng khóa debug, chưa phải bản phát hành.
