import { Account } from 'src/accounts/entities/account.entity';
import { Habit } from 'src/habits/entities/habit.entity';
import { PersonalGoal } from 'src/personal-goals/entities/personal-goal.entity';
import { Note } from 'src/notes/entities/note.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';

@Entity('log')
export class Log {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  surroundings: string | null;

  @Column({ type: 'text', nullable: true })
  mood: string | null;

  /** Shared label with tasks; optional taxonomy for filtering. */
  @Column({ type: 'text', nullable: true })
  category: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startTime: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endTime: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedDate: Date | null;

  @ManyToOne(() => Log, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'dependencyLogId' })
  dependencyLog: Log | null;

  @OneToMany(() => Note, (note) => note.log)
  notes: Note[];

  @ManyToOne(() => Account, (account) => account.logs, { nullable: false })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @ManyToOne(() => Habit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'habitId' })
  habit: Habit | null;

  @ManyToOne(() => PersonalGoal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'personalGoalId' })
  personalGoal: PersonalGoal | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
