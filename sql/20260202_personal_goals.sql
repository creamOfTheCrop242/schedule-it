-- Production migration (TypeORM synchronize is off in NODE_ENV=production).
-- Run against the app database before deploying code that expects these objects.

CREATE TABLE IF NOT EXISTS personal_goal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NULL,
  "targetDate" date NULL,
  "accountId" integer NOT NULL REFERENCES account (id) ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "deletedAt" timestamptz NULL
);

CREATE INDEX IF NOT EXISTS "IDX_personal_goal_accountId" ON personal_goal ("accountId");

ALTER TABLE log
  ADD COLUMN IF NOT EXISTS "personalGoalId" uuid NULL REFERENCES personal_goal (id) ON DELETE SET NULL;

ALTER TABLE task
  ADD COLUMN IF NOT EXISTS "personalGoalId" uuid NULL REFERENCES personal_goal (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "IDX_log_personalGoalId" ON log ("personalGoalId") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "IDX_task_personalGoalId" ON task ("personalGoalId") WHERE "deletedAt" IS NULL;
