import { Note } from 'src/notes/entities/note.entity';
import { Log } from 'src/logs/entities/log.entity';
import { Task } from 'src/tasks/entities/task.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt?: Date;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true })
  facebookId: string;

  @Column({ nullable: true })
  profileImage: string;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => Log, (log) => log.account)
  logs: Log[];

  @OneToMany(() => Task, (task) => task.account)
  tasks: Task[];

  @OneToMany(() => Note, (note) => note.log)
  notes: Note[];

  // @OneToMany(() => List, (list) => list.account)
  // lists: List[];xs

  // @OneToMany(() => Reminder, (reminder) => reminder.account)
  // reminders: Reminder[];

  // @OneToMany(() => Habit, (habit) => habit.account)
  // habits: Habit[];

  // @OneToMany(() => HabitTracker, (habitTracker) => habitTracker.account)
  // habitTrackers: HabitTracker[];

  // @OneToMany(() => Workout, (workout) => workout.account)
  // workouts: Workout[];

  // @OneToMany(() => Note, (note) => note.account)
  // notes: Note[];
}
