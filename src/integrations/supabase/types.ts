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
      apollo_hoopay_config: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          id: string
          organization_uuid: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          organization_uuid?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          organization_uuid?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      apollo_syncpay_config: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_orders: {
        Row: {
          amount_cents: number
          created_at: string
          customer_document: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          pagseguro_order_id: string | null
          paid_at: string | null
          product_type: string
          qr_code_image_url: string | null
          qr_code_text: string | null
          quantity: number
          reseller_id: string
          status: string
          target_license_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          customer_document?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          pagseguro_order_id?: string | null
          paid_at?: string | null
          product_type?: string
          qr_code_image_url?: string | null
          qr_code_text?: string | null
          quantity: number
          reseller_id: string
          status?: string
          target_license_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          customer_document?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          pagseguro_order_id?: string | null
          paid_at?: string | null
          product_type?: string
          qr_code_image_url?: string | null
          qr_code_text?: string | null
          quantity?: number
          reseller_id?: string
          status?: string
          target_license_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_orders_target_license_id_fkey"
            columns: ["target_license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      credits_customers: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          activated_at: string
          device_name: string | null
          hwid: string
          id: string
          last_seen_at: string
          license_id: string
        }
        Insert: {
          activated_at?: string
          device_name?: string | null
          hwid: string
          id?: string
          last_seen_at?: string
          license_id: string
        }
        Update: {
          activated_at?: string
          device_name?: string | null
          hwid?: string
          id?: string
          last_seen_at?: string
          license_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      license_ip_tracking: {
        Row: {
          access_count: number
          created_at: string
          first_seen_at: string
          hwid: string | null
          id: string
          ip_address: string
          last_seen_at: string
          license_id: string
          user_agent: string | null
        }
        Insert: {
          access_count?: number
          created_at?: string
          first_seen_at?: string
          hwid?: string | null
          id?: string
          ip_address: string
          last_seen_at?: string
          license_id: string
          user_agent?: string | null
        }
        Update: {
          access_count?: number
          created_at?: string
          first_seen_at?: string
          hwid?: string | null
          id?: string
          ip_address?: string
          last_seen_at?: string
          license_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      license_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          license_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          license_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          license_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_logs_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      license_project_tracking: {
        Row: {
          first_seen_at: string
          id: string
          last_seen_at: string
          license_id: string
          message_count: number
          project_id: string
        }
        Insert: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          license_id: string
          message_count?: number
          project_id: string
        }
        Update: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          license_id?: string
          message_count?: number
          project_id?: string
        }
        Relationships: []
      }
      licenses: {
        Row: {
          created_at: string
          created_by: string | null
          customer_name: string | null
          duration_hours: number | null
          email: string
          expires_at: string
          first_activated_at: string | null
          hwid: string | null
          hwid_set_at: string | null
          id: string
          is_wildcard: boolean | null
          last_message_at: string | null
          license_key: string
          max_messages: number | null
          messages_used: number
          notes: string | null
          price: number | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["license_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          duration_hours?: number | null
          email: string
          expires_at: string
          first_activated_at?: string | null
          hwid?: string | null
          hwid_set_at?: string | null
          id?: string
          is_wildcard?: boolean | null
          last_message_at?: string | null
          license_key: string
          max_messages?: number | null
          messages_used?: number
          notes?: string | null
          price?: number | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["license_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          duration_hours?: number | null
          email?: string
          expires_at?: string
          first_activated_at?: string | null
          hwid?: string | null
          hwid_set_at?: string | null
          id?: string
          is_wildcard?: boolean | null
          last_message_at?: string | null
          license_key?: string
          max_messages?: number | null
          messages_used?: number
          notes?: string | null
          price?: number | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["license_status"]
        }
        Relationships: []
      }
      lvb_credit_orders: {
        Row: {
          amount_cents: number
          created_at: string
          creditos: number
          email_bot: string | null
          external_order_id: string | null
          id: string
          link_cliente: string | null
          payment_order_id: string | null
          pix_code_text: string | null
          pix_qr_code: string | null
          reseller_id: string
          source: string
          status: string
          updated_at: string
          workspace_id: string | null
          workspace_name: string | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          creditos: number
          email_bot?: string | null
          external_order_id?: string | null
          id?: string
          link_cliente?: string | null
          payment_order_id?: string | null
          pix_code_text?: string | null
          pix_qr_code?: string | null
          reseller_id: string
          source?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
          workspace_name?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          creditos?: number
          email_bot?: string | null
          external_order_id?: string | null
          id?: string
          link_cliente?: string | null
          payment_order_id?: string | null
          pix_code_text?: string | null
          pix_qr_code?: string | null
          reseller_id?: string
          source?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
          workspace_name?: string | null
        }
        Relationships: []
      }
      reseller_credits: {
        Row: {
          created_at: string
          credits_total: number
          credits_used: number
          id: string
          lifetime_credits_total: number
          lifetime_credits_used: number
          reseller_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_total?: number
          credits_used?: number
          id?: string
          lifetime_credits_total?: number
          lifetime_credits_used?: number
          reseller_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_total?: number
          credits_used?: number
          id?: string
          lifetime_credits_total?: number
          lifetime_credits_used?: number
          reseller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reseller_profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company: string | null
          created_at: string
          created_by: string | null
          custom_key_price: number | null
          deadline_at: string | null
          document: string | null
          id: string
          name: string
          phone: string | null
          plan_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          custom_key_price?: number | null
          deadline_at?: string | null
          document?: string | null
          id?: string
          name: string
          phone?: string | null
          plan_type?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          custom_key_price?: number | null
          deadline_at?: string | null
          document?: string | null
          id?: string
          name?: string
          phone?: string | null
          plan_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_logs: {
        Row: {
          action: string
          blocked: boolean
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          blocked?: boolean
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          blocked?: boolean
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          expires_at: string
          hwid: string
          id: string
          last_activity: string
          license_id: string
          session_token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          hwid: string
          id?: string
          last_activity?: string
          license_id: string
          session_token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          hwid?: string
          id?: string
          last_activity?: string
          license_id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      telegram_bot_states: {
        Row: {
          action: string
          created_at: string
          data: Json | null
          updated_at: string
          user_id: number
        }
        Insert: {
          action: string
          created_at?: string
          data?: Json | null
          updated_at?: string
          user_id: number
        }
        Update: {
          action?: string
          created_at?: string
          data?: Json | null
          updated_at?: string
          user_id?: number
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      test_license_ips: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string
          license_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address: string
          license_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string
          license_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_license_ips_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      token_metrics: {
        Row: {
          created_at: string
          duration_ms: number
          function_name: string | null
          id: string
          input_tokens: number
          license_id: string | null
          model: string
          output_tokens: number
          provider: string
          total_tokens: number
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          function_name?: string | null
          id?: string
          input_tokens?: number
          license_id?: string | null
          model: string
          output_tokens?: number
          provider: string
          total_tokens?: number
        }
        Update: {
          created_at?: string
          duration_ms?: number
          function_name?: string | null
          id?: string
          input_tokens?: number
          license_id?: string | null
          model?: string
          output_tokens?: number
          provider?: string
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "token_metrics_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      token_pool: {
        Row: {
          account_label: string
          captured_at: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          refresh_token: string | null
          token: string
          use_count: number
        }
        Insert: {
          account_label?: string
          captured_at?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          refresh_token?: string | null
          token: string
          use_count?: number
        }
        Update: {
          account_label?: string
          captured_at?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          refresh_token?: string | null
          token?: string
          use_count?: number
        }
        Relationships: []
      }
      token_refresh_logs: {
        Row: {
          account_label: string
          created_at: string
          error_message: string | null
          id: string
          new_expires_at: string | null
          old_expires_at: string | null
          status: string
          token_id: string | null
        }
        Insert: {
          account_label?: string
          created_at?: string
          error_message?: string | null
          id?: string
          new_expires_at?: string | null
          old_expires_at?: string | null
          status?: string
          token_id?: string | null
        }
        Update: {
          account_label?: string
          created_at?: string
          error_message?: string | null
          id?: string
          new_expires_at?: string | null
          old_expires_at?: string | null
          status?: string
          token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_refresh_logs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wildcard_usage: {
        Row: {
          first_used_at: string
          id: string
          ip_address: string
          last_used_at: string
          license_id: string
          message_count: number
        }
        Insert: {
          first_used_at?: string
          id?: string
          ip_address: string
          last_used_at?: string
          license_id: string
          message_count?: number
        }
        Update: {
          first_used_at?: string
          id?: string
          ip_address?: string
          last_used_at?: string
          license_id?: string
          message_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "wildcard_usage_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_licenses: { Args: never; Returns: Json }
      clean_expired_sessions: { Args: never; Returns: undefined }
      clean_old_bot_states: { Args: never; Returns: undefined }
      execute_sql: { Args: { query: string }; Returns: Json }
      generate_license_key: { Args: never; Returns: string }
      generate_session_token: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      register_license_ip: {
        Args: {
          _hwid?: string
          _ip_address: string
          _license_id: string
          _max_unique_ips?: number
          _user_agent?: string
          _window_hours?: number
        }
        Returns: Json
      }
      register_license_project: {
        Args: {
          _license_id: string
          _max_unique_projects?: number
          _project_id: string
          _window_seconds?: number
        }
        Returns: Json
      }
      update_expired_licenses: { Args: never; Returns: undefined }
      use_reseller_credit: { Args: { _reseller_id: string }; Returns: boolean }
      use_reseller_lifetime_credit: {
        Args: { _reseller_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "reseller"
        | "manager"
        | "apollo"
        | "credits_customer"
      license_status: "active" | "expired" | "revoked"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "user",
        "reseller",
        "manager",
        "apollo",
        "credits_customer",
      ],
      license_status: ["active", "expired", "revoked"],
    },
  },
} as const
