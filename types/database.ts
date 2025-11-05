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
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          user_type: 'user' | 'brand' | 'admin'
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          user_type?: 'user' | 'brand' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          user_type?: 'user' | 'brand' | 'admin'
          created_at?: string
        }
      }
        communities: {
          Row: {
            id: string
            name: string
            slug: string
            description: string | null
            image_url: string | null
            logo_url: string | null
            banner_url: string | null
            media_path: string | null
            core_values: string[]
            location: unknown | null
            address: string | null
            member_count: number
            creator_id: string
            created_at: string
          }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          image_url?: string | null
          logo_url?: string | null
          banner_url?: string | null
          media_path?: string | null
          core_values: string[]
          location?: unknown | null
          address?: string | null
          member_count?: number
          creator_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          image_url?: string | null
          logo_url?: string | null
          banner_url?: string | null
          media_path?: string | null
          core_values?: string[]
          location?: unknown | null
          address?: string | null
          member_count?: number
          creator_id?: string
          created_at?: string
        }
      }
      course_enrollments: {
        Row: {
          id: string
          user_id: string
          corporate_account_id: string | null
          module_id: string
          purchase_type: 'individual' | 'corporate' | 'team' | 'enterprise' | 'gift'
          purchased_at: string | null
          purchase_price_snapshot: number | null
          progress_percentage: number
          completed: boolean
          completion_date: string | null
          certificate_url: string | null
          enrolled_at: string
          last_accessed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          corporate_account_id?: string | null
          module_id: string
          purchase_type?: 'individual' | 'corporate' | 'team' | 'enterprise' | 'gift'
          purchased_at?: string | null
          purchase_price_snapshot?: number | null
          progress_percentage?: number
          completed?: boolean
          completion_date?: string | null
          certificate_url?: string | null
          enrolled_at?: string
          last_accessed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          corporate_account_id?: string | null
          module_id?: string
          purchase_type?: 'individual' | 'corporate' | 'team' | 'enterprise' | 'gift'
          purchased_at?: string | null
          purchase_price_snapshot?: number | null
          progress_percentage?: number
          completed?: boolean
          completion_date?: string | null
          certificate_url?: string | null
          enrolled_at?: string
          last_accessed_at?: string | null
        }
      }
      community_members: {
        Row: {
          id: string
          community_id: string
          user_id: string
          role: 'founder' | 'admin' | 'member'
          voting_power: number
          joined_at: string
        }
        Insert: {
          id?: string
          community_id: string
          user_id: string
          role?: 'founder' | 'admin' | 'member'
          voting_power?: number
          joined_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          user_id?: string
          role?: 'founder' | 'admin' | 'member'
          voting_power?: number
          joined_at?: string
        }
      }
      community_content: {
        Row: {
          id: string
          community_id: string
          type: 'need' | 'event' | 'challenge' | 'poll'
          title: string
          description: string | null
          image_url: string | null
          data: Json
          status: 'draft' | 'voting' | 'approved' | 'active' | 'completed'
          created_by: string
          funding_goal: number | null
          current_funding: number
          voting_deadline: string | null
          max_participants: number | null
          location: string | null
          event_date: string | null
          event_time: string | null
          completion_deadline: string | null
          created_at: string
        }
        Insert: {
          id?: string
          community_id: string
          type: 'need' | 'event' | 'challenge' | 'poll'
          title: string
          description?: string | null
          image_url?: string | null
          data?: Json
          status?: 'draft' | 'voting' | 'approved' | 'active' | 'completed'
          created_by: string
          funding_goal?: number | null
          current_funding?: number
          voting_deadline?: string | null
          max_participants?: number | null
          location?: string | null
          event_date?: string | null
          event_time?: string | null
          completion_deadline?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          type?: 'need' | 'event' | 'challenge' | 'poll'
          title?: string
          description?: string | null
          image_url?: string | null
          data?: Json
          status?: 'draft' | 'voting' | 'approved' | 'active' | 'completed'
          created_by?: string
          funding_goal?: number | null
          current_funding?: number
          voting_deadline?: string | null
          max_participants?: number | null
          location?: string | null
          event_date?: string | null
          event_time?: string | null
          completion_deadline?: string | null
          created_at?: string
        }
      }
      sponsorships: {
        Row: {
          id: string
          content_id: string
          sponsor_id: string
          amount: number
          status: 'pending' | 'approved' | 'rejected' | 'paid'
          stripe_payment_intent: string | null
          platform_fee: number | null
          approved_by_community: boolean
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          sponsor_id: string
          amount: number
          status?: 'pending' | 'approved' | 'rejected' | 'paid'
          stripe_payment_intent?: string | null
          platform_fee?: number | null
          approved_by_community?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          content_id?: string
          sponsor_id?: string
          amount?: number
          status?: 'pending' | 'approved' | 'rejected' | 'paid'
          stripe_payment_intent?: string | null
          platform_fee?: number | null
          approved_by_community?: boolean
          created_at?: string
        }
      }
      impact_metrics: {
        Row: {
          id: string
          community_id: string
          content_id: string | null
          metric_type: 'clean_air' | 'clean_water' | 'safe_cities' | 'zero_waste' | 'fair_trade'
          value: number
          unit: string
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          community_id: string
          content_id?: string | null
          metric_type: 'clean_air' | 'clean_water' | 'safe_cities' | 'zero_waste' | 'fair_trade'
          value: number
          unit: string
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          content_id?: string | null
          metric_type?: 'clean_air' | 'clean_water' | 'safe_cities' | 'zero_waste' | 'fair_trade'
          value?: number
          unit?: string
          verified?: boolean
          created_at?: string
        }
      }
      votes: {
        Row: {
          id: string
          content_id: string
          user_id: string
          vote: 'approve' | 'reject'
          weight: number
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          user_id: string
          vote: 'approve' | 'reject'
          weight?: number
          created_at?: string
        }
        Update: {
          id?: string
          content_id?: string
          user_id?: string
          vote?: 'approve' | 'reject'
          weight?: number
          created_at?: string
        }
      }
      share_links: {
        Row: {
          id: string
          token: string
          content_id: string
          type: 'poll' | 'event' | 'post'
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          token?: string
          content_id: string
          type: 'poll' | 'event' | 'post'
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          token?: string
          content_id?: string
          type?: 'poll' | 'event' | 'post'
          expires_at?: string | null
          created_at?: string
        }
      }
      need_activities: {
        Row: {
          id: string
          content_id: string
          title: string
          description: string | null
          is_completed: boolean
          completed_by: string | null
          completed_at: string | null
          proof_image_url: string | null
          proof_description: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          title: string
          description?: string | null
          is_completed?: boolean
          completed_by?: string | null
          completed_at?: string | null
          proof_image_url?: string | null
          proof_description?: string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          content_id?: string
          title?: string
          description?: string | null
          is_completed?: boolean
          completed_by?: string | null
          completed_at?: string | null
          proof_image_url?: string | null
          proof_description?: string | null
          order_index?: number
          created_at?: string
        }
      }
      poll_options: {
        Row: {
          id: string
          content_id: string
          option_text: string
          vote_count: number
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          option_text: string
          vote_count?: number
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          content_id?: string
          option_text?: string
          vote_count?: number
          order_index?: number
          created_at?: string
        }
      }
      poll_votes: {
        Row: {
          id: string
          poll_option_id: string
          user_id: string
          content_id: string
          created_at: string
        }
        Insert: {
          id?: string
          poll_option_id: string
          user_id: string
          content_id: string
          created_at?: string
        }
        Update: {
          id?: string
          poll_option_id?: string
          user_id?: string
          content_id?: string
          created_at?: string
        }
      }
      event_registrations: {
        Row: {
          id: string
          content_id: string
          user_id: string
          status: 'registered' | 'attended' | 'cancelled'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          user_id: string
          status?: 'registered' | 'attended' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          content_id?: string
          user_id?: string
          status?: 'registered' | 'attended' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
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
