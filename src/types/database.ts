// Auto-generate the full version with: npx supabase gen types typescript --project-id <id>
// This is a hand-written subset sufficient for development before Supabase is wired up.

export type Role = 'student' | 'parent'
export type MilestoneType = 'exam' | 'competition' | 'cca' | 'application' | 'academic' | 'other'
export type EventSource = 'ai' | 'manual' | 'finance' | 'system'
export type EventType = 'exam' | 'application' | 'cca' | 'finance' | 'health' | 'personal' | 'system'
export type AchievementCategory = 'competition' | 'academic' | 'cca' | 'volunteer' | 'award' | 'other'
export type DraftStatus = 'pending' | 'sent' | 'cancelled'
export type RoomType = 'single' | 'shared' | 'studio'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; role: Role; display_name: string; created_at: string }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      student_profiles: {
        Row: {
          id: string; user_id: string; current_year: string | null
          current_school: string | null; current_curriculum: string | null
          target_university: string | null; target_programme: string | null
          interests: string | null; budget_range: string | null
          english_level: string | null; invite_code: string | null
          onboarding_done: boolean; created_at: string; updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['student_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['student_profiles']['Insert']>
      }
      parent_links: {
        Row: { id: string; parent_id: string; student_id: string; linked_at: string }
        Insert: Omit<Database['public']['Tables']['parent_links']['Row'], 'id' | 'linked_at'>
        Update: never
      }
      roadmaps: {
        Row: { id: string; student_id: string; status: 'active' | 'archived'; raw_json: unknown; generated_at: string }
        Insert: Omit<Database['public']['Tables']['roadmaps']['Row'], 'id' | 'generated_at'>
        Update: Partial<Pick<Database['public']['Tables']['roadmaps']['Row'], 'status'>>
      }
      milestones: {
        Row: {
          id: string; roadmap_id: string; year: number; month: number | null
          type: MilestoneType; title: string; description: string | null
          due_date: string | null; completed: boolean; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['milestones']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['milestones']['Insert']>
      }
      achievements: {
        Row: {
          id: string; student_id: string; category: AchievementCategory
          title: string; date: string; description: string | null
          image_url: string | null; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['achievements']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['achievements']['Insert']>
      }
      readiness_scores: {
        Row: { id: string; student_id: string; score: number; gap_analysis: string; calculated_at: string }
        Insert: Omit<Database['public']['Tables']['readiness_scores']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['readiness_scores']['Insert']>
      }
      homestay_listings: {
        Row: {
          id: string; family_name: string; description: string | null
          address: string; area: string | null; latitude: number | null; longitude: number | null
          room_type: RoomType; monthly_rate_sgd: number; family_type: string | null
          max_students: number; amenities: string[]; host_contact: string | null
          image_url: string | null; nearby_schools: string[]; distance_notes: string | null
          is_active: boolean; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['homestay_listings']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['homestay_listings']['Insert']>
      }
    }
  }
}
