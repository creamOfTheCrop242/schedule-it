import { Account } from 'src/accounts/entities/account.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Unique,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GoalMetric, GoalScope } from '../goals.model';
import { GoalProgress } from './goal-progress.entity';
// import { User } from '../users/user.entity'; // adjust path to match your project
// import { GoalProgress } from './goal-progress.entity';
// import { GoalScope } from './goal-scope.enum';
// import { GoalMetric } from './goal-metric.enum';

@Entity('goal_definitions')
@Unique('uniq_user_metric_scope', ['account', 'metric', 'scope'])
export class GoalDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 🔗 The user who owns this goal
  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @Index()
  account: Account;

  // 📊 What this goal is measuring
  // e.g., TASKS_COMPLETED, HABITS_COMPLETED, WORKOUTS_DONE, etc.
  @Column({ type: 'enum', enum: GoalMetric })
  @Index()
  metric: GoalMetric;

  //   // ⏳ The frequency of this goal — DAY, WEEK, MONTH, or YEAR
  @Column({ type: 'enum', enum: GoalScope })
  @Index()
  scope: GoalScope;

  // 🎯 The target number (e.g. "10 tasks/day", "50 tasks/week")
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  targetValue: string;

  // ⚙️ Optional filters — can narrow goals by project, tag, etc.
  // Example: { "projectId": "abc123", "tag": "Health" }
  @Column({ type: 'jsonb', nullable: true })
  filters?: Record<string, any>;

  // 📈 Relationship: a goal can have many progress rows (one per period)
  @OneToMany(() => GoalProgress, (progress) => progress.goal, { cascade: true })
  progressRows: GoalProgress[];

  // 🕓 Automatic timestamps
  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
