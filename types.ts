

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: number;
  author: string;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  subtasks: Subtask[];
  comments: Comment[];
  assigneeIds: string[]; // List of User IDs assigned to this task
  startDate?: number;
  dueDate?: number;
  createdAt: number;
  
  // Optional fields for Search Results context
  boardId?: string;
  boardTitle?: string;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  order: number;
}

export interface Board {
  id: string;
  title: string;
  background: string; // Hex or generic name
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string; // Storing plain/simple hash for mock
  initials: string;
  avatarUrl?: string;
}

// For Drag and Drop
export interface DragItem {
  id: string;
  type: 'TASK' | 'COLUMN';
  fromColumnId?: string;
}