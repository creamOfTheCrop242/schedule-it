// goal-progress.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GoalDefinition } from './goal-definition.entity';

@Entity('goal_progress')
@Unique('uniq_goal_period', ['goal', 'periodKey'])
export class GoalProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Link to the goal blueprint
  @ManyToOne(() => GoalDefinition, (goal) => goal.progressRows, {
    onDelete: 'CASCADE',
  })
  @Index()
  goal: GoalDefinition;

  // Normalized period identifier (from computePeriod)
  // DAY: 2025-11-03 | WEEK: 2025-W45 | MONTH: 2025-11 | YEAR: 2025
  @Column({ type: 'varchar', length: 12 })
  @Index()
  periodKey: string;

  // Period boundaries (ISO yyyy-MM-dd)
  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  // Running value for this period (increments/decrements on events)
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  currentValue: string;

  // Snapshot of the target when this period row was created
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  targetSnapshot: string;

  // Convenience flag (derived as currentValue >= targetSnapshot)
  @Column({ type: 'boolean', default: false })
  completed: boolean;

  // Optional extras (timezone, source, filters applied, etc.)
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
