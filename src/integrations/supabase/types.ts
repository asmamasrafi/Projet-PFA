export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      action_plans: {
        Row: {
          audit_id: string;
          auditor_id: string | null;
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          owner_id: string;
          report_id: string | null;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          audit_id: string;
          auditor_id?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          owner_id: string;
          report_id?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          audit_id?: string;
          auditor_id?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          owner_id?: string;
          report_id?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_answers: {
        Row: {
          answer: string;
          answered_at: string;
          audit_id: string;
          id: string;
          question_id: string;
          score: number | null;
        };
        Insert: {
          answer: string;
          answered_at?: string;
          audit_id: string;
          id?: string;
          question_id: string;
          score?: number | null;
        };
        Update: {
          answer?: string;
          answered_at?: string;
          audit_id?: string;
          id?: string;
          question_id?: string;
          score?: number | null;
        };
        Relationships: [];
      };
      audit_questions: {
        Row: {
          active: boolean;
          axis: string;
          created_at: string;
          id: string;
          noted: boolean;
          options: Json;
          question: string;
          sort_order: number;
        };
        Insert: {
          active?: boolean;
          axis: string;
          created_at?: string;
          id?: string;
          noted?: boolean;
          options: Json;
          question: string;
          sort_order: number;
        };
        Update: {
          active?: boolean;
          axis?: string;
          created_at?: string;
          id?: string;
          noted?: boolean;
          options?: Json;
          question?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      audit_reports: {
        Row: {
          audit_id: string;
          auditor_id: string;
          created_at: string;
          id: string;
          published_at: string | null;
          recommendations: Json;
          score: number | null;
          status: string;
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          audit_id: string;
          auditor_id: string;
          created_at?: string;
          id?: string;
          published_at?: string | null;
          recommendations?: Json;
          score?: number | null;
          status?: string;
          summary?: string | null;
          updated_at?: string;
        };
        Update: {
          audit_id?: string;
          auditor_id?: string;
          created_at?: string;
          id?: string;
          published_at?: string | null;
          recommendations?: Json;
          score?: number | null;
          status?: string;
          summary?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      audits: {
        Row: {
          company_id: string;
          completed_at: string | null;
          created_at: string;
          id: string;
          owner_id: string;
          score: number | null;
          started_at: string;
          status: string;
          submitted_at: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          owner_id: string;
          score?: number | null;
          started_at?: string;
          status?: string;
          submitted_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          owner_id?: string;
          score?: number | null;
          started_at?: string;
          status?: string;
          submitted_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      auditor_requests: {
        Row: {
          audit_id: string;
          auditor_id: string | null;
          id: string;
          message: string | null;
          requested_at: string;
          responded_at: string | null;
          status: string;
        };
        Insert: {
          audit_id: string;
          auditor_id?: string | null;
          id?: string;
          message?: string | null;
          requested_at?: string;
          responded_at?: string | null;
          status?: string;
        };
        Update: {
          audit_id?: string;
          auditor_id?: string | null;
          id?: string;
          message?: string | null;
          requested_at?: string;
          responded_at?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      auditor_profiles: {
        Row: {
          created_at: string;
          entity: string;
          entity_other: string | null;
          user_id: string;
          verified: boolean;
        };
        Insert: {
          created_at?: string;
          entity?: string;
          entity_other?: string | null;
          user_id: string;
          verified?: boolean;
        };
        Update: {
          created_at?: string;
          entity?: string;
          entity_other?: string | null;
          user_id?: string;
          verified?: boolean;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          city: string | null;
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          region: string | null;
          sector: string | null;
          size: string | null;
          updated_at: string;
        };
        Insert: {
          city?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          owner_id: string;
          region?: string | null;
          sector?: string | null;
          size?: string | null;
          updated_at?: string;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          region?: string | null;
          sector?: string | null;
          size?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          account_type: string;
          created_at: string;
          email: string | null;
          first_name: string;
          id: string;
          job_title: string | null;
          last_name: string;
          updated_at: string;
        };
        Insert: {
          account_type?: string;
          created_at?: string;
          email?: string | null;
          first_name?: string;
          id: string;
          job_title?: string | null;
          last_name?: string;
          updated_at?: string;
        };
        Update: {
          account_type?: string;
          created_at?: string;
          email?: string | null;
          first_name?: string;
          id?: string;
          job_title?: string | null;
          last_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "pme" | "auditor" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["pme", "auditor", "admin"],
    },
  },
} as const;
