import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { AppModule } from './app.module';
import { basename, resolve } from 'path';

process.env.UPLOAD_DIR ??= basename(process.cwd()) === 'backend' ? resolve(process.cwd(), 'uploads') : resolve(process.cwd(), 'apps/backend/uploads');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;
  for (const name of required) {
    if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
  }
  for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    if (process.env[name]!.length < 32) throw new Error(`${name} must contain at least 32 characters`);
    if (process.env.NODE_ENV === 'production' && process.env[name]!.startsWith('replace-with')) throw new Error(`${name} must be replaced before production startup`);
  }
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(compression({ threshold: 1024 }));
  app.use(cookieParser());
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    const config = new DocumentBuilder().setTitle('Quality Hub API').setVersion('1.0').addBearerAuth().build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
