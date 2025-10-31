-- ============================================
-- PHASE 2: MARKETPLACE DATABASE SCHEMA
-- ============================================
-- Purpose: Create tables for two-sided marketplace where communities create modules
-- Version: 1.0
-- Date: October 31, 2025
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. MARKETPLACE MODULES
-- ============================================
-- Modules created by communities for sale in the marketplace

CREATE TABLE IF NOT EXISTS public.marketplace_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Info
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  
  -- Creator Info
  creator_community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  creator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_name TEXT NOT NULL, -- Cached for display
  
  -- Content
  estimated_duration_hours INTEGER NOT NULL, -- Total hours to complete
  lesson_count INTEGER DEFAULT 0,
  xp_reward INTEGER NOT NULL,
  
  -- Classification
  core_value TEXT NOT NULL, -- clean_air, clean_water, safe_cities, zero_waste, fair_trade, biodiversity
  industry_tags TEXT[], -- manufacturing, corporate, food_service, construction, etc.
  difficulty_level TEXT DEFAULT 'beginner', -- beginner, intermediate, advanced
  
  -- Pricing
  base_price_mxn INTEGER NOT NULL, -- Base price for 50 employees
  price_per_50_employees INTEGER NOT NULL, -- Additional cost per 50-employee pack
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, review, published, suspended
  approved_by UUID REFERENCES auth.users(id), -- Admin who approved
  approval_date TIMESTAMP WITH TIME ZONE,
  
  -- Metrics
  purchase_count INTEGER DEFAULT 0,
  enrollment_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  completion_rate INTEGER DEFAULT 0, -- Percentage
  
  -- SEO
  featured BOOLEAN DEFAULT false,
  search_keywords TEXT[], -- For search optimization
  
  -- Media
  thumbnail_url TEXT,
  preview_video_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for marketplace_modules
CREATE INDEX IF NOT EXISTS idx_marketplace_modules_status ON public.marketplace_modules(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_modules_core_value ON public.marketplace_modules(core_value);
CREATE INDEX IF NOT EXISTS idx_marketplace_modules_featured ON public.marketplace_modules(featured);
CREATE INDEX IF NOT EXISTS idx_marketplace_modules_creator_community ON public.marketplace_modules(creator_community_id);

-- ============================================
-- 2. MODULE LESSONS
-- ============================================
-- Individual lessons within marketplace modules

CREATE TABLE IF NOT EXISTS public.module_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES public.marketplace_modules(id) ON DELETE CASCADE NOT NULL,
  
  -- Ordering
  lesson_order INTEGER NOT NULL,
  
  -- Content
  title TEXT NOT NULL,
  description TEXT,
  estimated_minutes INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  
  -- Story Content (JSONB for flexibility)
  story_content JSONB, -- {introduction, mainContent[], conclusion, characterInsight}
  
  -- Learning Content
  learning_objectives TEXT[],
  key_points TEXT[],
  did_you_know TEXT[],
  real_world_example TEXT,
  
  -- Activity
  activity_type TEXT, -- reflection, calculator, assessment, evidence_upload, etc.
  activity_config JSONB, -- Configuration for the activity
  activity_required BOOLEAN DEFAULT false,
  
  -- Tools Integration
  tools_used TEXT[], -- Array of tool IDs (e.g., ['air_quality_assessment', 'reflection_journal'])
  
  -- Resources
  resources JSONB, -- [{title, type, url}]
  
  -- Next Steps
  next_steps TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(module_id, lesson_order)
);

-- Indexes for module_lessons
CREATE INDEX IF NOT EXISTS idx_module_lessons_module_id ON public.module_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_module_lessons_order ON public.module_lessons(module_id, lesson_order);

-- ============================================
-- 3. CREATOR APPLICATIONS
-- ============================================
-- Applications from communities/users to become course creators

CREATE TABLE IF NOT EXISTS public.creator_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Applicant Info
  applicant_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  applicant_community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  
  -- Application Details
  proposed_module_topic TEXT NOT NULL,
  problem_solved TEXT NOT NULL, -- What problem did they solve?
  impact_achieved TEXT NOT NULL, -- What impact/metrics do they have?
  unique_qualification TEXT NOT NULL, -- Why are they uniquely qualified?
  target_audience TEXT NOT NULL, -- Who is this for?
  
  -- Supporting Evidence
  portfolio_links TEXT[], -- Links to past projects, media, etc.
  impact_metrics JSONB, -- Quantitative proof of impact
  
  -- Review
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  review_date TIMESTAMP WITH TIME ZONE,
  
  -- Onboarding
  advance_paid BOOLEAN DEFAULT false, -- Did they receive the $5k advance?
  advance_amount_mxn INTEGER, -- Amount of advance paid
  onboarding_completed BOOLEAN DEFAULT false,
  curriculum_designer_assigned UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for creator_applications
CREATE INDEX IF NOT EXISTS idx_creator_applications_status ON public.creator_applications(status);
CREATE INDEX IF NOT EXISTS idx_creator_applications_user ON public.creator_applications(applicant_user_id);

-- ============================================
-- 4. MODULE REVIEWS
-- ============================================
-- Reviews and ratings from employees who took the modules

CREATE TABLE IF NOT EXISTS public.module_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Review Info
  module_id UUID REFERENCES public.marketplace_modules(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  corporate_account_id UUID REFERENCES public.corporate_accounts(id) ON DELETE CASCADE NOT NULL,
  
  -- Rating
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  -- Feedback
  review_text TEXT,
  pros TEXT, -- What did they like?
  cons TEXT, -- What needs improvement?
  would_recommend BOOLEAN,
  
  -- Context
  completion_time_hours INTEGER, -- How long did it take them?
  job_role TEXT, -- What's their role?
  
  -- Moderation
  flagged BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT true,
  moderation_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(module_id, employee_id)
);

-- Indexes for module_reviews
CREATE INDEX IF NOT EXISTS idx_module_reviews_module ON public.module_reviews(module_id);
CREATE INDEX IF NOT EXISTS idx_module_reviews_rating ON public.module_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_module_reviews_approved ON public.module_reviews(approved);

-- ============================================
-- 5. REVENUE TRANSACTIONS
-- ============================================
-- Track all financial transactions (module sales)

CREATE TABLE IF NOT EXISTS public.revenue_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Transaction Info
  transaction_type TEXT NOT NULL, -- module_sale, bundle_sale, subscription
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Parties
  corporate_account_id UUID REFERENCES public.corporate_accounts(id) ON DELETE SET NULL NOT NULL,
  module_id UUID REFERENCES public.marketplace_modules(id) ON DELETE SET NULL,
  
  -- Amounts (in MXN centavos for precision)
  total_amount_cents INTEGER NOT NULL, -- Total transaction amount
  platform_share_cents INTEGER NOT NULL, -- 30%
  community_share_cents INTEGER NOT NULL, -- 50%
  creator_share_cents INTEGER NOT NULL, -- 20%
  
  -- Details
  employee_count INTEGER NOT NULL, -- How many employees
  module_price_per_pack INTEGER, -- Price per 50-employee pack
  employee_packs INTEGER, -- Number of packs purchased
  
  -- Payment Status
  payment_status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
  payment_method TEXT, -- stripe, bank_transfer, invoice
  payment_reference TEXT, -- External payment ID
  
  -- Payout Status
  platform_paid BOOLEAN DEFAULT false,
  community_paid BOOLEAN DEFAULT false,
  creator_paid BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for revenue_transactions
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_corporate ON public.revenue_transactions(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_module ON public.revenue_transactions(module_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_date ON public.revenue_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_payment_status ON public.revenue_transactions(payment_status);

-- ============================================
-- 6. COMMUNITY WALLETS
-- ============================================
-- Track community earnings from module sales

CREATE TABLE IF NOT EXISTS public.community_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Balance (in MXN centavos)
  balance_cents INTEGER DEFAULT 0 NOT NULL,
  lifetime_earned_cents INTEGER DEFAULT 0 NOT NULL,
  lifetime_withdrawn_cents INTEGER DEFAULT 0 NOT NULL,
  
  -- Payout Info
  payout_method TEXT, -- bank_transfer, paypal, etc.
  payout_details JSONB, -- Bank account info, etc. (encrypted)
  
  -- Status
  status TEXT DEFAULT 'active', -- active, suspended, closed
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for community_wallets
CREATE INDEX IF NOT EXISTS idx_community_wallets_community ON public.community_wallets(community_id);

-- ============================================
-- 7. CART ITEMS
-- ============================================
-- Shopping cart for corporate purchases

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Cart Owner
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  corporate_account_id UUID REFERENCES public.corporate_accounts(id) ON DELETE CASCADE,
  
  -- Item
  module_id UUID REFERENCES public.marketplace_modules(id) ON DELETE CASCADE NOT NULL,
  
  -- Configuration
  employee_count INTEGER NOT NULL DEFAULT 50,
  employee_packs INTEGER NOT NULL DEFAULT 1,
  price_per_pack INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'active', -- active, purchased, abandoned
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, module_id)
);

-- Indexes for cart_items
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_status ON public.cart_items(status);

-- ============================================
-- RLS POLICIES
-- ============================================

-- marketplace_modules: Public can view published, creators can manage their own
ALTER TABLE public.marketplace_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published modules"
ON public.marketplace_modules FOR SELECT
USING (status = 'published' OR auth.uid() IN (SELECT id FROM auth.users));

CREATE POLICY "Creators can insert their own modules"
ON public.marketplace_modules FOR INSERT
TO authenticated
WITH CHECK (creator_user_id = auth.uid());

CREATE POLICY "Creators can update their own modules"
ON public.marketplace_modules FOR UPDATE
TO authenticated
USING (creator_user_id = auth.uid());

-- module_lessons: Same as parent module
ALTER TABLE public.module_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons of published modules"
ON public.module_lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_modules
    WHERE marketplace_modules.id = module_lessons.module_id
    AND (marketplace_modules.status = 'published' OR marketplace_modules.creator_user_id = auth.uid())
  )
);

CREATE POLICY "Creators can manage their module lessons"
ON public.module_lessons FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_modules
    WHERE marketplace_modules.id = module_lessons.module_id
    AND marketplace_modules.creator_user_id = auth.uid()
  )
);

-- creator_applications: Users can view/create their own
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own applications"
ON public.creator_applications FOR SELECT
TO authenticated
USING (applicant_user_id = auth.uid());

CREATE POLICY "Users can create applications"
ON public.creator_applications FOR INSERT
TO authenticated
WITH CHECK (applicant_user_id = auth.uid());

-- module_reviews: Users can view all, manage their own
ALTER TABLE public.module_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews"
ON public.module_reviews FOR SELECT
USING (approved = true);

CREATE POLICY "Employees can create their own reviews"
ON public.module_reviews FOR INSERT
TO authenticated
WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update their own reviews"
ON public.module_reviews FOR UPDATE
TO authenticated
USING (employee_id = auth.uid());

-- revenue_transactions: Restricted to platform admins and involved parties
ALTER TABLE public.revenue_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corporate admins can view their own transactions"
ON public.revenue_transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.corporate_account_id = revenue_transactions.corporate_account_id
    AND profiles.corporate_role = 'admin'
  )
);

-- community_wallets: Community admins can view their own wallet
ALTER TABLE public.community_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community admins can view their wallet"
ON public.community_wallets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_members.user_id = auth.uid()
    AND community_members.community_id = community_wallets.community_id
    AND community_members.role = 'admin'
  )
);

-- cart_items: Users can only see and manage their own cart
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cart"
ON public.cart_items FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own cart"
ON public.cart_items FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
