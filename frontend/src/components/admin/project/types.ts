export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: number;
  tenantId: number;
  projectId: number;
  milestoneId: number | null;
  assignedTo: number | null;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  estimatedHours: string | number;
  subtasks: Subtask[];
  orderIndex: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: number;
    name: string;
    email: string;
    profileImage: string | null;
  } | null;
  milestone?: {
    id: number;
    title: string;
  } | null;
  subtasksCount?: number;
  completedSubtasksCount?: number;
}

export interface Milestone {
  id: number;
  tenantId: number;
  projectId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  amount: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  totalTasks?: number;
  completedTasks?: number;
  progress?: number;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  profileImage: string | null;
}
