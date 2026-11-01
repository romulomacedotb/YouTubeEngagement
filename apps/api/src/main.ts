import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
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
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust reverse proxy headers (Render, Koyeb, Caddy, Nginx) for HTTPS cookies
  app.set('trust proxy', 1);

  // Global prefix
  app.setGlobalPrefix('api');

  // Middlewares
  app.use(cookieParser());

  // CORS
  const allowedOrigins = Array.from(
    new Set(
      [
        process.env.WEB_ORIGIN,
        process.env.PUBLIC_URL,
        process.env.RENDER_EXTERNAL_URL,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
      ].filter((origin): origin is string => !!origin && origin.trim().length > 0),
    ),
  );

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Backup-Secret'],
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
  if (process.env.HOST) {
    await app.listen(port, process.env.HOST);
  } else {
    await app.listen(port);
  }
  logger.log(`Servidor NestJS iniciado na porta ${port} (/api)`);
  logger.log(`Health check disponível em /api/health`);
}

bootstrap();
