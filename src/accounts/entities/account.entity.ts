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

  @Column()
  password: string;

  @Column({ nullable: true })
  profileImage: string;

  @DeleteDateColumn()
  deletedAt?: Date;

  // @OneToMany(() => Task, (task) => task.account)
  // tasks: Task[];

  // @OneToMany(() => List, (list) => list.account)
  // lists: List[];

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
