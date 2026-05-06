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
      admin_audit_log: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          role: Database["public"]["Enums"]["app_role"]
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      feira_users: {
        Row: {
          created_at: string
          feira_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feira_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feira_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feira_users_feira_id_fkey"
            columns: ["feira_id"]
            isOneToOne: false
            referencedRelation: "feiras"
            referencedColumns: ["id"]
          },
        ]
      }
      feiras: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          mensagem_sucesso: string | null
          nome: string
          slug: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          mensagem_sucesso?: string | null
          nome: string
          slug: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          mensagem_sucesso?: string | null
          nome?: string
          slug?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          cidade: string
          created_at: string
          email: string | null
          estado: string
          evento: string
          feira_id: string | null
          id: string
          ip: string | null
          nome: string
          notes: string | null
          orcamento: string
          prazo_compra: string
          score: number
          status: string
          tamanho_quintal: string
          temperatura: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp: string
        }
        Insert: {
          cidade: string
          created_at?: string
          email?: string | null
          estado: string
          evento?: string
          feira_id?: string | null
          id?: string
          ip?: string | null
          nome: string
          notes?: string | null
          orcamento: string
          prazo_compra: string
          score?: number
          status?: string
          tamanho_quintal: string
          temperatura?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp: string
        }
        Update: {
          cidade?: string
          created_at?: string
          email?: string | null
          estado?: string
          evento?: string
          feira_id?: string | null
          id?: string
          ip?: string | null
          nome?: string
          notes?: string | null
          orcamento?: string
          prazo_compra?: string
          score?: number
          status?: string
          tamanho_quintal?: string
          temperatura?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_feira_id_fkey"
            columns: ["feira_id"]
            isOneToOne: false
            referencedRelation: "feiras"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_notif_prefs: {
        Row: {
          notif_frio: boolean
          notif_morno: boolean
          notif_quente: boolean
          quiet_enabled: boolean
          quiet_end: number
          quiet_start: number
          sound_enabled: boolean
          sound_frio: string
          sound_morno: string
          sound_quente: string
          toast_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          notif_frio?: boolean
          notif_morno?: boolean
          notif_quente?: boolean
          quiet_enabled?: boolean
          quiet_end?: number
          quiet_start?: number
          sound_enabled?: boolean
          sound_frio?: string
          sound_morno?: string
          sound_quente?: string
          toast_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          notif_frio?: boolean
          notif_morno?: boolean
          notif_quente?: boolean
          quiet_enabled?: boolean
          quiet_end?: number
          quiet_start?: number
          sound_enabled?: boolean
          sound_frio?: string
          sound_morno?: string
          sound_quente?: string
          toast_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calc_lead_score: {
        Args: {
          email: string
          orcamento: string
          prazo: string
          tamanho: string
        }
        Returns: number
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      leads_dashboard_stats: { Args: { p_feira_id?: string }; Returns: Json }
      normalize_phone: { Args: { p: string }; Returns: string }
    }
    Enums: {
      app_role: "master" | "admin" | "user"
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
      app_role: ["master", "admin", "user"],
    },
  },
} as const
