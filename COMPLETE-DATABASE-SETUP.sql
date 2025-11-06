-- =====================================================
-- CROWD CONSCIOUS V2 - COMPLETE DATABASE SETUP
-- =====================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- This will set up EVERYTHING needed for the platform
-- =====================================================
-- INSTRUCTIONS:
-- 1. Open Supabase (app.supabase.com)
-- 2. Go to SQL Editor
-- 3. Click "New Query"
-- 4. Copy and paste THIS ENTIRE FILE
-- 5. Click RUN (or Cmd/Ctrl + Enter)
-- 6. Wait for completion (should take 30-60 seconds)
-- 7. You're done! ✅
-- =====================================================

-- =====================================================
-- PART 1: PROMO CODES SYSTEM
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🚀 Starting Crowd Conscious V2 Complete Setup...';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Part 1/3: Setting up Promo Codes...';
END $$;

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free')),
  discount_value NUMERIC(10, 2) NOT NULL,
  max_uses INTEGER,
  max_uses_per_user INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  applicable_modules UUID[],
  applicable_purchase_types TEXT[],
  minimum_purchase_amount NUMERIC(10, 2) DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  partner_name TEXT,
  campaign_name TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  cart_total_before_discount NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL,
  cart_total_after_discount NUMERIC(10, 2) NOT NULL,
  modules_purchased JSONB,
  used_at TIMESTAMP DEFAULT NOW(),
  stripe_session_id TEXT,
  user_ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active) WHERE active = TRUE;

GRANT SELECT ON promo_codes TO authenticated;
GRANT ALL ON promo_code_uses TO authenticated;

INSERT INTO promo_codes (code, description, discount_type, discount_value, partner_name, campaign_name)
VALUES 
  ('LAUNCH100', 'Launch Week - 100% off for strategic partners', 'free', 100, 'Strategic Partners', 'Platform Launch 2025'),
  ('PARTNER50', '50% off for partner organizations', 'percentage', 50, 'Partner Network', 'Partner Program'),
  ('WELCOME25', 'Welcome discount for new users', 'percentage', 25, NULL, 'Welcome Campaign')
ON CONFLICT (code) DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '✅ Promo codes system created';
END $$;

-- =====================================================
-- PART 2: PLATFORM MODULES (6 MODULES)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '📋 Part 2/3: Creating Platform Modules...';
END $$;

-- Ensure is_platform_module column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marketplace_modules' 
        AND column_name = 'is_platform_module'
    ) THEN
        ALTER TABLE marketplace_modules ADD COLUMN is_platform_module BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marketplace_modules' 
        AND column_name = 'individual_price_mxn'
    ) THEN
        ALTER TABLE marketplace_modules ADD COLUMN individual_price_mxn INTEGER;
    END IF;
END $$;

-- Helper function to create or update modules
CREATE OR REPLACE FUNCTION upsert_platform_module(
  p_slug TEXT,
  p_title TEXT,
  p_description TEXT,
  p_core_value TEXT,
  p_difficulty TEXT,
  p_hours INTEGER,
  p_xp INTEGER,
  p_base_price INTEGER,
  p_price_per_50 INTEGER,
  p_lessons INTEGER
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_module_id UUID;
BEGIN
  -- Check if exists
  SELECT id INTO v_module_id FROM marketplace_modules WHERE slug = p_slug LIMIT 1;
  
  IF v_module_id IS NULL THEN
    -- Insert new
    INSERT INTO marketplace_modules (
      title, description, slug, creator_name,
      core_value, difficulty_level, estimated_duration_hours, xp_reward,
      base_price_mxn, price_per_50_employees, individual_price_mxn,
      status, is_platform_module, featured, lesson_count, published_at
    ) VALUES (
      p_title, p_description, p_slug, 'Crowd Conscious Platform',
      p_core_value, p_difficulty, p_hours, p_xp,
      p_base_price, p_price_per_50, 360,
      'published', TRUE, TRUE, p_lessons, NOW()
    ) RETURNING id INTO v_module_id;
  ELSE
    -- Update existing
    UPDATE marketplace_modules 
    SET status = 'published', 
        is_platform_module = TRUE, 
        featured = TRUE, 
        published_at = NOW(),
        individual_price_mxn = 360
    WHERE id = v_module_id;
  END IF;
  
  RETURN v_module_id;
END;
$$;

-- Module 1: Aire Limpio
SELECT upsert_platform_module(
  'aire-limpio-el-despertar-corporativo',
  'Aire Limpio: El Despertar Corporativo',
  'Descubre cómo tu empresa puede mejorar la calidad del aire, reducir emisiones y crear un impacto positivo en la salud de empleados y comunidades.',
  'clean_air', 'beginner', 8, 200, 18000, 8000, 5
);

-- Module 2: Estrategias Avanzadas
SELECT upsert_platform_module(
  'estrategias-avanzadas-calidad-aire',
  'Estrategias Avanzadas de Calidad del Aire',
  'Aprende a medir, analizar y mejorar la calidad del aire en espacios de trabajo con herramientas prácticas y casos de éxito.',
  'clean_air', 'intermediate', 8, 250, 18000, 8000, 5
);

-- Module 3: Gestión del Agua
SELECT upsert_platform_module(
  'gestion-sostenible-agua',
  'Gestión Sostenible del Agua',
  'De la escasez a la abundancia: técnicas probadas para reducir el consumo de agua en un 40%.',
  'clean_water', 'beginner', 6, 200, 18000, 8000, 5
);

-- Module 4: Economía Circular
SELECT upsert_platform_module(
  'economia-circular-cero-residuos',
  'Economía Circular: Cero Residuos',
  'Transforma residuos en recursos. Estrategias de economía circular que reducen costos y generan ingresos.',
  'zero_waste', 'intermediate', 10, 250, 18000, 8000, 6
);

-- Module 5: Ciudades Seguras
SELECT upsert_platform_module(
  'ciudades-seguras-espacios-inclusivos',
  'Ciudades Seguras y Espacios Inclusivos',
  'Crea entornos urbanos seguros, accesibles e inclusivos que beneficien a empleados y comunidades.',
  'safe_cities', 'beginner', 6, 200, 18000, 8000, 5
);

-- Module 6: Comercio Justo
SELECT upsert_platform_module(
  'comercio-justo-cadenas-valor',
  'Comercio Justo y Cadenas de Valor',
  'Construye cadenas de suministro éticas que beneficien a todos los participantes y fortalezcan economías locales.',
  'fair_trade', 'intermediate', 8, 250, 18000, 8000, 5
);

-- Clean up helper function
DROP FUNCTION upsert_platform_module;

DO $$
BEGIN
  RAISE NOTICE '✅ 6 Platform modules created/updated';
END $$;

-- =====================================================
-- PART 3: REVIEW SYSTEM
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '📋 Part 3/3: Creating Review System...';
END $$;

-- Module Reviews
CREATE TABLE IF NOT EXISTS module_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES marketplace_modules(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  would_recommend BOOLEAN DEFAULT TRUE,
  completion_status TEXT CHECK (completion_status IN ('completed', 'in_progress', 'not_started')) DEFAULT 'completed',
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module_id, user_id)
);

-- Community Reviews
CREATE TABLE IF NOT EXISTS community_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  impact_rating INTEGER CHECK (impact_rating >= 1 AND impact_rating <= 5),
  transparency_rating INTEGER CHECK (transparency_rating >= 1 AND transparency_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  would_recommend BOOLEAN DEFAULT TRUE,
  member_status TEXT CHECK (member_status IN ('current_member', 'past_member', 'supporter', 'observer')) DEFAULT 'observer',
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_verified_member BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  community_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Review votes
CREATE TABLE IF NOT EXISTS module_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES module_reviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT CHECK (vote_type IN ('helpful', 'not_helpful')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES community_reviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT CHECK (vote_type IN ('helpful', 'not_helpful')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_module_reviews_module ON module_reviews(module_id);
CREATE INDEX IF NOT EXISTS idx_module_reviews_user ON module_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_community_reviews_community ON community_reviews(community_id);
CREATE INDEX IF NOT EXISTS idx_community_reviews_user ON community_reviews(user_id);

-- RLS
ALTER TABLE module_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_review_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read module reviews" ON module_reviews;
CREATE POLICY "Anyone can read module reviews" ON module_reviews FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can create module reviews" ON module_reviews;
CREATE POLICY "Users can create module reviews" ON module_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own module reviews" ON module_reviews;
CREATE POLICY "Users can update own module reviews" ON module_reviews
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can read community reviews" ON community_reviews;
CREATE POLICY "Anyone can read community reviews" ON community_reviews FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can create community reviews" ON community_reviews;
CREATE POLICY "Users can create community reviews" ON community_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own community reviews" ON community_reviews;
CREATE POLICY "Users can update own community reviews" ON community_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON module_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_reviews TO authenticated;
GRANT ALL ON module_review_votes TO authenticated;
GRANT ALL ON community_review_votes TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Review system created';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '🎉 SETUP COMPLETE!';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '';
END $$;

-- Count results
SELECT 
  '✅ PROMO CODES' as feature,
  COUNT(*) as count
FROM promo_codes
UNION ALL
SELECT 
  '✅ PLATFORM MODULES',
  COUNT(*) FILTER (WHERE is_platform_module = TRUE)
FROM marketplace_modules
UNION ALL
SELECT 
  '✅ PUBLISHED MODULES',
  COUNT(*) FILTER (WHERE status = 'published')
FROM marketplace_modules;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '1. Promo codes ready at /admin/promo-codes';
  RAISE NOTICE '2. Modules ready at /marketplace';
  RAISE NOTICE '3. Review system ready for users';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Platform is ready to use!';
END $$;

