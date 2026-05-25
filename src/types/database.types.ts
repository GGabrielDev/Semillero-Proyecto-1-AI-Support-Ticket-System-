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
          ai_suggested_priority: 'low' | 'medium' | 'high' | 'critical' | null;
          ai_suggested_reply: string | null;
          ai_analysis_json: Json | null;
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
          ai_suggested_priority?: 'low' | 'medium' | 'high' | 'critical' | null;
          ai_suggested_reply?: string | null;
          ai_analysis_json?: Json | null;
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
          ai_suggested_priority?: 'low' | 'medium' | 'high' | 'critical' | null;
          ai_suggested_reply?: string | null;
          ai_analysis_json?: Json | null;
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
          prompt_text: string | null;
          model_version: string | null;
          result_json: Json | null;
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
          prompt_text?: string | null;
          model_version?: string | null;
          result_json?: Json | null;
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
          prompt_text?: string | null;
          model_version?: string | null;
          result_json?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_pending_actions: {
        Row: {
          id: string;
          ticket_id: string;
          action_type: 'escalate' | 'close' | 'assign' | 'request_info';
          ai_suggestion: Json;
          status: 'pending' | 'approved' | 'rejected';
          decided_by: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          action_type: 'escalate' | 'close' | 'assign' | 'request_info';
          ai_suggestion: Json;
          status?: 'pending' | 'approved' | 'rejected';
          decided_by?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          action_type?: 'escalate' | 'close' | 'assign' | 'request_info';
          ai_suggestion?: Json;
          status?: 'pending' | 'approved' | 'rejected';
          decided_by?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          ticket_id: string | null;
          type: 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'high_priority' | 'ai_action_pending';
          channel: 'in_app' | 'email' | 'slack';
          title: string;
          body: string | null;
          read: boolean;
          delivered: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ticket_id?: string | null;
          type: 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'high_priority' | 'ai_action_pending';
          channel?: 'in_app' | 'email' | 'slack';
          title: string;
          body?: string | null;
          read?: boolean;
          delivered?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ticket_id?: string | null;
          type?: 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'high_priority' | 'ai_action_pending';
          channel?: 'in_app' | 'email' | 'slack';
          title?: string;
          body?: string | null;
          read?: boolean;
          delivered?: boolean;
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
