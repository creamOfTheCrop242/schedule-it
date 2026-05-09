import './config/load-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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
    ssl:
      (serverConfig as { ssl?: { rejectUnauthorized: boolean } }).ssl ??
      undefined,
  });

  try {
    await client.connect();

    try {
      await client.query(
        `ALTER TYPE goal_definitions_metric_enum ADD VALUE IF NOT EXISTS 'LOGS_COMPLETED'`,
      );
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (
        err.code === '42710' ||
        (err.message && /already exists/.test(err.message))
      ) {
        // Value already in enum, ignore
      } else if (err.code === '42704') {
        // Type does not exist yet (fresh DB), TypeORM will create it
        return;
      } else {
        try {
          await client.query(
            `ALTER TYPE goal_definitions_metric_enum ADD VALUE 'LOGS_COMPLETED'`,
          );
        } catch (e2: unknown) {
          const err2 = e2 as { code?: string; message?: string };
          if (
            err2.code !== '42710' &&
            err2.code !== '42704' &&
            (!err2.message || !/already exists/.test(err2.message))
          )
            throw e2;
        }
      }
    }

    const r = await client
      .query(
        `UPDATE goal_definitions SET metric = 'LOGS_COMPLETED'::goal_definitions_metric_enum WHERE metric = 'TASKS_COMPLETED'::goal_definitions_metric_enum`,
      )
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42P01') return { rowCount: 0 }; // table does not exist yet
        throw e;
      });
    if (r.rowCount && r.rowCount > 0) {
      console.log(
        `[migrate] Updated ${r.rowCount} goal_definitions from TASKS_COMPLETED to LOGS_COMPLETED`,
      );
    }

    try {
      await client.query(
        `ALTER TYPE goal_definitions_metric_enum ADD VALUE IF NOT EXISTS 'LOGS_ADDED'`,
      );
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (
        err.code === '42710' ||
        (err.message && /already exists/.test(err.message))
      ) {
        // Value already in enum, ignore
      } else if (err.code === '42704') {
        // Type does not exist yet (fresh DB), TypeORM will create it
      } else {
        try {
          await client.query(
            `ALTER TYPE goal_definitions_metric_enum ADD VALUE 'LOGS_ADDED'`,
          );
        } catch (e2: unknown) {
          const err2 = e2 as { code?: string; message?: string };
          if (
            err2.code !== '42710' &&
            err2.code !== '42704' &&
            (!err2.message || !/already exists/.test(err2.message))
          )
            throw e2;
        }
      }
    }
  } finally {
    await client.end();
  }
}

/** One-time migration: rename log.start_date -> start_time, log.due_date -> end_time so TypeORM sync does not drop columns. */
async function migrateLogDateColumns(): Promise<void> {
  const url = (serverConfig as { url?: string }).url;
  if (!url) return;

  const client = new Client({
    connectionString: url,
    ssl:
      (serverConfig as { ssl?: { rejectUnauthorized: boolean } }).ssl ??
      undefined,
  });

  try {
    await client.connect();

    await client
      .query(`ALTER TABLE log RENAME COLUMN start_date TO start_time`)
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42703') return; // column already renamed (start_date does not exist)
        if (err.code === '42P01') return; // table does not exist yet
        throw e;
      });

    await client
      .query(`ALTER TABLE log RENAME COLUMN due_date TO end_time`)
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42703') return; // column already renamed (due_date does not exist)
        if (err.code === '42P01') return; // table does not exist yet
        throw e;
      });
  } finally {
    await client.end();
  }
}

/** One-time migration: add surroundings and mood columns to log table. */
async function migrateLogSurroundingsMood(): Promise<void> {
  const url = (serverConfig as { url?: string }).url;
  if (!url) return;

  const client = new Client({
    connectionString: url,
    ssl:
      (serverConfig as { ssl?: { rejectUnauthorized: boolean } }).ssl ??
      undefined,
  });

  try {
    await client.connect();

    await client
      .query(`ALTER TABLE log ADD COLUMN IF NOT EXISTS surroundings text`)
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42701') return; // column already exists
        if (err.code === '42P01') return; // table does not exist yet
        throw e;
      });

    await client
      .query(`ALTER TABLE log ADD COLUMN IF NOT EXISTS mood text`)
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42701') return; // column already exists
        if (err.code === '42P01') return; // table does not exist yet
        throw e;
      });
  } finally {
    await client.end();
  }
}

/** One-time migration: drop log.completed; all logs are complete by model (use completedDate). */
async function migrateLogDropCompletedColumn(): Promise<void> {
  const url = (serverConfig as { url?: string }).url;
  if (!url) return;

  const client = new Client({
    connectionString: url,
    ssl:
      (serverConfig as { ssl?: { rejectUnauthorized: boolean } }).ssl ??
      undefined,
  });

  try {
    await client.connect();

    await client
      .query(`ALTER TABLE log DROP COLUMN IF EXISTS completed`)
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42P01') return; // table does not exist yet
        throw e;
      });
  } finally {
    await client.end();
  }
}

/** One-time migration: add shared category column to log and task. */
async function migrateLogTaskCategory(): Promise<void> {
  const url = (serverConfig as { url?: string }).url;
  if (!url) return;

  const client = new Client({
    connectionString: url,
    ssl:
      (serverConfig as { ssl?: { rejectUnauthorized: boolean } }).ssl ??
      undefined,
  });

  try {
    await client.connect();

    await client
      .query(`ALTER TABLE log ADD COLUMN IF NOT EXISTS category text`)
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42701') return;
        if (err.code === '42P01') return;
        throw e;
      });

    await client
      .query(`ALTER TABLE task ADD COLUMN IF NOT EXISTS category text`)
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42701') return;
        if (err.code === '42P01') return;
        throw e;
      });
  } finally {
    await client.end();
  }
}

/** One-time migration: drop log.priority (no longer used). */
async function migrateLogDropPriorityColumn(): Promise<void> {
  const url = (serverConfig as { url?: string }).url;
  if (!url) return;

  const client = new Client({
    connectionString: url,
    ssl:
      (serverConfig as { ssl?: { rejectUnauthorized: boolean } }).ssl ??
      undefined,
  });

  try {
    await client.connect();

    await client
      .query(`ALTER TABLE log DROP COLUMN IF EXISTS priority`)
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42P01') return; // table does not exist yet
        throw e;
      });
  } finally {
    await client.end();
  }
}

/** One-time migration: habit table and optional habitId on log/task (FK SET NULL on habit delete). */
async function migrateHabits(): Promise<void> {
  const url = (serverConfig as { url?: string }).url;
  if (!url) return;

  const client = new Client({
    connectionString: url,
    ssl:
      (serverConfig as { ssl?: { rejectUnauthorized: boolean } }).ssl ??
      undefined,
  });

  try {
    await client.connect();

    await client
      .query(
        `
        CREATE TABLE IF NOT EXISTS habit (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          description text,
          "accountId" integer NOT NULL REFERENCES account(id) ON DELETE CASCADE,
          "createdAt" timestamptz NOT NULL DEFAULT NOW(),
          "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
          "deletedAt" timestamptz
        )
      `,
      )
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42P07') return;
        if (err.code === '42P01') return;
        throw e;
      });

    await client
      .query(
        `CREATE INDEX IF NOT EXISTS "IDX_habit_accountId" ON habit ("accountId")`,
      )
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42P01') return;
        throw e;
      });

    await client
      .query(`ALTER TABLE log ADD COLUMN IF NOT EXISTS "habitId" uuid`)
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42701') return;
        if (err.code === '42P01') return;
        throw e;
      });

    await client
      .query(`ALTER TABLE task ADD COLUMN IF NOT EXISTS "habitId" uuid`)
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42701') return;
        if (err.code === '42P01') return;
        throw e;
      });

    await client
      .query(
        `
        DO $c$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_log_habitId'
          ) THEN
            ALTER TABLE log
              ADD CONSTRAINT "fk_log_habitId" FOREIGN KEY ("habitId") REFERENCES habit(id) ON DELETE SET NULL;
          END IF;
        END
        $c$;
      `,
      )
      .catch((e: unknown) => {
        const err = e as { code?: string; message?: string };
        if (err.message?.includes('already exists')) return;
        throw e;
      });

    await client
      .query(
        `
        DO $c$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_habitId'
          ) THEN
            ALTER TABLE task
              ADD CONSTRAINT "fk_task_habitId" FOREIGN KEY ("habitId") REFERENCES habit(id) ON DELETE SET NULL;
          END IF;
        END
        $c$;
      `,
      )
      .catch((e: unknown) => {
        const err = e as { code?: string; message?: string };
        if (err.message?.includes('already exists')) return;
        throw e;
      });

    await client
      .query(
        `ALTER TABLE habit ADD COLUMN IF NOT EXISTS cadence text NOT NULL DEFAULT 'DAY'`,
      )
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42P01') return;
        throw e;
      });

    await client
      .query(
        `ALTER TABLE habit ADD COLUMN IF NOT EXISTS "targetPerPeriod" integer NOT NULL DEFAULT 1`,
      )
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42P01') return;
        throw e;
      });
  } finally {
    await client.end();
  }
}

/** One-time migration: log_period_summary table + account.summaryTimeZone for scheduled rollups. */
async function migrateLogPeriodSummaryAndAccountTz(): Promise<void> {
  const url = (serverConfig as { url?: string }).url;
  if (!url) return;

  const client = new Client({
    connectionString: url,
    ssl:
      (serverConfig as { ssl?: { rejectUnauthorized: boolean } }).ssl ??
      undefined,
  });

  try {
    await client.connect();

    await client
      .query(
        `ALTER TABLE account ADD COLUMN IF NOT EXISTS "summaryTimeZone" varchar(64) NULL`,
      )
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42P01') return;
        throw e;
      });

    await client
      .query(
        `
        CREATE TABLE IF NOT EXISTS log_period_summary (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "accountId" integer NOT NULL REFERENCES account(id) ON DELETE CASCADE,
          "periodType" varchar(8) NOT NULL,
          "periodKey" varchar(16) NOT NULL,
          summary text NULL,
          status varchar(16) NOT NULL DEFAULT 'OK',
          "errorMessage" text NULL,
          model varchar(64) NULL,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT "UQ_log_period_summary_account_type_key" UNIQUE ("accountId", "periodType", "periodKey")
        )
      `,
      )
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42P07') return;
        if (err.code === '42P01') return;
        throw e;
      });

    await client
      .query(
        `CREATE INDEX IF NOT EXISTS "IDX_log_period_summary_account_period" ON log_period_summary ("accountId", "periodType")`,
      )
      .catch((e: unknown) => {
        const err = e as { code?: string };
        if (err.code === '42P01') return;
        throw e;
      });
  } finally {
    await client.end();
  }
}

async function bootstrap() {
  try {
    await migrateGoalMetricToLog();
  } catch (e) {
    console.warn(
      '[migrate] Goal metric migration skipped or failed:',
      (e as Error).message,
    );
  }

  try {
    await migrateLogDateColumns();
  } catch (e) {
    console.warn(
      '[migrate] Log date columns migration skipped or failed:',
      (e as Error).message,
    );
  }

  try {
    await migrateLogSurroundingsMood();
  } catch (e) {
    console.warn(
      '[migrate] Log surroundings/mood migration skipped or failed:',
      (e as Error).message,
    );
  }

  try {
    await migrateLogDropCompletedColumn();
  } catch (e) {
    console.warn(
      '[migrate] Log drop completed column skipped or failed:',
      (e as Error).message,
    );
  }

  try {
    await migrateLogDropPriorityColumn();
  } catch (e) {
    console.warn(
      '[migrate] Log drop priority column skipped or failed:',
      (e as Error).message,
    );
  }

  try {
    await migrateLogTaskCategory();
  } catch (e) {
    console.warn(
      '[migrate] Log/task category column skipped or failed:',
      (e as Error).message,
    );
  }

  try {
    await migrateHabits();
  } catch (e) {
    console.warn(
      '[migrate] Habits migration skipped or failed:',
      (e as Error).message,
    );
  }

  try {
    await migrateLogPeriodSummaryAndAccountTz();
  } catch (e) {
    console.warn(
      '[migrate] Log period summary / account timezone skipped or failed:',
      (e as Error).message,
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);

  app.use(cookieParser()); // ✅ Enables NestJS to parse cookie

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration
  const corsOptions = {
    origin: ['http://localhost:4200', 'https://app.theguidelog.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  };

  app.enableCors(corsOptions);

  await app.listen(process.env.PORT ?? 3000);
}

function printDbConnectionHelp(err: Error): void {
  const msg = err.message || '';
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|getaddrinfo|connection/i.test(msg)) {
    console.error(`
Database connection failed: ${msg}

Check your .env:
- DATABASE_URL host must be reachable (e.g. db.xxx.supabase.co for Supabase)
- For local PostgreSQL, add DB_HOST=localhost to override the host in DATABASE_URL
- For cloud DBs, set DB_SSL=true
- Copy the full connection string from your provider's dashboard
`);
  } else if (/password must be a string|SASL.*password/i.test(msg)) {
    console.error(`
Database connection failed: ${msg}

For local PostgreSQL, set DB_PASSWORD in .env (use empty string if no password):
  DB_USER=postgres
  DB_PASSWORD=your_password
  DB_NAME=postgres

Or use a full DATABASE_URL from your provider's dashboard.
`);
  }
}

bootstrap().catch((err) => {
  printDbConnectionHelp(err);
  process.exit(1);
});
