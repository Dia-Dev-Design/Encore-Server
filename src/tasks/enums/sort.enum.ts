export enum TaskSortOptions {
  taskId = 'taskID',
  companyName = 'companyName',
  category = 'category',
  description = 'description',
  assignedToName = 'assignedToName',
  createdAt = 'createdAt',
  dueDate = 'dueDate',
  progress = 'progress',
}

export const TaskSortObject = {
  [TaskSortOptions.createdAt]: 'createdAt',
  [TaskSortOptions.category]: 'category',
  [TaskSortOptions.description]: 'description',
  [TaskSortOptions.dueDate]: 'dueDate',
  [TaskSortOptions.progress]: 'progress',
  [TaskSortOptions.taskId]: 'id',
};
