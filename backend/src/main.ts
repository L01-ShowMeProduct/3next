import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀  Server running on port ${port}`);
  console.log(`📖  Swagger docs → http://localhost:${port}/api`);
}
bootstrap();

