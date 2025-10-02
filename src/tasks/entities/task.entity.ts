import { Account } from 'src/accounts/entities/account.entity';
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

export type TaskPriority = 'Low' | 'Medium' | 'High';

@Entity('task') // keep table name stable
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ['Low', 'Medium', 'High'],
    enumName: 'task_priority_enum', // prevents enum churn on deploys
    default: 'Medium',
  })
  priority: TaskPriority;

  // ---- timestamps (with zone!) ----
  @Column({ type: 'timestamptz', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  completedDate: Date | null;

  // self-reference (optional: cascade delete to null)
  @ManyToOne(() => Task, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'dependencyTaskId' })
  dependencyTask: Task | null;

  @OneToMany(() => Note, (note) => note.task)
  notes: Note[]; // was Note

  @ManyToOne(() => Account, (account) => account.tasks, { nullable: false })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
