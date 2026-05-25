export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: 'user' | 'agent' | 'admin';
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: 'user' | 'agent' | 'admin';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: 'user' | 'agent' | 'admin';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tickets: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: 'open' | 'in_progress' | 'resolved' | 'closed';
          priority: 'low' | 'medium' | 'high' | 'critical';
          category: string | null;
          created_by: string | null;
          assigned_to: string | null;
          ai_summary: string | null;
          ai_suggested_priority: string | null;
          ai_suggested_reply: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          status?: 'open' | 'in_progress' | 'resolved' | 'closed';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          category?: string | null;
          created_by?: string | null;
          assigned_to?: string | null;
          ai_summary?: string | null;
          ai_suggested_priority?: string | null;
          ai_suggested_reply?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: 'open' | 'in_progress' | 'resolved' | 'closed';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          category?: string | null;
          created_by?: string | null;
          assigned_to?: string | null;
          ai_summary?: string | null;
          ai_suggested_priority?: string | null;
          ai_suggested_reply?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ticket_comments: {
        Row: {
          id: string;
          ticket_id: string;
          author_id: string | null;
          content: string;
          is_internal: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          author_id?: string | null;
          content: string;
          is_internal?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          author_id?: string | null;
          content?: string;
          is_internal?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_events: {
        Row: {
          id: string;
          ticket_id: string | null;
          event_type: 'analyze' | 'suggest_reply' | 'prioritize';
          provider: 'llama' | 'google';
          latency_ms: number | null;
          success: boolean;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id?: string | null;
          event_type: 'analyze' | 'suggest_reply' | 'prioritize';
          provider: 'llama' | 'google';
          latency_ms?: number | null;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string | null;
          event_type?: 'analyze' | 'suggest_reply' | 'prioritize';
          provider?: 'llama' | 'google';
          latency_ms?: number | null;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
