export interface LogDto {
  id: string;
  name: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High';
  startDate?: Date;
  dueDate?: Date;
  completed: boolean;
  completedDate?: Date;
  dependencyLogId?: string;
  accountId: string;
  noteIds?: string[];
  createdAt: Date;
  deletedAt?: Date;
}

export class CreateLogDto {
  name: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  startDate?: Date;
  dueDate?: Date;
  dependencyLogId?: string;
}

export class UpdateLogDto {
  name?: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  startDate?: Date;
  dueDate?: Date;
  completed?: boolean;
  completedDate?: Date;
  dependencyLogId?: string;
}
