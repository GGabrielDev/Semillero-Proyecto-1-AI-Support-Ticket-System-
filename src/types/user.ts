export type UserRole = 'user' | 'agent' | 'admin';

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
