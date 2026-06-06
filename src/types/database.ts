// Hand-written types sufficient for development before Supabase CLI is wired up.
// Run `npx supabase gen types typescript --project-id <id> > src/types/database.ts`
// to replace this with the auto-generated version once the project is created.
//
// NOTE: @supabase/supabase-js v2 requires Views / Functions / Enums / CompositeTypes
// to be present — without them every query falls back to `never`.
// Also: use `type` not `interface`, and spell out Insert/Update explicitly (no self-referential Omit).

import type { PortfolioAssessment } from '@/types/assessment'
import type { EvidenceClassification } from '@/types/evidence'

export type Role = 'student' | 'parent'
export type MilestoneType = 'exam' | 'competition' | 'cca' | 'application' | 'academic' | 'other'
export type AchievementCategory = 'competition' | 'academic' | 'cca' | 'volunteer' | 'award' | 'other'
export type RoomType = 'single' | 'shared' | 'studio'
export type DocumentFileType = 'transcript' | 'report_card' | 'certificate' | 'passport' | 'visa' | 'medical' | 'application' | 'other'
export type DocumentPermission = 'read' | 'edit'
export type SchoolType = 'primary' | 'secondary' | 'jc' | 'poly' | 'university' | 'language_school' | 'diploma'
export type SchoolCurriculum = 'IB' | 'A-Level' | 'AP' | 'O-Level' | 'Local' | 'Mixed'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row:    { id: string; role: Role; display_name: string; preferred_language: string; created_at: string }
        Insert: { id: string; role: Role; display_name: string; preferred_language?: string; created_at?: string }
        Update: { id?: string; role?: Role; display_name?: string; preferred_language?: string }
        Relationships: []
      }
      student_profiles: {
        Row: {
          id: string; user_id: string
          nationality: string | null; age: number | null
          current_year: string | null; current_school: string | null
          current_curriculum: string | null; target_university: string | null
          target_programme: string | null; interests: string | null
          budget_range: string | null; english_level: string | null
          target_enrollment_year: number | null
          application_route: string | null; target_school: string | null; programme_category: string | null
          invite_code: string | null; onboarding_done: boolean
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; user_id: string
          nationality?: string | null; age?: number | null
          current_year?: string | null; current_school?: string | null
          current_curriculum?: string | null; target_university?: string | null
          target_programme?: string | null; interests?: string | null
          budget_range?: string | null; english_level?: string | null
          target_enrollment_year?: number | null
          application_route?: string | null; target_school?: string | null; programme_category?: string | null
          invite_code?: string | null; onboarding_done?: boolean
        }
        Update: {
          nationality?: string | null; age?: number | null
          current_year?: string | null; current_school?: string | null
          current_curriculum?: string | null; target_university?: string | null
          target_programme?: string | null; interests?: string | null
          budget_range?: string | null; english_level?: string | null
          target_enrollment_year?: number | null
          application_route?: string | null; target_school?: string | null; programme_category?: string | null
          invite_code?: string | null; onboarding_done?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      parent_links: {
        Row:    { id: string; parent_id: string; student_id: string; linked_at: string }
        Insert: { id?: string; parent_id: string; student_id: string; linked_at?: string }
        Update: { id?: string; parent_id?: string; student_id?: string }
        Relationships: []
      }
      roadmaps: {
        Row:    { id: string; student_id: string; status: 'active' | 'archived'; raw_json: unknown; generated_at: string }
        Insert: { id?: string; student_id: string; status?: 'active' | 'archived'; raw_json: unknown }
        Update: { status?: 'active' | 'archived'; raw_json?: unknown }
        Relationships: []
      }
      roadmap_generation_quota: {
        Row: {
          user_id: string; first_generation_used: boolean
          last_free_generation_at: string | null; total_generations: number
          free_used_this_year: number
        }
        Insert: {
          user_id: string; first_generation_used?: boolean
          last_free_generation_at?: string | null; total_generations?: number
          free_used_this_year?: number
        }
        Update: {
          first_generation_used?: boolean
          last_free_generation_at?: string | null; total_generations?: number
          free_used_this_year?: number
        }
        Relationships: []
      }
      milestones: {
        Row: {
          id: string; roadmap_id: string; year: number; month: number | null
          type: MilestoneType; title: string; description: string | null
          due_date: string | null; completed: boolean; created_at: string
        }
        Insert: {
          id?: string; roadmap_id: string; year: number; month?: number | null
          type: MilestoneType; title: string; description?: string | null
          due_date?: string | null; completed?: boolean
        }
        Update: {
          year?: number; month?: number | null; type?: MilestoneType
          title?: string; description?: string | null
          due_date?: string | null; completed?: boolean
        }
        Relationships: []
      }
      achievements: {
        Row: {
          id: string; student_id: string; category: AchievementCategory
          title: string; date: string; description: string | null
          image_url: string | null; xp: number | null; created_at: string
        }
        Insert: {
          id?: string; student_id: string; category: AchievementCategory
          title: string; date: string; description?: string | null
          image_url?: string | null; xp?: number | null
        }
        Update: {
          category?: AchievementCategory; title?: string; date?: string
          description?: string | null; image_url?: string | null; xp?: number | null
        }
        Relationships: []
      }
      readiness_scores: {
        Row:    { id: string; student_id: string; score: number; gap_analysis: string; calculated_at: string }
        Insert: { id?: string; student_id: string; score: number; gap_analysis: string; calculated_at?: string }
        Update: { score?: number; gap_analysis?: string }
        Relationships: []
      }
      portfolio_assessments: {
        Row: {
          id: string; student_id: string; overall_level: string
          overall_summary: string; confidence: string
          result: PortfolioAssessment; created_at: string
        }
        Insert: {
          id?: string; student_id: string; overall_level: string
          overall_summary?: string; confidence?: string; result: PortfolioAssessment
        }
        Update: {
          overall_level?: string; overall_summary?: string
          confidence?: string; result?: PortfolioAssessment
        }
        Relationships: []
      }
      homestay_listings: {
        Row: {
          id: string; family_name: string; description: string | null
          address: string; area: string | null; zone: string | null; latitude: number | null; longitude: number | null
          room_type: RoomType; monthly_rate_sgd: number; family_type: string | null
          max_students: number; amenities: string[]; host_contact: string | null
          image_url: string | null; nearby_schools: string[]; distance_notes: string | null
          is_active: boolean; created_at: string
        }
        Insert: {
          id?: string; family_name: string; description?: string | null
          address: string; area?: string | null; zone?: string | null; latitude?: number | null; longitude?: number | null
          room_type: RoomType; monthly_rate_sgd: number; family_type?: string | null
          max_students?: number; amenities?: string[]; host_contact?: string | null
          image_url?: string | null; nearby_schools?: string[]; distance_notes?: string | null
          is_active?: boolean
        }
        Update: {
          family_name?: string; description?: string | null; address?: string
          room_type?: RoomType; monthly_rate_sgd?: number; is_active?: boolean
          area?: string | null; amenities?: string[]; nearby_schools?: string[]
        }
        Relationships: []
      }
      schools: {
        Row: {
          id: string; school_name: string; slug: string
          school_type: SchoolType; curriculum: SchoolCurriculum | null
          zone: string | null; address: string | null; description: string | null
          website: string | null; is_active: boolean; created_at: string
        }
        Insert: {
          id?: string; school_name: string; slug: string
          school_type: SchoolType; curriculum?: SchoolCurriculum | null
          zone?: string | null; address?: string | null; description?: string | null
          website?: string | null; is_active?: boolean
        }
        Update: {
          school_name?: string; slug?: string; school_type?: SchoolType
          curriculum?: SchoolCurriculum | null; zone?: string | null
          address?: string | null; description?: string | null
          website?: string | null; is_active?: boolean
        }
        Relationships: []
      }
      student_documents: {
        Row: {
          id: string; student_id: string; file_name: string
          storage_path: string; file_type: DocumentFileType
          extracted_text: string | null; classification: EvidenceClassification | null
          upload_date: string; created_at: string
        }
        Insert: {
          id?: string; student_id: string; file_name: string
          storage_path: string; file_type: DocumentFileType
          extracted_text?: string | null; classification?: EvidenceClassification | null
          upload_date?: string
        }
        Update: {
          file_name?: string; file_type?: DocumentFileType
          extracted_text?: string | null; classification?: EvidenceClassification | null
        }
        Relationships: []
      }
      document_access: {
        Row:    { document_id: string; parent_id: string; permission: DocumentPermission; granted_at: string }
        Insert: { document_id: string; parent_id: string; permission: DocumentPermission; granted_at?: string }
        Update: { permission?: DocumentPermission }
        Relationships: []
      }
      homestay_reviews: {
        Row:    { id: string; homestay_id: string; reviewer_id: string; rating: number; comment: string | null; created_at: string }
        Insert: { id?: string; homestay_id: string; reviewer_id: string; rating: number; comment?: string | null }
        Update: { rating?: number; comment?: string | null }
        Relationships: []
      }
      homestay_saves: {
        Row:    { user_id: string; homestay_id: string; saved_at: string }
        Insert: { user_id: string; homestay_id: string; saved_at?: string }
        Update: { saved_at?: string }
        Relationships: []
      }
      calendar_events: {
        Row: {
          id: string; student_id: string; title: string; event_date: string
          type: 'exam' | 'application' | 'cca' | 'finance' | 'health' | 'personal' | 'system'
          source: 'ai' | 'manual' | 'finance' | 'system'
          notes: string | null
          reminder_sent_30d: boolean; reminder_sent_7d: boolean
          reminder_sent_3d: boolean; reminder_sent_1d: boolean
          created_at: string
        }
        Insert: {
          id?: string; student_id: string; title: string; event_date: string
          type: 'exam' | 'application' | 'cca' | 'finance' | 'health' | 'personal' | 'system'
          source: 'ai' | 'manual' | 'finance' | 'system'
          notes?: string | null
          reminder_sent_30d?: boolean; reminder_sent_7d?: boolean
          reminder_sent_3d?: boolean; reminder_sent_1d?: boolean
        }
        Update: {
          title?: string; event_date?: string
          type?: 'exam' | 'application' | 'cca' | 'finance' | 'health' | 'personal' | 'system'
          notes?: string | null
        }
        Relationships: []
      }
      fee_items: {
        Row: {
          id: string; student_id: string; name: string
          amount_sgd: number; due_date: string
          category: 'tuition' | 'homestay' | 'insurance' | 'transport' | 'other'
          paid: boolean; paid_date: string | null; created_at: string
        }
        Insert: {
          id?: string; student_id: string; name: string
          amount_sgd: number; due_date: string
          category: 'tuition' | 'homestay' | 'insurance' | 'transport' | 'other'
          paid?: boolean; paid_date?: string | null
        }
        Update: {
          name?: string; amount_sgd?: number; due_date?: string
          category?: 'tuition' | 'homestay' | 'insurance' | 'transport' | 'other'
          paid?: boolean; paid_date?: string | null
        }
        Relationships: []
      }
      insurance_policies: {
        Row: {
          id: string; student_id: string; policy_name: string; insurer: string
          policy_number: string | null; coverage_start: string | null
          coverage_end: string | null; renewal_date: string
          claims_hotline: string | null; created_at: string
        }
        Insert: {
          id?: string; student_id: string; policy_name: string; insurer: string
          policy_number?: string | null; coverage_start?: string | null
          coverage_end?: string | null; renewal_date: string
          claims_hotline?: string | null
        }
        Update: {
          policy_name?: string; insurer?: string; policy_number?: string | null
          coverage_start?: string | null; coverage_end?: string | null
          renewal_date?: string; claims_hotline?: string | null
        }
        Relationships: []
      }
      expense_logs: {
        Row: {
          id: string; student_id: string; amount_sgd: number
          category: 'food' | 'transport' | 'school_supplies' | 'activities' | 'healthcare' | 'other'
          note: string | null; date: string; created_at: string
        }
        Insert: {
          id?: string; student_id: string; amount_sgd: number
          category: 'food' | 'transport' | 'school_supplies' | 'activities' | 'healthcare' | 'other'
          note?: string | null; date?: string
        }
        Update: {
          amount_sgd?: number
          category?: 'food' | 'transport' | 'school_supplies' | 'activities' | 'healthcare' | 'other'
          note?: string | null; date?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          id: string; student_id: string
          type: 'school_admin' | 'homestay' | 'polyclinic' | 'hospital' | 'doctor' | 'other'
          name: string; phone: string; address: string | null; created_at: string
        }
        Insert: {
          id?: string; student_id: string
          type: 'school_admin' | 'homestay' | 'polyclinic' | 'hospital' | 'doctor' | 'other'
          name: string; phone: string; address?: string | null
        }
        Update: {
          type?: 'school_admin' | 'homestay' | 'polyclinic' | 'hospital' | 'doctor' | 'other'
          name?: string; phone?: string; address?: string | null
        }
        Relationships: []
      }
      medical_appointments: {
        Row: {
          id: string; student_id: string; date: string
          clinic_name: string; reason: string; notes: string | null; created_at: string
        }
        Insert: {
          id?: string; student_id: string; date: string
          clinic_name: string; reason: string; notes?: string | null
        }
        Update: { date?: string; clinic_name?: string; reason?: string; notes?: string | null }
        Relationships: []
      }
      school_communications: {
        Row: {
          id: string; student_id: string; original_text: string
          chinese_translation: string; chinese_summary: string
          source_type: 'text' | 'pdf'; submitted_at: string
        }
        Insert: {
          id?: string; student_id: string; original_text: string
          chinese_translation: string; chinese_summary: string
          source_type?: 'text' | 'pdf'
        }
        Update: { chinese_translation?: string; chinese_summary?: string }
        Relationships: []
      }
      parent_drafts: {
        Row: {
          id: string; student_id: string; parent_id: string
          chinese_original: string; english_draft: string
          status: 'pending' | 'sent' | 'cancelled'
          created_at: string; sent_at: string | null
        }
        Insert: {
          id?: string; student_id: string; parent_id: string
          chinese_original: string; english_draft: string
          status?: 'pending' | 'sent' | 'cancelled'
        }
        Update: {
          chinese_original?: string; english_draft?: string
          status?: 'pending' | 'sent' | 'cancelled'; sent_at?: string | null
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          id: string; author_id: string; title: string; body: string
          image_url: string | null
          category: 'school_journey' | 'how_i_got_in' | 'resources' | 'ask_community'
          tags: string[]; anonymous: boolean; upvotes: number
          moderation_status: 'approved' | 'flagged' | 'removed'; created_at: string
        }
        Insert: {
          id?: string; author_id: string; title: string; body: string
          image_url?: string | null
          category: 'school_journey' | 'how_i_got_in' | 'resources' | 'ask_community'
          tags?: string[]; anonymous?: boolean
        }
        Update: {
          title?: string; body?: string; image_url?: string | null
          category?: 'school_journey' | 'how_i_got_in' | 'resources' | 'ask_community'
          tags?: string[]; anonymous?: boolean; upvotes?: number
          moderation_status?: 'approved' | 'flagged' | 'removed'
        }
        Relationships: []
      }
      post_saves: {
        Row:    { user_id: string; post_id: string; saved_at: string }
        Insert: { user_id: string; post_id: string; saved_at?: string }
        Update: { saved_at?: string }
        Relationships: []
      }
      university_targets: {
        Row: {
          id: string
          student_id: string
          name: string
          country: string
          programme: string
          deadline: string | null
          requirements: string
          notes: string
          status: 'researching' | 'applied' | 'offer' | 'rejected' | 'enrolled'
          reference_link: string
          gap_analysis: string
          gap_score: number | null
          gap_updated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id?: string
          name: string
          country?: string
          programme?: string
          deadline?: string | null
          requirements?: string
          notes?: string
          status?: 'researching' | 'applied' | 'offer' | 'rejected' | 'enrolled'
          reference_link?: string
          gap_analysis?: string
          gap_score?: number | null
          gap_updated_at?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          country?: string
          programme?: string
          deadline?: string | null
          requirements?: string
          notes?: string
          status?: 'researching' | 'applied' | 'offer' | 'rejected' | 'enrolled'
          reference_link?: string
          gap_analysis?: string
          gap_score?: number | null
          gap_updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views:          { [_ in never]: never }
    Functions:      { [_ in never]: never }
    Enums:          { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
