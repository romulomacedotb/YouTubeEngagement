import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Middlewares
  app.use(cookieParser());

  // CORS
  const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: [webOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global exception filter and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Serve static web app when dist exists (desktop app or production)
  const staticPath =
    process.env.STATIC_PATH ||
    path.join(__dirname, '..', '..', 'web', 'dist');

  if (fs.existsSync(staticPath)) {
    logger.log(`Frontend estático habilitado a partir de: ${staticPath}`);
    app.use(express.static(staticPath));
    app.use((req: any, res: any, next: any) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(staticPath, 'index.html'));
      } else {
        next();
      }
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Servidor NestJS iniciado em http://localhost:${port}/api`);
  logger.log(`Health check disponível em http://localhost:${port}/api/health`);
}

bootstrap();
