import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Bật CORS cho phép kết nối từ Frontend
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Phục vụ ảnh tĩnh sản phẩm
  app.use('/images', express.static(join(process.cwd(), '..', 'images')));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🌸 caPHEnue NestJS API đang chạy tại: http://localhost:${port}`);
  console.log(`📚 Server CSDL Protégé tích hợp tại: /api/ontology`);
}
bootstrap();
