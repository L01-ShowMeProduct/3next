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
        '**Hai collection chính**',
        '- **Captures**: gửi một câu, nhận các task nháp do AI tách, xác nhận hoặc bỏ qua.',
        '- **Tasks**: quản lý task (thêm, sửa, hoàn thành, xóa) và lấy Top 3 việc nên làm tiếp.',
        '',
        '**Luồng thử nhanh trên Swagger**',
        '1. `POST /captures` với một câu, ví dụ "Thứ 6 nộp báo cáo, mai họp nhóm lúc 9 giờ".',
        '2. `POST /captures/{id}/confirm` để lưu các task đó (hoặc gửi danh sách đã sửa).',
        '3. `GET /tasks/top` để xem 3 việc nên làm tiếp kèm lý do.',
        '4. `POST /tasks/{id}/complete` để đánh dấu xong.',
        '',
        'Dữ liệu lưu trong bộ nhớ nên sẽ mất khi server khởi động lại. Server có sẵn vài task mẫu để thử.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: '3Next API Docs',
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha' },
  });
}
