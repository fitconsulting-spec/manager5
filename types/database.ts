// Supabase テーブルの型定義
// 将来的には `supabase gen-types typescript` コマンドで自動生成できます

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          role: string
          avatar: string
          color: string
          weakness: string
          streak_count: number
          last_checked_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>
      }
      scenarios: {
        Row: {
          id: number
          tag: string
          time_estimate: string
          title: string
          difficulty: string
          situation: string
          choices: Array<{ id: string; text: string }>
          best_choice: string
          explanations: Record<string, { label: string; text: string }>
          point: string
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["scenarios"]["Row"], "id" | "created_at"> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["scenarios"]["Insert"]>
      }
      user_scenarios: {
        Row: {
          id: string
          user_id: string
          scenario_id: number
          completed: boolean
          completed_at: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["user_scenarios"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["user_scenarios"]["Insert"]>
      }
      habits: {
        Row: {
          id: string
          icon: string
          label: string
          category: string
          type: "daily" | "weekly"
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["habits"]["Row"], "created_at"> & {
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["habits"]["Insert"]>
      }
      user_habits: {
        Row: {
          id: string
          user_id: string
          habit_id: string | null
          icon: string | null
          label: string | null
          category: string | null
          type: "daily" | "weekly"
          is_custom: boolean
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["user_habits"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["user_habits"]["Insert"]>
      }
      habit_logs: {
        Row: {
          id: string
          user_id: string
          user_habit_id: string
          log_date: string   // "YYYY-MM-DD"
          week_key: string | null  // "YYYY-WN"
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["habit_logs"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["habit_logs"]["Insert"]>
      }
      reflections: {
        Row: {
          id: string
          user_id: string
          text: string
          mood: number
          tags: string[]
          reflected_at: string  // "YYYY-MM-DD"
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["reflections"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["reflections"]["Insert"]>
      }
    }
  }
}
