export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  completed: boolean
  completed_at?: string | null
  group_id?: string | null
  speed_score?: number
  importance_score?: number
  emoji?: string
  order_index: string | null // Changed from number to string | null for fractional indexing
  created_at: string
  updated_at: string
  subtasks?: Subtask[] // Full subtask objects for detailed view
  tags?: Tag[]       // Full tag objects for detailed view
  subtask_count?: number // Count for list view
  tag_count?: number     // Count for list view
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  completed_at?: string
  order_index: number
  created_at: string
}

export interface TaskGroup {
  id: string
  user_id: string
  name: string
  emoji?: string
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
  color: "red" | "green" | "blue" | "yellow" | "purple" | "orange"
  created_at: string
  updated_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  gemini_api_key?: string
  speed_weight: number
  importance_weight: number
  auto_ranking: boolean
  auto_subtasks: boolean
  auto_tagging: boolean
  theme: "default" | "alireza" | "neda"
  created_at: string
  updated_at: string
}

export type User = {
  id: string
  aud: string
  role?: string
  email?: string
  email_confirmed_at?: string
  phone?: string
  confirmed_at?: string
  last_sign_in_at?: string
  app_metadata: {
    provider?: string
    providers?: string[] // Make providers optional
  }
  user_metadata: {
    [key: string]: any; // Keep it flexible
  }
  identities?: any[]
  created_at: string
  updated_at?: string
  is_anonymous?: boolean;
}

export interface TaskFormData {
  title: string
  description?: string
  groupId?: string
  autoRanking: boolean
  autoSubtasks: boolean
  speedScore: number
  importanceScore: number
  emoji?: string
  subtasks?: string[]
}

// Add this interface to your types/index.ts file

export interface UserProfile {
    user_id: string;
    role: string;
    is_guest: boolean;
    nickname: string | null;
    has_set_nickname: boolean;
    created_at: string;
    updated_at: string;
}

// ... rest of the file
