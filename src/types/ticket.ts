import type { Database } from '@/types/database.types';
import type { AppUser } from '@/types/user';

export type TicketStatus = Database['public']['Tables']['tickets']['Row']['status'];
export type TicketPriority = Database['public']['Tables']['tickets']['Row']['priority'];
export type AiPendingAction = Database['public']['Tables']['ai_pending_actions']['Row'];

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
  author?: Pick<AppUser, 'id' | 'email' | 'full_name' | 'avatar_url'> | null;
}

export type Ticket = Database['public']['Tables']['tickets']['Row'] & {
  creator?: Pick<AppUser, 'id' | 'email' | 'full_name' | 'avatar_url'> | null;
  assignee?: Pick<AppUser, 'id' | 'email' | 'full_name' | 'avatar_url'> | null;
  comments?: TicketComment[];
};
