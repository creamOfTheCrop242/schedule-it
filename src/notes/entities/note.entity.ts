import { Account } from 'src/accounts/entities/account.entity';
import { Task } from 'src/tasks/entities/task.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => Account, (account) => account.notes, { onDelete: 'CASCADE' })
  account: Account;

  @ManyToOne(() => Task, (task) => task.notes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  task: Task;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
