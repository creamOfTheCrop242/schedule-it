export interface TaskDto {
  id: string;
  name: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High';
  startDate?: Date;
  dueDate?: Date;
  completed: boolean;
  completedDate?: Date;
  dependencyTaskId?: string;
  accountId: string;
  noteIds?: string[];
  createdAt: Date;
  deletedAt?: Date;
}

export class CreateTaskDto {
  name: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  startDate?: Date;
  dueDate?: Date;
  dependencyTaskId?: string;
}

export class UpdateTaskDto {
  name?: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  startDate?: Date;
  dueDate?: Date;
  completed?: boolean;
  completedDate?: Date;
  dependencyTaskId?: string;
}
