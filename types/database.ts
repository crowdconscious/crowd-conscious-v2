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

      // ═══════════════════════════════════════
      // PREDICTION / COLLECTIVE CONSCIOUSNESS
      // ═══════════════════════════════════════

      prediction_markets: {
        Row: {
          id: string
          title: string
          description: string
          category: 'world' | 'government' | 'corporate' | 'community' | 'cause'
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
          total_volume: number
          fee_percentage: number
          conscious_fund_percentage: number
          min_trade: number
          tags: string[]
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          category: 'world' | 'government' | 'corporate' | 'community' | 'cause'
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
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          category?: 'world' | 'government' | 'corporate' | 'community' | 'cause'
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
          content_type: 'news_summary' | 'sentiment_report' | 'data_alert' | 'social_post' | 'weekly_digest' | 'market_insight' | 'sponsor_report' | 'social_scrape_log' | 'market_suggestion' | 'content_brief'
          title: string
          body: string
          language: string
          metadata: Json
          published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          market_id?: string | null
          agent_type: 'news_monitor' | 'sentiment_tracker' | 'data_watchdog' | 'content_creator'
          content_type: 'news_summary' | 'sentiment_report' | 'data_alert' | 'social_post' | 'weekly_digest' | 'market_insight' | 'sponsor_report' | 'social_scrape_log' | 'market_suggestion' | 'content_brief'
          title: string
          body: string
          language?: string
          metadata?: Json
          published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          market_id?: string | null
          agent_type?: 'news_monitor' | 'sentiment_tracker' | 'data_watchdog' | 'content_creator'
          content_type?: 'news_summary' | 'sentiment_report' | 'data_alert' | 'social_post' | 'weekly_digest' | 'market_insight' | 'sponsor_report' | 'social_scrape_log' | 'market_suggestion' | 'content_brief'
          title?: string
          body?: string
          language?: string
          metadata?: Json
          published?: boolean
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
