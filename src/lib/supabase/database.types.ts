export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      blog_posts: {
        Row: {
          avatar_url: string | null
          body_html: string
          created_at: string
          image_url: string | null
          published_at: string | null
          slug: string
          title: string
        }
        Insert: {
          avatar_url?: string | null
          body_html: string
          created_at?: string
          image_url?: string | null
          published_at?: string | null
          slug: string
          title: string
        }
        Update: {
          avatar_url?: string | null
          body_html?: string
          created_at?: string
          image_url?: string | null
          published_at?: string | null
          slug?: string
          title?: string
        }
        Relationships: []
      }
      board_status_pages: {
        Row: {
          allowed_ips: string[]
          board_id: string
          company_name: string | null
          created_at: string
          enabled: boolean
          hide_branding: boolean
          id: string
          logo_url: string | null
          password_hash: string | null
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_ips?: string[]
          board_id: string
          company_name?: string | null
          created_at?: string
          enabled?: boolean
          hide_branding?: boolean
          id?: string
          logo_url?: string | null
          password_hash?: string | null
          slug: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          allowed_ips?: string[]
          board_id?: string
          company_name?: string | null
          created_at?: string
          enabled?: boolean
          hide_branding?: boolean
          id?: string
          logo_url?: string | null
          password_hash?: string | null
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_status_pages_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: true
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          id: string
          name: string
          service_slugs: string[]
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          service_slugs?: string[]
          user_id?: string
        }
        Update: {
          id?: string
          name?: string
          service_slugs?: string[]
          user_id?: string
        }
        Relationships: []
      }
      catalog: {
        Row: {
          category: string
          component_name_prefix: string | null
          host: string
          name: string
          slug: string
        }
        Insert: {
          category?: string
          component_name_prefix?: string | null
          host: string
          name: string
          slug: string
        }
        Update: {
          category?: string
          component_name_prefix?: string | null
          host?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          user_id?: string | null
        }
        Relationships: []
      }
      incident_event_deliveries: {
        Row: {
          delivered_at: string
          event_id: number
          integration_id: string
        }
        Insert: {
          delivered_at?: string
          event_id: number
          integration_id: string
        }
        Update: {
          delivered_at?: string
          event_id?: number
          integration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_event_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "incident_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_event_deliveries_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_events: {
        Row: {
          event_type: string
          id: number
          incident_id: string
          occurred_at: string
          service_slug: string
          update_id: string | null
        }
        Insert: {
          event_type: string
          id?: never
          incident_id: string
          occurred_at?: string
          service_slug: string
          update_id?: string | null
        }
        Update: {
          event_type?: string
          id?: never
          incident_id?: string
          occurred_at?: string
          service_slug?: string
          update_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_events_service_slug_incident_id_fkey"
            columns: ["service_slug", "incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["service_slug", "id"]
          },
        ]
      }
      incident_updates: {
        Row: {
          affected_components: Json | null
          body: string
          created_at: string
          custom_tweet: string | null
          deliver_notifications: boolean
          display_at: string | null
          id: string
          incident_id: string
          service_slug: string
          status: string
          tweet_id: string | null
          updated_at: string
        }
        Insert: {
          affected_components?: Json | null
          body: string
          created_at: string
          custom_tweet?: string | null
          deliver_notifications?: boolean
          display_at?: string | null
          id: string
          incident_id: string
          service_slug: string
          status: string
          tweet_id?: string | null
          updated_at: string
        }
        Update: {
          affected_components?: Json | null
          body?: string
          created_at?: string
          custom_tweet?: string | null
          deliver_notifications?: boolean
          display_at?: string | null
          id?: string
          incident_id?: string
          service_slug?: string
          status?: string
          tweet_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_updates_service_slug_incident_id_fkey"
            columns: ["service_slug", "incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["service_slug", "id"]
          },
        ]
      }
      incidents: {
        Row: {
          components: Json | null
          created_at: string
          id: string
          impact: string
          monitoring_at: string | null
          name: string
          resolved_at: string | null
          service_slug: string
          shortlink: string | null
          status: string
          updated_at: string
        }
        Insert: {
          components?: Json | null
          created_at: string
          id: string
          impact: string
          monitoring_at?: string | null
          name: string
          resolved_at?: string | null
          service_slug: string
          shortlink?: string | null
          status: string
          updated_at: string
        }
        Update: {
          components?: Json | null
          created_at?: string
          id?: string
          impact?: string
          monitoring_at?: string | null
          name?: string
          resolved_at?: string | null
          service_slug?: string
          shortlink?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_recipients: {
        Row: {
          channel: string
          created_at: string
          id: string
          integration_id: string
          value: string
          verification_code: string | null
          verification_expires_at: string | null
          verified: boolean
          webhook_secret: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          integration_id: string
          value: string
          verification_code?: string | null
          verification_expires_at?: string | null
          verified?: boolean
          webhook_secret?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          integration_id?: string
          value?: string
          verification_code?: string | null
          verification_expires_at?: string | null
          verified?: boolean
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_recipients_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          excluded_service_slugs: string[] | null
          id: string
          name: string
          notify_impacts: string[]
          slug: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          excluded_service_slugs?: string[] | null
          id?: string
          name: string
          notify_impacts?: string[]
          slug: string
          user_id?: string
          webhook_url?: string | null
        }
        Update: {
          excluded_service_slugs?: string[] | null
          id?: string
          name?: string
          notify_impacts?: string[]
          slug?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      keyword_match_keywords: {
        Row: {
          external_id: string
          keyword: string
          source: string
        }
        Insert: {
          external_id: string
          keyword: string
          source: string
        }
        Update: {
          external_id?: string
          keyword?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyword_match_keywords_match_fkey"
            columns: ["source", "external_id"]
            isOneToOne: false
            referencedRelation: "keyword_matches"
            referencedColumns: ["source", "external_id"]
          },
        ]
      }
      keyword_matches: {
        Row: {
          author: string
          captured_at: string
          external_id: string
          kind: string
          metadata: Json | null
          published_at: string
          snippet: string
          source: string
          title: string
          url: string
        }
        Insert: {
          author: string
          captured_at?: string
          external_id: string
          kind: string
          metadata?: Json | null
          published_at: string
          snippet: string
          source: string
          title: string
          url: string
        }
        Update: {
          author?: string
          captured_at?: string
          external_id?: string
          kind?: string
          metadata?: Json | null
          published_at?: string
          snippet?: string
          source?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      keyword_source_settings: {
        Row: {
          enabled: boolean
          source: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          source: string
          user_id?: string
        }
        Update: {
          enabled?: boolean
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      keyword_watches: {
        Row: {
          created_at: string
          id: string
          keyword: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          keyword: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenance_reminder_deliveries: {
        Row: {
          maintenance_id: string
          rule_id: string
          scheduled_for: string
          sent_at: string
          sent_early: boolean
          service_slug: string
        }
        Insert: {
          maintenance_id: string
          rule_id: string
          scheduled_for: string
          sent_at?: string
          sent_early?: boolean
          service_slug: string
        }
        Update: {
          maintenance_id?: string
          rule_id?: string
          scheduled_for?: string
          sent_at?: string
          sent_early?: boolean
          service_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_reminder_deliverie_service_slug_maintenance_id_fkey"
            columns: ["service_slug", "maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenances"
            referencedColumns: ["service_slug", "id"]
          },
          {
            foreignKeyName: "maintenance_reminder_deliveries_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_reminder_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_reminder_rules: {
        Row: {
          channels: string[]
          created_at: string
          id: string
          minutes_before: number
          service_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channels: string[]
          created_at?: string
          id?: string
          minutes_before: number
          service_slug: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          id?: string
          minutes_before?: number
          service_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenance_updates: {
        Row: {
          affected_components: Json | null
          body: string
          created_at: string
          custom_tweet: string | null
          deliver_notifications: boolean
          display_at: string | null
          id: string
          maintenance_id: string
          service_slug: string
          status: string
          tweet_id: string | null
          updated_at: string
        }
        Insert: {
          affected_components?: Json | null
          body: string
          created_at: string
          custom_tweet?: string | null
          deliver_notifications?: boolean
          display_at?: string | null
          id: string
          maintenance_id: string
          service_slug: string
          status: string
          tweet_id?: string | null
          updated_at: string
        }
        Update: {
          affected_components?: Json | null
          body?: string
          created_at?: string
          custom_tweet?: string | null
          deliver_notifications?: boolean
          display_at?: string | null
          id?: string
          maintenance_id?: string
          service_slug?: string
          status?: string
          tweet_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_updates_service_slug_maintenance_id_fkey"
            columns: ["service_slug", "maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenances"
            referencedColumns: ["service_slug", "id"]
          },
        ]
      }
      maintenances: {
        Row: {
          components: Json | null
          created_at: string
          id: string
          impact: string
          monitoring_at: string | null
          name: string
          resolved_at: string | null
          scheduled_for: string
          scheduled_until: string
          service_slug: string
          shortlink: string | null
          status: string
          updated_at: string
        }
        Insert: {
          components?: Json | null
          created_at: string
          id: string
          impact: string
          monitoring_at?: string | null
          name: string
          resolved_at?: string | null
          scheduled_for: string
          scheduled_until: string
          service_slug: string
          shortlink?: string | null
          status: string
          updated_at: string
        }
        Update: {
          components?: Json | null
          created_at?: string
          id?: string
          impact?: string
          monitoring_at?: string | null
          name?: string
          resolved_at?: string | null
          scheduled_for?: string
          scheduled_until?: string
          service_slug?: string
          shortlink?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      poll_run_lock: {
        Row: {
          last_success_at: string | null
          running: boolean
          shard_key: string
          started_at: string | null
        }
        Insert: {
          last_success_at?: string | null
          running?: boolean
          shard_key: string
          started_at?: string | null
        }
        Update: {
          last_success_at?: string | null
          running?: boolean
          shard_key?: string
          started_at?: string | null
        }
        Relationships: []
      }
      polled_services: {
        Row: {
          first_polled_at: string
          service_slug: string
          total_downtime_seconds: number
        }
        Insert: {
          first_polled_at?: string
          service_slug: string
          total_downtime_seconds?: number
        }
        Update: {
          first_polled_at?: string
          service_slug?: string
          total_downtime_seconds?: number
        }
        Relationships: []
      }
      report_settings: {
        Row: {
          created_at: string
          email_nudge_enabled: boolean
          excluded_board_ids: string[] | null
          report_interval: string
          reported_intervals: string[]
          test_send_count: number
          test_send_window_start: string | null
          time_zone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_nudge_enabled?: boolean
          excluded_board_ids?: string[] | null
          report_interval?: string
          reported_intervals?: string[]
          test_send_count?: number
          test_send_window_start?: string | null
          time_zone?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          email_nudge_enabled?: boolean
          excluded_board_ids?: string[] | null
          report_interval?: string
          reported_intervals?: string[]
          test_send_count?: number
          test_send_window_start?: string | null
          time_zone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          generated_at: string
          id: string
          payload: Json
          period_end: string
          period_start: string
          report_interval: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          payload: Json
          period_end: string
          period_start: string
          report_interval: string
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          payload?: Json
          period_end?: string
          period_start?: string
          report_interval?: string
          user_id?: string
        }
        Relationships: []
      }
      service_component_filters: {
        Row: {
          component_id: string
          service_slug: string
          user_id: string
        }
        Insert: {
          component_id: string
          service_slug: string
          user_id?: string
        }
        Update: {
          component_id?: string
          service_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      status_page_password_attempts: {
        Row: {
          failed_count: number
          id: string
          ip_hash: string
          status_page_id: string
          window_start: string
        }
        Insert: {
          failed_count?: number
          id?: string
          ip_hash: string
          status_page_id: string
          window_start?: string
        }
        Update: {
          failed_count?: number
          id?: string
          ip_hash?: string
          status_page_id?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_page_password_attempts_status_page_id_fkey"
            columns: ["status_page_id"]
            isOneToOne: false
            referencedRelation: "board_status_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          billing_interval?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_uptime_stats: {
        Args: { p_service_slug: string }
        Returns: {
          open_incident_seconds: number
          total_downtime_seconds: number
          tracked_since: string
        }[]
      }
      incident_counts_by_service: {
        Args: never
        Returns: {
          count: number
          service_slug: string
        }[]
      }
      set_component_filter: {
        Args: { p_component_ids: string[]; p_service_slug: string }
        Returns: undefined
      }
      upsert_incident: {
        Args: {
          p_components: Json
          p_created_at: string
          p_id: string
          p_impact: string
          p_monitoring_at: string
          p_name: string
          p_resolved_at: string
          p_service_slug: string
          p_shortlink: string
          p_status: string
          p_updated_at: string
        }
        Returns: undefined
      }
      upsert_incident_update: {
        Args: {
          p_affected_components: Json
          p_body: string
          p_created_at: string
          p_custom_tweet: string
          p_deliver_notifications: boolean
          p_display_at: string
          p_id: string
          p_incident_id: string
          p_service_slug: string
          p_status: string
          p_tweet_id: string
          p_updated_at: string
        }
        Returns: undefined
      }
      upsert_incident_updates_bulk: {
        Args: { p_service_slug: string; p_updates: Json }
        Returns: number
      }
      upsert_incidents_bulk: {
        Args: { p_incidents: Json; p_service_slug: string }
        Returns: number
      }
      upsert_maintenance: {
        Args: {
          p_components: Json
          p_created_at: string
          p_id: string
          p_impact: string
          p_monitoring_at: string
          p_name: string
          p_resolved_at: string
          p_scheduled_for: string
          p_scheduled_until: string
          p_service_slug: string
          p_shortlink: string
          p_status: string
          p_updated_at: string
        }
        Returns: undefined
      }
      upsert_maintenance_update: {
        Args: {
          p_affected_components: Json
          p_body: string
          p_created_at: string
          p_custom_tweet: string
          p_deliver_notifications: boolean
          p_display_at: string
          p_id: string
          p_maintenance_id: string
          p_service_slug: string
          p_status: string
          p_tweet_id: string
          p_updated_at: string
        }
        Returns: undefined
      }
      upsert_maintenance_updates_bulk: {
        Args: { p_service_slug: string; p_updates: Json }
        Returns: number
      }
      upsert_maintenances_bulk: {
        Args: { p_maintenances: Json; p_service_slug: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
