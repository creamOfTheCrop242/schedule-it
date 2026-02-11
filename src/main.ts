import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Client } from 'pg';
import { serverConfig } from './config/server-config';

/** One-time migration: ensure goal_definitions.metric can use LOGS_COMPLETED and migrate existing TASKS_COMPLETED rows so TypeORM sync can alter the enum. */
async function migrateGoalMetricToLog(): Promise<void> {
  const url = (serverConfig as { url?: string }).url;
  if (!url) return;

  const client = new Client({
    connectionString: url,
    ssl: (serverConfig as { ssl?: { rejectUnauthorized: boolean } }).ssl ?? undefined,
  });

  try {
    await client.connect();

    try {
      await client.query(`ALTER TYPE goal_definitions_metric_enum ADD VALUE IF NOT EXISTS 'LOGS_COMPLETED'`);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === '42710' || (err.message && /already exists/.test(err.message))) {
        // Value already in enum, ignore
      } else if (err.code === '42704') {
        // Type does not exist yet (fresh DB), TypeORM will create it
        return;
      } else {
        try {
          await client.query(`ALTER TYPE goal_definitions_metric_enum ADD VALUE 'LOGS_COMPLETED'`);
        } catch (e2: unknown) {
          const err2 = e2 as { code?: string; message?: string };
          if (err2.code !== '42710' && err2.code !== '42704' && (!err2.message || !/already exists/.test(err2.message))) throw e2;
        }
      }
    }

    const r = await client.query(
      `UPDATE goal_definitions SET metric = 'LOGS_COMPLETED'::goal_definitions_metric_enum WHERE metric = 'TASKS_COMPLETED'::goal_definitions_metric_enum`
    ).catch((e: unknown) => {
      const err = e as { code?: string };
      if (err.code === '42P01') return { rowCount: 0 }; // table does not exist yet
      throw e;
    });
    if (r.rowCount && r.rowCount > 0) {
      console.log(`[migrate] Updated ${r.rowCount} goal_definitions from TASKS_COMPLETED to LOGS_COMPLETED`);
    }
  } finally {
    await client.end();
  }
}

async function bootstrap() {
  try {
    await migrateGoalMetricToLog();
  } catch (e) {
    console.warn('[migrate] Goal metric migration skipped or failed:', (e as Error).message);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);

  app.use(cookieParser()); // ✅ Enables NestJS to parse cookie
  app.use((req, _res, next) => {
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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
