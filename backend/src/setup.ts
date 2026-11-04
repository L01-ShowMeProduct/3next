import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Cấu hình dùng chung cho server thật và test: validation và Swagger Docs. */
export function configureApp(app: INestApplication): void {
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('3Next API')
    .setDescription(
      [
        'API cho 3Next, ứng dụng nói hoặc gõ một câu, AI tách thành task và chọn 3 việc nên làm tiếp.',
        '',
        '**Các collection**',
        '- **Auth**: đăng ký, đăng nhập, làm mới token, đăng xuất.',
        '- **Captures**: gửi một câu, nhận các task nháp do AI tách, xác nhận hoặc bỏ qua.',
        '- **Tasks**: quản lý task (thêm, sửa, hoàn thành, xóa) và lấy Top 3 việc nên làm tiếp.',
        '',
        'Mọi endpoint của Tasks và Captures cần đăng nhập, và chỉ thấy dữ liệu của chính tài khoản đó.',
        '',
        '**Luồng thử nhanh trên Swagger**',
        '1. `POST /auth/register` (hoặc `/auth/login`), copy `accessToken`.',
        '2. Bấm nút **Authorize** ở góc trên, dán access token vào.',
        '3. `POST /captures` với một câu, ví dụ "Thứ 6 nộp báo cáo, mai họp nhóm lúc 9 giờ".',
        '4. `POST /captures/{id}/confirm` để lưu các task đó (hoặc gửi danh sách đã sửa).',
        '5. `GET /tasks/top` để xem 3 việc nên làm tiếp kèm lý do.',
        '6. `POST /tasks/{id}/complete` để đánh dấu xong.',
        '',
        'Access token hết hạn sau 15 phút: gọi `POST /auth/refresh` với refresh token để lấy cặp mới.',
        'Dữ liệu lưu trong PostgreSQL, khởi động lại server không mất.',
      ].join('\n'),
    )
    .setVersion('2.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Access token từ /auth/login' })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: '3Next API Docs',
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha' },
  });
}
