export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      buildings: {
        Row: {
          building_type: string | null
          capacity: number
          created_at: string
          id: string
          name: string
          species: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          building_type?: string | null
          capacity?: number
          created_at?: string
          id?: string
          name: string
          species?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          building_type?: string | null
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          species?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      farms: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diseases: {
        Row: {
          category: string
          contagious: boolean
          id: string
          name: string
          prevention: string | null
          severity: string
          species: string[]
          symptoms: string[]
        }
        Insert: {
          category?: string
          contagious?: boolean
          id?: string
          name: string
          prevention?: string | null
          severity?: string
          species: string[]
          symptoms?: string[]
        }
        Update: {
          category?: string
          contagious?: boolean
          id?: string
          name?: string
          prevention?: string | null
          severity?: string
          species?: string[]
          symptoms?: string[]
        }
        Relationships: []
      }
      feed_records: {
        Row: {
          cost: number
          created_at: string
          feed_type: string
          id: string
          lot_id: string
          quantity_kg: number
          record_date: string
          user_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          feed_type: string
          id?: string
          lot_id: string
          quantity_kg?: number
          record_date?: string
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          feed_type?: string
          id?: string
          lot_id?: string
          quantity_kg?: number
          record_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_records_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          cost: number
          created_at: string
          id: string
          lot_id: string
          name: string
          notes: string | null
          record_date: string
          type: string
          user_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          lot_id: string
          name: string
          notes?: string | null
          record_date?: string
          type?: string
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          lot_id?: string
          name?: string
          notes?: string | null
          record_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_records_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          arrival_date: string
          avg_weight: number
          breed: string | null
          building_id: string | null
          created_at: string
          id: string
          initial_count: number
          name: string
          purchase_cost: number
          species: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          arrival_date?: string
          avg_weight?: number
          breed?: string | null
          building_id?: string | null
          created_at?: string
          id?: string
          initial_count?: number
          name: string
          purchase_cost?: number
          species?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          arrival_date?: string
          avg_weight?: number
          breed?: string | null
          building_id?: string | null
          created_at?: string
          id?: string
          initial_count?: number
          name?: string
          purchase_cost?: number
          species?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lots_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          category: string
          created_at: string
          expiry_date: string | null
          id: string
          name: string
          notes: string | null
          quantity: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          name: string
          notes?: string | null
          quantity?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          quantity?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mortality_records: {
        Row: {
          cause: string | null
          count: number
          created_at: string
          id: string
          lot_id: string
          record_date: string
          user_id: string
        }
        Insert: {
          cause?: string | null
          count?: number
          created_at?: string
          id?: string
          lot_id: string
          record_date?: string
          user_id: string
        }
        Update: {
          cause?: string | null
          count?: number
          created_at?: string
          id?: string
          lot_id?: string
          record_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortality_records_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          client: string | null
          client_id: string | null
          created_at: string
          id: string
          lot_id: string | null
          quantity: number
          record_date: string
          total: number
          unit_price: number
          user_id: string
        }
        Insert: {
          client?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          lot_id?: string | null
          quantity?: number
          record_date?: string
          total?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          client?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          lot_id?: string | null
          quantity?: number
          record_date?: string
          total?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          alert_threshold: number
          category: string
          created_at: string
          id: string
          name: string
          quantity: number
          unit: string
          unit_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_threshold?: number
          category?: string
          created_at?: string
          id?: string
          name: string
          quantity?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_threshold?: number
          category?: string
          created_at?: string
          id?: string
          name?: string
          quantity?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          building_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          lot_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          building_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lot_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          building_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lot_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          lot_id: string | null
          record_date: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          lot_id?: string | null
          record_date?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          lot_id?: string | null
          record_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_records: {
        Row: {
          avg_weight: number
          created_at: string
          id: string
          lot_id: string
          record_date: string
          user_id: string
        }
        Insert: {
          avg_weight?: number
          created_at?: string
          id?: string
          lot_id: string
          record_date?: string
          user_id: string
        }
        Update: {
          avg_weight?: number
          created_at?: string
          id?: string
          lot_id?: string
          record_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weight_records_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
