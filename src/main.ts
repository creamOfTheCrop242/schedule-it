import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser()); // ✅ Enables NestJS to parse cookie
  app.enableCors({
    origin: ['http://localhost:4200'], // Specify the origin you want to allow (Angular app)
    methods: 'GET,POST,PUT,DELETE, PATCH', // Specify allowed HTTP methods
    allowedHeaders: 'Content-Type,Authorization', // Specify allowed headers
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
