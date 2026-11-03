import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS – allow all origins (public demo API)
  app.enableCors();

  // Auto-validate all incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('3Next API')
    .setDescription(
      '## Task Manager REST API\n\n' +
      'Two collections:\n' +
      '- **Tasks** – CRUD & status management\n' +
      '- **Captures** – Text capture → AI parse → confirm as tasks\n\n' +
      'Data is stored **in-memory** (resets on server restart).',
    )
    .setVersion('1.0')
    .addTag('Tasks', 'Manage your tasks')
    .addTag('Captures', 'Capture text and parse into tasks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀  Server running on port ${port}`);
  console.log(`📖  Swagger docs → http://localhost:${port}/api`);
}
bootstrap();

