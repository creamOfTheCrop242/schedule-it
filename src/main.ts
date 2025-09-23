import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);

  app.use(cookieParser()); // ✅ Enables NestJS to parse cookie
  app.use((req, _res, next) => {
    console.log(
      'x-forwarded-proto:',
      req.headers['x-forwarded-proto'],
      'req.secure:',
      req.secure,
    );
    next();
  });

  // CORS configuration
  const corsOptions = {
    origin: ['http://localhost:4200', 'https://theguidelog.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  };

  app.enableCors(corsOptions);

  console.log('CORS enabled for origins:', corsOptions.origin);
  console.log('Server starting on port:', process.env.PORT ?? 3000);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
