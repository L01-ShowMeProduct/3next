import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

/** Use the same validation and API contract in production and HTTP regression tests. */
export function configureApp(app: INestApplication): void {
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }));
  const config = new DocumentBuilder()
    .setTitle('3Next API')
    .setDescription('Tasks and Captures. Deadlines are actual UTC instants; task lists include timeSemantics=utc. Data is in-memory and resets on restart.')
    .setVersion('1.1')
    .addTag('Tasks', 'Manage your tasks')
    .addTag('Captures', 'Capture text and parse into tasks')
    .build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config), {
    swaggerOptions: { persistAuthorization: true },
  });
}
