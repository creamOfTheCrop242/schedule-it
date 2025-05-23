import { Account } from 'src/accounts/entities/account.entity';
import { Note } from 'src/notes/entities/note.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';

@Entity()
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ['Low', 'Medium', 'High'], default: 'Medium' })
  priority: string;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedDate: Date;

  @ManyToOne(() => Task, { nullable: true })
  dependencyTask: Task;

  //   @ManyToOne(() => Workout, { nullable: true })
  //   workout: Workout;

  //   @ManyToOne(() => Reminder, { nullable: true })
  //   reminder: Reminder;

  //   @ManyToOne(() => List, { nullable: true })
  //   list: List; // A task can now be linked to a list.

  @OneToMany(() => Note, (note) => note.task)
  notes: Note;

  @ManyToOne(() => Account, (account) => account.tasks)
  account: Account;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
