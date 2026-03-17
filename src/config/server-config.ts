import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Account } from 'src/accounts/entities/account.entity';
import { EmailVerification } from 'src/auth/entities/email-verification.entity';
import { Note } from 'src/notes/entities/note.entity';
import { Log } from 'src/logs/entities/log.entity';
import { GoalDefinition } from 'src/goals/entities/goal-definition.entity';
import { GoalProgress } from 'src/goals/entities/goal-progress.entity';

function getDbConfig() {
  const ssl =
    process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false;
  const url =
    process.env.DATABASE_URL ||
    (() => {
      const host = process.env.DB_HOST ?? 'localhost';
      const port = parseInt(process.env.DB_PORT ?? '5432', 10);
      const username = process.env.DB_USER ?? '';
      const password = process.env.DB_PASSWORD ?? '';
      const database = process.env.DB_NAME ?? '';
      return `postgres://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
    })();
  return { url, ssl };
}

export const serverConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  ...getDbConfig(),
  entities: [
    Account,
    EmailVerification,
    Note,
    Log,
    GoalDefinition,
    GoalProgress,
  ],
  synchronize: process.env.NODE_ENV !== 'production',
};
