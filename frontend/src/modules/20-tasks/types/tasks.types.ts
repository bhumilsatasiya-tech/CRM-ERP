export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'med' | 'high';

export interface Reminder {
  id: number;
  notify_at: string;
  channel: 'email' | 'in_app';
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string | null;
}

export interface Task {
  id: number;
  company_id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  assignee_id?: number | null;
  assignee?: { id: number; name: string; email?: string } | null;
  status: TaskStatus;
  priority: TaskPriority;
  related_type?: string | null;
  related_id?: number | null;
  google_event_id?: string | null;
  google_synced_at?: string | null;
  completed_at?: string | null;
  reminders?: Reminder[];
  created_at?: string;
}
