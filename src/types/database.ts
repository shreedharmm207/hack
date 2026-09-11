// ─── Supabase Database Type Definitions ──────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: 'farmer' | 'organization' | 'admin';
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      farmers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string;
          phone: string | null;
          village: string | null;
          district: string | null;
          state: string | null;
          lat: number;
          lng: number;
          farm_size_acres: number;
          primary_crop: string | null;
          crop_stage: string | null;
          allocation_attempts: number;
          successful_allocations: number;
          consecutive_losses: number;
          waiting_started_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['farmers']['Row'], 'id' | 'created_at' | 'allocation_attempts' | 'successful_allocations' | 'consecutive_losses'>;
        Update: Partial<Database['public']['Tables']['farmers']['Row']>;
      };
      organizations: {
        Row: {
          id: string;
          user_id: string;
          org_name: string;
          contact_person: string | null;
          contact_number: string | null;
          address: string | null;
          operational_region: string | null;
          org_type: 'private_company' | 'cooperative' | 'ngo' | 'government' | null;
          is_approved: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'is_approved'>;
        Update: Partial<Database['public']['Tables']['organizations']['Row']>;
      };
      resources: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          category: string;
          description: string | null;
          quantity: number;
          status: 'available' | 'allocated' | 'maintenance' | 'retired';
          daily_rate: number | null;
          lat: number | null;
          lng: number | null;
          operating_hours_start: number;
          operating_hours_end: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['resources']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['resources']['Row']>;
      };
      requests: {
        Row: {
          id: string;
          farmer_id: string;
          organization_id: string | null;
          resource_id: string | null;
          resource_type: string;
          resource_needed: string;
          earliest_start: string;
          latest_end: string;
          duration_days: number;
          crop_stage: string;
          urgency_level: string;
          urgency_reason: string | null;
          farm_lat: number | null;
          farm_lng: number | null;
          additional_notes: string | null;
          status: string;
          priority_score: number | null;
          priority_breakdown: Record<string, unknown> | null;
          allocation_method: string | null;
          waitlist_reason: string | null;
          manual_review_reason: string | null;
          voice_request: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['requests']['Row'], 'id' | 'created_at' | 'updated_at' | 'status'>;
        Update: Partial<Database['public']['Tables']['requests']['Row']>;
      };
      allocations: {
        Row: {
          id: string;
          request_id: string;
          resource_id: string;
          farmer_id: string;
          organization_id: string;
          scheduled_start: string;
          scheduled_end: string;
          status: string;
          priority_score: number | null;
          priority_breakdown: Record<string, unknown> | null;
          allocation_method: string;
          fcfs_tiebreak: boolean;
          tiebreak_explanation: string | null;
          admin_note: string | null;
          cancelled_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['allocations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['allocations']['Row']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: 'success' | 'warning' | 'info' | 'error';
          is_read: boolean;
          entity_type: string | null;
          entity_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'is_read'>;
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_name: string;
          actor_role: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: string | null;
          metadata: Record<string, unknown> | null;
          previous_state: Record<string, unknown> | null;
          new_state: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      conflicts: {
        Row: {
          id: string;
          resource_id: string;
          request_ids: string[];
          ranked_requests: unknown[];
          score_delta: number;
          status: 'open' | 'auto_resolved' | 'resolved';
          resolution: string | null;
          winner_request_id: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          auto_resolved: boolean;
          admin_note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conflicts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['conflicts']['Row']>;
      };
      fairness_events: {
        Row: {
          id: string;
          farmer_id: string;
          event_type: string;
          request_id: string | null;
          priority_score: number | null;
          winner_score: number | null;
          winner_farmer_name: string | null;
          details: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['fairness_events']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      disruptions: {
        Row: {
          id: string;
          resource_id: string;
          allocation_id: string | null;
          reason: string;
          reported_by: string | null;
          status: 'active' | 'resolved' | 'unresolvable';
          resolution_note: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['disruptions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['disruptions']['Row']>;
      };
      priority_scores: {
        Row: {
          id: string;
          request_id: string;
          total_score: number;
          urgency_score: number;
          weather_score: number;
          crop_stage_score: number;
          waiting_score: number;
          logistics_score: number;
          constraints_score: number;
          explanation: string | null;
          calculated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['priority_scores']['Row'], 'id' | 'calculated_at'>;
        Update: never;
      };
    };
    Functions: {
      process_request: {
        Args: { p_request_id: string };
        Returns: Record<string, unknown>;
      };
    };
  };
};
