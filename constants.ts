
import { Board, Column, Task } from './types';

export const INITIAL_BOARD: Board = {
  id: 'board-1',
  title: 'Product Launch 🚀',
  background: 'bg-gradient-to-r from-blue-500 to-blue-600',
};

export const INITIAL_COLUMNS: Column[] = [
  { id: 'col-1', boardId: 'board-1', title: 'To Do', order: 0 },
  { id: 'col-2', boardId: 'board-1', title: 'In Progress', order: 1 },
  { id: 'col-3', boardId: 'board-1', title: 'Review', order: 2 },
  { id: 'col-4', boardId: 'board-1', title: 'Done', order: 3 },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    columnId: 'col-1',
    title: 'Design System Draft',
    description: 'Create initial color palette and typography for the new app.',
    priority: 'high',
    subtasks: [
      { id: 'st-1', title: 'Pick primary colors', completed: true },
      { id: 'st-2', title: 'Select font family', completed: false },
    ],
    comments: [],
    assigneeIds: [],
    startDate: Date.now(),
    dueDate: Date.now() + 86400000 * 2, // 2 days later
    createdAt: Date.now(),
  },
  {
    id: 'task-2',
    columnId: 'col-1',
    title: 'Setup Database Schema',
    description: 'Define tables for users, tasks, and boards.',
    priority: 'high',
    subtasks: [],
    comments: [],
    assigneeIds: [],
    createdAt: Date.now() - 100000,
  },
  {
    id: 'task-3',
    columnId: 'col-2',
    title: 'Gemini Integration',
    description: 'Connect to Google GenAI for smart task descriptions.',
    priority: 'medium',
    subtasks: [],
    comments: [],
    assigneeIds: [],
    startDate: Date.now() - 86400000,
    dueDate: Date.now() + 86400000,
    createdAt: Date.now() - 200000,
  },
];
