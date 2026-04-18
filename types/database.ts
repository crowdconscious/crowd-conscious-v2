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
          /** When false, marketing prediction emails are skipped (see cron + unsubscribe). */
          email_notifications: boolean | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          user_type?: 'user' | 'brand' | 'admin'
          email_notifications?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          user_type?: 'user' | 'brand' | 'admin'
          email_notifications?: boolean | null
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
      coupon_codes: {
        Row: {
          id: string
          code: string
          type: 'pulse_trial' | 'sponsor_trial' | 'full_access'
          discount_percent: number
          max_uses: number
          current_uses: number
          max_pulse_markets: number
          max_live_events: number
          valid_from: string
          valid_until: string | null
          created_by: string | null
          created_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          code: string
          type?: 'pulse_trial' | 'sponsor_trial' | 'full_access'
          discount_percent?: number
          max_uses?: number
          current_uses?: number
          max_pulse_markets?: number
          max_live_events?: number
          valid_from?: string
          valid_until?: string | null
          created_by?: string | null
          created_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          code?: string
          type?: 'pulse_trial' | 'sponsor_trial' | 'full_access'
          discount_percent?: number
          max_uses?: number
          current_uses?: number
          max_pulse_markets?: number
          max_live_events?: number
          valid_from?: string
          valid_until?: string | null
          created_by?: string | null
          created_at?: string
          is_active?: boolean
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          id: string
          coupon_id: string
          redeemed_by_email: string
          redeemed_by_name: string | null
          sponsor_account_id: string | null
          redeemed_at: string
        }
        Insert: {
          id?: string
          coupon_id: string
          redeemed_by_email: string
          redeemed_by_name?: string | null
          sponsor_account_id?: string | null
          redeemed_at?: string
        }
        Update: {
          id?: string
          coupon_id?: string
          redeemed_by_email?: string
          redeemed_by_name?: string | null
          sponsor_account_id?: string | null
          redeemed_at?: string
        }
        Relationships: []
      }

      // ═══════════════════════════════════════
      // PREDICTION / COLLECTIVE CONSCIOUSNESS
      // ═══════════════════════════════════════

      live_event_fund_snapshots: {
        Row: {
          id: string
          live_event_id: string
          cause_id: string | null
          cause_name: string | null
          total_impact_usd: number
          total_votes_cast: number | null
          created_at: string
        }
        Insert: {
          id?: string
          live_event_id: string
          cause_id?: string | null
          cause_name?: string | null
          total_impact_usd?: number
          total_votes_cast?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          live_event_id?: string
          cause_id?: string | null
          cause_name?: string | null
          total_impact_usd?: number
          total_votes_cast?: number | null
          created_at?: string
        }
        Relationships: []
      }
      live_events: {
        Row: {
          id: string
          title: string
          description: string | null
          translations: Json
          match_date: string
          event_type:
            | 'soccer_match'
            | 'product_launch'
            | 'government_conference'
            | 'entertainment'
            | 'community_event'
            | 'live_auction'
            | 'custom'
          event_subtype: string | null
          suggested_questions: Json
          youtube_url: string | null
          youtube_video_id: string | null
          status: 'scheduled' | 'live' | 'completed' | 'cancelled'
          viewer_count: number
          total_votes_cast: number
          total_fund_impact: number | null
          sponsor_name: string | null
          sponsor_logo_url: string | null
          cover_image_url: string | null
          team_a_name: string | null
          team_a_flag: string | null
          team_b_name: string | null
          team_b_flag: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          reminder_1h_sent_at: string | null
          results_email_sent_at: string | null
          ended_at: string | null
          duration_minutes: number
          started_at: string | null
          ends_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          translations?: Json
          match_date: string
          event_type?:
            | 'soccer_match'
            | 'product_launch'
            | 'government_conference'
            | 'entertainment'
            | 'community_event'
            | 'live_auction'
            | 'custom'
          event_subtype?: string | null
          suggested_questions?: Json
          youtube_url?: string | null
          youtube_video_id?: string | null
          status?: 'scheduled' | 'live' | 'completed' | 'cancelled'
          viewer_count?: number
          total_votes_cast?: number
          total_fund_impact?: number | null
          sponsor_name?: string | null
          sponsor_logo_url?: string | null
          cover_image_url?: string | null
          team_a_name?: string | null
          team_a_flag?: string | null
          team_b_name?: string | null
          team_b_flag?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          reminder_1h_sent_at?: string | null
          results_email_sent_at?: string | null
          ended_at?: string | null
          duration_minutes?: number
          started_at?: string | null
          ends_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          translations?: Json
          match_date?: string
          event_type?:
            | 'soccer_match'
            | 'product_launch'
            | 'government_conference'
            | 'entertainment'
            | 'community_event'
            | 'live_auction'
            | 'custom'
          event_subtype?: string | null
          suggested_questions?: Json
          youtube_url?: string | null
          youtube_video_id?: string | null
          status?: 'scheduled' | 'live' | 'completed' | 'cancelled'
          viewer_count?: number
          total_votes_cast?: number
          total_fund_impact?: number | null
          sponsor_name?: string | null
          sponsor_logo_url?: string | null
          cover_image_url?: string | null
          team_a_name?: string | null
          team_a_flag?: string | null
          team_b_name?: string | null
          team_b_flag?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          reminder_1h_sent_at?: string | null
          results_email_sent_at?: string | null
          ended_at?: string | null
          duration_minutes?: number
          started_at?: string | null
          ends_at?: string | null
        }
        Relationships: []
      }
      live_comments: {
        Row: {
          id: string
          live_event_id: string
          user_id: string | null
          anonymous_participant_id: string | null
          content: string
          author_display_name: string
          author_avatar: string | null
          created_at: string
        }
        Insert: {
          id?: string
          live_event_id: string
          user_id?: string | null
          anonymous_participant_id?: string | null
          content: string
          author_display_name: string
          author_avatar?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          live_event_id?: string
          user_id?: string | null
          anonymous_participant_id?: string | null
          content?: string
          author_display_name?: string
          author_avatar?: string | null
          created_at?: string
        }
        Relationships: []
      }

      market_outcomes: {
        Row: {
          id: string
          market_id: string
          label: string
          description: string | null
          probability: number
          vote_count: number
          total_confidence: number
          sort_order: number | null
          is_winner: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          market_id: string
          label: string
          description?: string | null
          probability?: number
          vote_count?: number
          total_confidence?: number
          sort_order?: number | null
          is_winner?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          label?: string
          description?: string | null
          probability?: number
          vote_count?: number
          total_confidence?: number
          sort_order?: number | null
          is_winner?: boolean | null
          created_at?: string
        }
      }

      anonymous_participants: {
        Row: {
          id: string
          session_id: string
          alias: string
          avatar_emoji: string | null
          created_at: string
          last_active_at: string
          total_votes: number
          total_xp: number
          converted_to_user_id: string | null
          ip_hash: string | null
        }
        Insert: {
          id?: string
          session_id: string
          alias: string
          avatar_emoji?: string | null
          created_at?: string
          last_active_at?: string
          total_votes?: number
          total_xp?: number
          converted_to_user_id?: string | null
          ip_hash?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          alias?: string
          avatar_emoji?: string | null
          created_at?: string
          last_active_at?: string
          total_votes?: number
          total_xp?: number
          converted_to_user_id?: string | null
          ip_hash?: string | null
        }
      }

      market_votes: {
        Row: {
          id: string
          market_id: string
          outcome_id: string
          user_id: string | null
          anonymous_participant_id: string | null
          session_id: string | null
          confidence: number
          xp_earned: number
          is_correct: boolean | null
          bonus_xp: number | null
          is_anonymous: boolean
          created_at: string
          updated_at?: string | null
          change_count?: number | null
          reasoning?: string | null
        }
        Insert: {
          id?: string
          market_id: string
          outcome_id: string
          user_id?: string | null
          anonymous_participant_id?: string | null
          session_id?: string | null
          confidence: number
          xp_earned?: number
          is_correct?: boolean | null
          bonus_xp?: number | null
          is_anonymous?: boolean
          created_at?: string
          reasoning?: string | null
        }
        Update: {
          id?: string
          market_id?: string
          outcome_id?: string
          user_id?: string | null
          anonymous_participant_id?: string | null
          session_id?: string | null
          confidence?: number
          xp_earned?: number
          is_correct?: boolean | null
          bonus_xp?: number | null
          is_anonymous?: boolean
          created_at?: string
          reasoning?: string | null
        }
      }

      prediction_markets: {
        Row: {
          id: string
          title: string
          description: string
          category:
            | 'world'
            | 'world_cup'
            | 'government'
            | 'geopolitics'
            | 'sustainability'
            | 'corporate'
            | 'community'
            | 'cause'
            | 'pulse'
            | 'technology'
            | 'economy'
            | 'entertainment'
          subcategory: string | null
          resolution_criteria: string
          resolution_date: string
          created_by: string
          verification_sources: string[]
          status: 'proposed' | 'approved' | 'active' | 'trading' | 'resolved' | 'disputed' | 'cancelled'
          resolved_outcome: boolean | null
          resolved_at: string | null
          resolution_evidence: Json
          current_probability: number
          /** Registered vote rows — community probability */
          total_votes?: number | null
          /** All interactions incl. anonymous — reach */
          engagement_count?: number | null
          live_event_id: string | null
          is_micro_market: boolean | null
          sponsor_label: string | null
          expires_in_minutes: number | null
          is_pulse: boolean
          pulse_client_name: string | null
          pulse_client_logo: string | null
          pulse_client_email: string | null
          pulse_embed_enabled: boolean
          cover_image_url: string | null
          market_type?: string | null
          total_volume: number
          fee_percentage: number
          conscious_fund_percentage: number
          min_trade: number
          tags: string[]
          metadata: Json
          sponsor_account_id?: string | null
          archived_at?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          category:
            | 'world'
            | 'world_cup'
            | 'government'
            | 'geopolitics'
            | 'sustainability'
            | 'corporate'
            | 'community'
            | 'cause'
            | 'pulse'
            | 'technology'
            | 'economy'
            | 'entertainment'
          subcategory?: string | null
          resolution_criteria: string
          resolution_date: string
          created_by: string
          verification_sources?: string[]
          status?: 'proposed' | 'approved' | 'active' | 'trading' | 'resolved' | 'disputed' | 'cancelled'
          resolved_outcome?: boolean | null
          resolved_at?: string | null
          resolution_evidence?: Json
          current_probability?: number
          total_volume?: number
          fee_percentage?: number
          conscious_fund_percentage?: number
          min_trade?: number
          tags?: string[]
          metadata?: Json
          sponsor_account_id?: string | null
          archived_at?: string | null
          live_event_id?: string | null
          is_micro_market?: boolean | null
          sponsor_label?: string | null
          expires_in_minutes?: number | null
          is_pulse?: boolean
          pulse_client_name?: string | null
          pulse_client_logo?: string | null
          pulse_client_email?: string | null
          pulse_embed_enabled?: boolean
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          category?:
            | 'world'
            | 'world_cup'
            | 'government'
            | 'geopolitics'
            | 'sustainability'
            | 'corporate'
            | 'community'
            | 'cause'
            | 'pulse'
            | 'technology'
            | 'economy'
            | 'entertainment'
          subcategory?: string | null
          resolution_criteria?: string
          resolution_date?: string
          created_by?: string
          verification_sources?: string[]
          status?: 'proposed' | 'approved' | 'active' | 'trading' | 'resolved' | 'disputed' | 'cancelled'
          resolved_outcome?: boolean | null
          resolved_at?: string | null
          resolution_evidence?: Json
          current_probability?: number
          total_volume?: number
          fee_percentage?: number
          conscious_fund_percentage?: number
          min_trade?: number
          tags?: string[]
          metadata?: Json
          sponsor_account_id?: string | null
          archived_at?: string | null
          live_event_id?: string | null
          is_micro_market?: boolean | null
          sponsor_label?: string | null
          expires_in_minutes?: number | null
          is_pulse?: boolean
          pulse_client_name?: string | null
          pulse_client_logo?: string | null
          pulse_client_email?: string | null
          pulse_embed_enabled?: boolean
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      prediction_trades: {
        Row: {
          id: string
          market_id: string
          user_id: string
          side: 'yes' | 'no'
          amount: number
          price: number
          fee_amount: number
          conscious_fund_amount: number
          status: 'pending' | 'filled' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          market_id: string
          user_id: string
          side: 'yes' | 'no'
          amount: number
          price: number
          fee_amount: number
          conscious_fund_amount: number
          status?: 'pending' | 'filled' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          user_id?: string
          side?: 'yes' | 'no'
          amount?: number
          price?: number
          fee_amount?: number
          conscious_fund_amount?: number
          status?: 'pending' | 'filled' | 'cancelled'
          created_at?: string
        }
      }
      prediction_positions: {
        Row: {
          id: string
          user_id: string
          market_id: string
          side: 'yes' | 'no'
          shares: number
          average_price: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          market_id: string
          side: 'yes' | 'no'
          shares?: number
          average_price?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          market_id?: string
          side?: 'yes' | 'no'
          shares?: number
          average_price?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      prediction_wallets: {
        Row: {
          id: string
          user_id: string
          balance: number
          total_deposited: number
          total_withdrawn: number
          total_won: number
          total_lost: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          total_deposited?: number
          total_withdrawn?: number
          total_won?: number
          total_lost?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          total_deposited?: number
          total_withdrawn?: number
          total_won?: number
          total_lost?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      prediction_deposits: {
        Row: {
          id: string
          user_id: string
          wallet_id: string
          stripe_payment_intent_id: string
          amount: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wallet_id: string
          stripe_payment_intent_id: string
          amount: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wallet_id?: string
          stripe_payment_intent_id?: string
          amount?: number
          status?: string
          created_at?: string
        }
      }
      sponsor_accounts: {
        Row: {
          id: string
          company_name: string
          contact_email: string
          contact_name: string | null
          logo_url: string | null
          access_token: string
          user_id: string | null
          tier: string
          is_pulse_client: boolean | null
          pulse_subscription_active: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          total_spent: number | null
          total_fund_contribution: number | null
          created_at: string
          last_login_at: string | null
          last_dashboard_visit: string | null
          status: 'active' | 'paused' | 'cancelled' | null
          max_pulse_markets: number
          used_pulse_markets: number
          max_live_events: number
          used_live_events: number
          has_custom_branding: boolean
          has_api_access: boolean
          has_white_label: boolean
        }
        Insert: {
          id?: string
          company_name: string
          contact_email: string
          contact_name?: string | null
          logo_url?: string | null
          access_token?: string
          user_id?: string | null
          tier?: string
          is_pulse_client?: boolean | null
          pulse_subscription_active?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          total_spent?: number | null
          total_fund_contribution?: number | null
          created_at?: string
          last_login_at?: string | null
          last_dashboard_visit?: string | null
          status?: 'active' | 'paused' | 'cancelled' | null
          max_pulse_markets?: number
          used_pulse_markets?: number
          max_live_events?: number
          used_live_events?: number
          has_custom_branding?: boolean
          has_api_access?: boolean
          has_white_label?: boolean
        }
        Update: {
          id?: string
          company_name?: string
          contact_email?: string
          contact_name?: string | null
          logo_url?: string | null
          access_token?: string
          user_id?: string | null
          tier?: string
          is_pulse_client?: boolean | null
          pulse_subscription_active?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          total_spent?: number | null
          total_fund_contribution?: number | null
          created_at?: string
          last_login_at?: string | null
          last_dashboard_visit?: string | null
          status?: 'active' | 'paused' | 'cancelled' | null
          max_pulse_markets?: number
          used_pulse_markets?: number
          max_live_events?: number
          used_live_events?: number
          has_custom_branding?: boolean
          has_api_access?: boolean
          has_white_label?: boolean
        }
        Relationships: []
      }
      sponsorship_log: {
        Row: {
          id: string
          stripe_session_id: string | null
          sponsorship_id: string | null
          sponsor_name: string
          is_anonymous: boolean
          sponsor_tier: string
          amount_paid: number
          stripe_fee: number
          net_amount: number
          fund_allocation: number
          fund_percent: number
          platform_revenue: number
          market_id: string | null
          cause_id: string | null
          paid_at: string
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          stripe_session_id?: string | null
          sponsorship_id?: string | null
          sponsor_name: string
          is_anonymous?: boolean
          sponsor_tier: string
          amount_paid: number
          stripe_fee?: number
          net_amount: number
          fund_allocation: number
          fund_percent: number
          platform_revenue: number
          market_id?: string | null
          cause_id?: string | null
          paid_at?: string
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          stripe_session_id?: string | null
          sponsorship_id?: string | null
          sponsor_name?: string
          is_anonymous?: boolean
          sponsor_tier?: string
          amount_paid?: number
          stripe_fee?: number
          net_amount?: number
          fund_allocation?: number
          fund_percent?: number
          platform_revenue?: number
          market_id?: string | null
          cause_id?: string | null
          paid_at?: string
          is_public?: boolean
          created_at?: string
        }
      }
      conscious_locations: {
        Row: {
          id: string
          name: string
          slug: string
          category:
            | 'restaurant'
            | 'bar'
            | 'cafe'
            | 'hotel'
            | 'coworking'
            | 'store'
            | 'brand'
            | 'influencer'
            | 'festival'
            | 'artist'
            | 'gallery'
            | 'club'
            | 'market'
            | 'food_truck'
            | 'mezcaleria'
            | 'rooftop'
            | 'gym'
            | 'spa'
            | 'nonprofit'
            | 'venue'
            | 'other'
          city: string
          neighborhood: string | null
          address: string | null
          latitude: number | null
          longitude: number | null
          description: string | null
          description_en: string | null
          why_conscious: string | null
          why_conscious_en: string | null
          user_benefits: string | null
          user_benefits_en: string | null
          instagram_handle: string | null
          website_url: string | null
          contact_email: string | null
          phone: string | null
          logo_url: string | null
          cover_image_url: string | null
          conscious_score: number | null
          approval_rate: number | null
          avg_confidence: number | null
          total_votes: number
          current_market_id: string | null
          sponsor_account_id: string | null
          status: 'pending' | 'active' | 'under_review' | 'suspended' | 'revoked'
          certified_at: string | null
          certified_by: string | null
          next_review_date: string | null
          is_featured: boolean
          sort_order: number
          nomination_count: number
          created_at: string
          updated_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          name: string
          slug: string
          category?:
            | 'restaurant'
            | 'bar'
            | 'cafe'
            | 'hotel'
            | 'coworking'
            | 'store'
            | 'brand'
            | 'influencer'
            | 'festival'
            | 'artist'
            | 'gallery'
            | 'club'
            | 'market'
            | 'food_truck'
            | 'mezcaleria'
            | 'rooftop'
            | 'gym'
            | 'spa'
            | 'nonprofit'
            | 'venue'
            | 'other'
          city?: string
          neighborhood?: string | null
          address?: string | null
          latitude?: number | null
          longitude?: number | null
          description?: string | null
          description_en?: string | null
          why_conscious?: string | null
          why_conscious_en?: string | null
          user_benefits?: string | null
          user_benefits_en?: string | null
          instagram_handle?: string | null
          website_url?: string | null
          contact_email?: string | null
          phone?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          conscious_score?: number | null
          approval_rate?: number | null
          avg_confidence?: number | null
          total_votes?: number
          current_market_id?: string | null
          sponsor_account_id?: string | null
          status?: 'pending' | 'active' | 'under_review' | 'suspended' | 'revoked'
          certified_at?: string | null
          certified_by?: string | null
          next_review_date?: string | null
          is_featured?: boolean
          sort_order?: number
          nomination_count?: number
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          category?:
            | 'restaurant'
            | 'bar'
            | 'cafe'
            | 'hotel'
            | 'coworking'
            | 'store'
            | 'brand'
            | 'influencer'
            | 'festival'
            | 'artist'
            | 'gallery'
            | 'club'
            | 'market'
            | 'food_truck'
            | 'mezcaleria'
            | 'rooftop'
            | 'gym'
            | 'spa'
            | 'nonprofit'
            | 'venue'
            | 'other'
          city?: string
          neighborhood?: string | null
          address?: string | null
          latitude?: number | null
          longitude?: number | null
          description?: string | null
          description_en?: string | null
          why_conscious?: string | null
          why_conscious_en?: string | null
          user_benefits?: string | null
          user_benefits_en?: string | null
          instagram_handle?: string | null
          website_url?: string | null
          contact_email?: string | null
          phone?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          conscious_score?: number | null
          approval_rate?: number | null
          avg_confidence?: number | null
          total_votes?: number
          current_market_id?: string | null
          sponsor_account_id?: string | null
          status?: 'pending' | 'active' | 'under_review' | 'suspended' | 'revoked'
          certified_at?: string | null
          certified_by?: string | null
          next_review_date?: string | null
          is_featured?: boolean
          sort_order?: number
          nomination_count?: number
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
      }
      conscious_fund: {
        Row: {
          id: string
          total_collected: number
          total_disbursed: number
          current_balance: number
          updated_at: string
        }
        Insert: {
          id?: string
          total_collected?: number
          total_disbursed?: number
          current_balance?: number
          updated_at?: string
        }
        Update: {
          id?: string
          total_collected?: number
          total_disbursed?: number
          current_balance?: number
          updated_at?: string
        }
      }
      conscious_fund_transactions: {
        Row: {
          id: string
          amount: number
          source_type: 'trade_fee' | 'donation' | 'sponsorship'
          source_id: string | null
          market_id: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          amount: number
          source_type: 'trade_fee' | 'donation' | 'sponsorship'
          source_id?: string | null
          market_id?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          amount?: number
          source_type?: 'trade_fee' | 'donation' | 'sponsorship'
          source_id?: string | null
          market_id?: string | null
          description?: string | null
          created_at?: string
        }
      }
      prediction_market_history: {
        Row: {
          id: string
          market_id: string
          probability: number
          volume_24h: number
          trade_count: number
          recorded_at: string
        }
        Insert: {
          id?: string
          market_id: string
          probability: number
          volume_24h?: number
          trade_count?: number
          recorded_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          probability?: number
          volume_24h?: number
          trade_count?: number
          recorded_at?: string
        }
      }
      agent_content: {
        Row: {
          id: string
          market_id: string | null
          agent_type: 'news_monitor' | 'sentiment_tracker' | 'data_watchdog' | 'content_creator'
          content_type: 'news_summary' | 'sentiment_report' | 'data_alert' | 'social_post' | 'weekly_digest' | 'market_insight' | 'sponsor_report' | 'social_scrape_log' | 'market_suggestion' | 'content_brief' | 'blog_post'
          title: string
          body: string
          language: string
          metadata: Json
          published: boolean
          archived_at?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          market_id?: string | null
          agent_type: 'news_monitor' | 'sentiment_tracker' | 'data_watchdog' | 'content_creator'
          content_type: 'news_summary' | 'sentiment_report' | 'data_alert' | 'social_post' | 'weekly_digest' | 'market_insight' | 'sponsor_report' | 'social_scrape_log' | 'market_suggestion' | 'content_brief' | 'blog_post'
          title: string
          body: string
          language?: string
          metadata?: Json
          published?: boolean
          archived_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          market_id?: string | null
          agent_type?: 'news_monitor' | 'sentiment_tracker' | 'data_watchdog' | 'content_creator'
          content_type?: 'news_summary' | 'sentiment_report' | 'data_alert' | 'social_post' | 'weekly_digest' | 'market_insight' | 'sponsor_report' | 'social_scrape_log' | 'market_suggestion' | 'content_brief' | 'blog_post'
          title?: string
          body?: string
          language?: string
          metadata?: Json
          published?: boolean
          archived_at?: string | null
          created_at?: string
        }
      }
      blog_posts: {
        Row: {
          id: string
          slug: string
          title: string
          title_en: string | null
          excerpt: string
          excerpt_en: string | null
          content: string
          content_en: string | null
          cover_image_url: string | null
          category: 'insight' | 'pulse_analysis' | 'market_story' | 'world_cup' | 'behind_data'
          tags: string[]
          meta_title: string | null
          meta_description: string | null
          related_market_ids: string[]
          related_pulse_id: string | null
          pulse_market_id: string | null
          pulse_embed_position: string
          pulse_embed_components: Json
          generated_by: string | null
          agent_content_id: string | null
          edited_by: string | null
          status: 'draft' | 'published' | 'archived'
          published_at: string | null
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          title_en?: string | null
          excerpt: string
          excerpt_en?: string | null
          content: string
          content_en?: string | null
          cover_image_url?: string | null
          category?: 'insight' | 'pulse_analysis' | 'market_story' | 'world_cup' | 'behind_data'
          tags?: string[]
          meta_title?: string | null
          meta_description?: string | null
          related_market_ids?: string[]
          related_pulse_id?: string | null
          pulse_market_id?: string | null
          pulse_embed_position?: string
          pulse_embed_components?: Json
          generated_by?: string | null
          agent_content_id?: string | null
          edited_by?: string | null
          status?: 'draft' | 'published' | 'archived'
          published_at?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          title_en?: string | null
          excerpt?: string
          excerpt_en?: string | null
          content?: string
          content_en?: string | null
          cover_image_url?: string | null
          category?: 'insight' | 'pulse_analysis' | 'market_story' | 'world_cup' | 'behind_data'
          tags?: string[]
          meta_title?: string | null
          meta_description?: string | null
          related_market_ids?: string[]
          related_pulse_id?: string | null
          pulse_market_id?: string | null
          pulse_embed_position?: string
          pulse_embed_components?: Json
          generated_by?: string | null
          agent_content_id?: string | null
          edited_by?: string | null
          status?: 'draft' | 'published' | 'archived'
          published_at?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      blog_comments: {
        Row: {
          id: string
          blog_post_id: string
          user_id: string | null
          anonymous_participant_id: string | null
          author_name: string
          author_avatar: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          blog_post_id: string
          user_id?: string | null
          anonymous_participant_id?: string | null
          author_name: string
          author_avatar?: string | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          blog_post_id?: string
          user_id?: string | null
          anonymous_participant_id?: string | null
          author_name?: string
          author_avatar?: string | null
          content?: string
          created_at?: string
        }
      }
      sentiment_scores: {
        Row: {
          id: string
          market_id: string
          score: number
          source: string
          keywords: string[]
          sample_size: number | null
          recorded_at: string
        }
        Insert: {
          id?: string
          market_id: string
          score: number
          source: string
          keywords?: string[]
          sample_size?: number | null
          recorded_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          score?: number
          source?: string
          keywords?: string[]
          sample_size?: number | null
          recorded_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_profiles_public: {
        Args: { p_ids: string[] }
        Returns: {
          id: string
          full_name: string | null
          avatar_url: string | null
        }[]
      }
      increment_live_event_fund_impact: {
        Args: { p_live_event_id: string; p_delta: number }
        Returns: undefined
      }
      execute_live_anonymous_market_vote: {
        Args: {
          p_guest_id: string
          p_market_id: string
          p_outcome_id: string
          p_confidence: number
        }
        Returns: Json
      }
      increment_anonymous_xp: {
        Args: { p_participant_id: string; p_xp_amount: number }
        Returns: undefined
      }
      execute_alias_anonymous_market_vote: {
        Args: {
          p_participant_id: string
          p_market_id: string
          p_outcome_id: string
          p_confidence: number
        }
        Returns: Json
      }
      convert_anonymous_to_user: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: Json
      }
      increment_blog_post_view: {
        Args: { p_slug: string }
        Returns: undefined
      }
      create_multi_market: {
        Args: {
          p_title: string
          p_description: string
          p_category: string
          p_created_by: string
          p_end_date: string
          p_outcomes: string[]
          p_sponsor_name?: string | null
          p_sponsor_logo_url?: string | null
          p_image_url?: string | null
          p_resolution_criteria?: string | null
        }
        Returns: string
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
