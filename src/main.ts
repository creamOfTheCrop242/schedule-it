import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express'; // ✅ Import this

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule); // ✅ Type it here

  app.set('trust proxy', 1); // ✅ Now no TypeScript error
  app.use(cookieParser());

  app.enableCors({
    origin: ['http://localhost:4200', 'https://schedule-it-2.netlify.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
