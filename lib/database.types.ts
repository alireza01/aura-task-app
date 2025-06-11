export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          user_id: string
          role: string
          is_guest: boolean | null
          nickname: string | null
          has_set_nickname: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: string
          role?: string
          is_guest?: boolean | null
          nickname?: string | null
          has_set_nickname?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          role?: string
          is_guest?: boolean | null
          nickname?: string | null
          has_set_nickname?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      admin_api_keys: {
        Row: {
          id: string
          api_key: string
          is_active: boolean | null
          name: string | null
          last_used_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          api_key: string
          is_active?: boolean | null
          name?: string | null
          last_used_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          api_key?: string
          is_active?: boolean | null
          name?: string | null
          last_used_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          gemini_api_key: string | null
          speed_weight: number | null
          importance_weight: number | null
          auto_ranking: boolean | null
          auto_subtasks: boolean | null
          auto_tagging: boolean | null
          theme: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          gemini_api_key?: string | null
          speed_weight?: number | null
          importance_weight?: number | null
          auto_ranking?: boolean | null
          auto_subtasks?: boolean | null
          auto_tagging?: boolean | null
          theme?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          gemini_api_key?: string | null
          speed_weight?: number | null
          importance_weight?: number | null
          auto_ranking?: boolean | null
          auto_subtasks?: boolean | null
          auto_tagging?: boolean | null
          theme?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      task_groups: {
        Row: {
          id: string
          user_id: string
          name: string
          emoji: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          emoji?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          emoji?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_groups_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          group_id: string | null
          title: string
          description: string | null
          completed: boolean | null
          completed_at: string | null
          speed_score: number | null
          importance_score: number | null
          emoji: string | null
          order_index: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          group_id?: string | null
          title: string
          description?: string | null
          completed?: boolean | null
          completed_at?: string | null
          speed_score?: number | null
          importance_score?: number | null
          emoji?: string | null
          order_index?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          group_id?: string | null
          title?: string
          description?: string | null
          completed?: boolean | null
          completed_at?: string | null
          speed_score?: number | null
          importance_score?: number | null
          emoji?: string | null
          order_index?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "task_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subtasks: {
        Row: {
          id: string
          task_id: string
          title: string
          completed: boolean | null
          completed_at: string | null
          order_index: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          task_id: string
          title: string
          completed?: boolean | null
          completed_at?: string | null
          order_index?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          task_id?: string
          title?: string
          completed?: boolean | null
          completed_at?: string | null
          order_index?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      task_tags: {
        Row: {
          task_id: string
          tag_id: string
          created_at: string | null
        }
        Insert: {
          task_id: string
          tag_id: string
          created_at?: string | null
        }
        Update: {
          task_id?: string
          tag_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      tasks_with_counts: {
        Row: {
          id: string | null
          user_id: string | null
          group_id: string | null
          title: string | null
          description: string | null
          completed: boolean | null
          completed_at: string | null
          speed_score: number | null
          importance_score: number | null
          emoji: string | null
          order_index: string | null
          created_at: string | null
          updated_at: string | null
          subtask_count: number | null
          tag_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "task_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      get_task_tag_count: {
        Args: {
          p_task_id: string
        }
        Returns: number
      }
      is_admin: {
        Args: {
          user_id_to_check: string
        }
        Returns: boolean
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
