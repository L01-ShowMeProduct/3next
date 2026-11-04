import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadDotEnv } from './config/dotenv';
import { loadEnv } from './config/env';
import { configureApp } from './setup';

// Phải đọc .env trước khi import AppModule để mọi module thấy được biến môi trường.
loadDotEnv();

async function bootstrap() {
  const env = loadEnv();
  // Import sau loadDotEnv để chắc chắn biến môi trường đã sẵn sàng.
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  configureApp(app);

  await app.listen(env.port, '0.0.0.0');
  console.log(`3Next API đang chạy tại http://localhost:${env.port}  (Swagger Docs: /docs)`);
}

bootstrap();
