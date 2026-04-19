-- =====================================================
-- CROWD CONSCIOUS V2 - ADD MISSING FEATURES
-- =====================================================
-- This adds ONLY what's missing from your database
-- Safe to run - uses ON CONFLICT to avoid duplicates
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🚀 Adding missing features to Crowd Conscious V2...';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 1: INSERT 6 PLATFORM MODULES (if not exist)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '📚 Step 1/3: Ensuring 6 platform modules exist...';
END $$;

-- Module 1: Aire Limpio
INSERT INTO marketplace_modules (
  slug, title, description, core_value, difficulty_level,
  estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
  individual_price_mxn, is_platform_module, status, creator_name
) VALUES (
  'aire-limpio-despertar-corporativo',
  'Aire Limpio: El Despertar Corporativo',
  'Descubre el impacto invisible de la calidad del aire en tu organización y aprende estrategias prácticas para mejorarla.',
  'clean_air', 'beginner', 8, 200, 18000, 8000, 360, TRUE, 'published', 'Crowd Conscious Platform'
) ON CONFLICT (slug) DO UPDATE SET 
  status = 'published',
  is_platform_module = TRUE,
  individual_price_mxn = 360,
  creator_name = 'Crowd Conscious Platform';

-- Module 2: Estrategias Avanzadas
INSERT INTO marketplace_modules (
  slug, title, description, core_value, difficulty_level,
  estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
  individual_price_mxn, is_platform_module, status, creator_name
) VALUES (
  'estrategias-avanzadas-calidad-aire',
  'Estrategias Avanzadas de Calidad del Aire',
  'Lleva tu programa de calidad del aire al siguiente nivel con monitoreo avanzado, optimización HVAC y certificaciones internacionales.',
  'clean_air', 'intermediate', 8, 250, 18000, 8000, 360, TRUE, 'published', 'Crowd Conscious Platform'
) ON CONFLICT (slug) DO UPDATE SET 
  status = 'published',
  is_platform_module = TRUE,
  individual_price_mxn = 360,
  creator_name = 'Crowd Conscious Platform';

-- Module 3: Gestión del Agua
INSERT INTO marketplace_modules (
  slug, title, description, core_value, difficulty_level,
  estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
  individual_price_mxn, is_platform_module, status, creator_name
) VALUES (
  'gestion-sostenible-agua',
  'Gestión Sostenible del Agua',
  'Aprende a calcular tu huella hídrica, implementar estrategias de conservación y cumplir con regulaciones ambientales.',
  'clean_water', 'beginner', 6, 200, 18000, 8000, 360, TRUE, 'published', 'Crowd Conscious Platform'
) ON CONFLICT (slug) DO UPDATE SET 
  status = 'published',
  is_platform_module = TRUE,
  individual_price_mxn = 360,
  creator_name = 'Crowd Conscious Platform';

-- Module 4: Economía Circular
INSERT INTO marketplace_modules (
  slug, title, description, core_value, difficulty_level,
  estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
  individual_price_mxn, is_platform_module, status, creator_name
) VALUES (
  'economia-circular-cero-residuos',
  'Economía Circular: Cero Residuos',
  'Transforma tu modelo de negocio hacia la economía circular y alcanza la meta de cero residuos en tu organización.',
  'zero_waste', 'intermediate', 10, 250, 18000, 8000, 360, TRUE, 'published', 'Crowd Conscious Platform'
) ON CONFLICT (slug) DO UPDATE SET 
  status = 'published',
  is_platform_module = TRUE,
  individual_price_mxn = 360,
  creator_name = 'Crowd Conscious Platform';

-- Module 5: Ciudades Seguras
INSERT INTO marketplace_modules (
  slug, title, description, core_value, difficulty_level,
  estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
  individual_price_mxn, is_platform_module, status, creator_name
) VALUES (
  'ciudades-seguras-espacios-inclusivos',
  'Ciudades Seguras y Espacios Inclusivos',
  'Aprende principios de seguridad urbana y cómo tu organización puede contribuir a crear espacios públicos más seguros e inclusivos.',
  'safe_cities', 'beginner', 6, 200, 18000, 8000, 360, TRUE, 'published', 'Crowd Conscious Platform'
) ON CONFLICT (slug) DO UPDATE SET 
  status = 'published',
  is_platform_module = TRUE,
  individual_price_mxn = 360,
  creator_name = 'Crowd Conscious Platform';

-- Module 6: Comercio Justo
INSERT INTO marketplace_modules (
  slug, title, description, core_value, difficulty_level,
  estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
  individual_price_mxn, is_platform_module, status, creator_name
) VALUES (
  'comercio-justo-cadenas-valor',
  'Comercio Justo y Cadenas de Valor',
  'Implementa prácticas de comercio justo en tu cadena de suministro y aprende a calcular salarios dignos.',
  'fair_trade', 'intermediate', 8, 250, 18000, 8000, 360, TRUE, 'published', 'Crowd Conscious Platform'
) ON CONFLICT (slug) DO UPDATE SET 
  status = 'published',
  is_platform_module = TRUE,
  individual_price_mxn = 360,
  creator_name = 'Crowd Conscious Platform';

DO $$
BEGIN
  RAISE NOTICE '✅ 6 Platform modules ensured';
END $$;

-- =====================================================
-- STEP 2: INSERT SAMPLE PROMO CODES (if not exist)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎟️ Step 2/3: Adding sample promo codes...';
END $$;

INSERT INTO promo_codes (code, description, discount_type, discount_value, partner_name, campaign_name, active)
VALUES 
  ('LAUNCH100', 'Launch Week - 100% off for strategic partners', 'free', 100, 'Strategic Partners', 'Platform Launch 2025', TRUE),
  ('PARTNER50', '50% off for partner organizations', 'percentage', 50, 'Partner Network', 'Partner Program', TRUE),
  ('WELCOME25', 'Welcome discount for new users', 'percentage', 25, NULL, 'Welcome Campaign', TRUE)
ON CONFLICT (code) DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '✅ Promo codes added';
END $$;

-- =====================================================
-- STEP 3: CREATE COMMUNITY REVIEW SYSTEM
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '⭐ Step 3/3: Creating community review system...';
END $$;

-- Community Reviews Table
CREATE TABLE IF NOT EXISTS community_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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

-- Module Review Votes (for existing module_reviews)
CREATE TABLE IF NOT EXISTS module_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES module_reviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT CHECK (vote_type IN ('helpful', 'not_helpful')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Community Review Votes
CREATE TABLE IF NOT EXISTS community_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES community_reviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT CHECK (vote_type IN ('helpful', 'not_helpful')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_reviews_community ON community_reviews(community_id);
CREATE INDEX IF NOT EXISTS idx_community_reviews_user ON community_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_module_review_votes_review ON module_review_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_community_review_votes_review ON community_review_votes(review_id);

-- RLS Policies
ALTER TABLE community_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_review_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read community reviews" ON community_reviews;
CREATE POLICY "Anyone can read community reviews" ON community_reviews FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can create community reviews" ON community_reviews;
CREATE POLICY "Users can create community reviews" ON community_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own community reviews" ON community_reviews;
CREATE POLICY "Users can update own community reviews" ON community_reviews
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view review votes" ON module_review_votes;
CREATE POLICY "Anyone can view review votes" ON module_review_votes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can vote on reviews" ON module_review_votes;
CREATE POLICY "Users can vote on reviews" ON module_review_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view community review votes" ON community_review_votes;
CREATE POLICY "Anyone can view community review votes" ON community_review_votes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can vote on community reviews" ON community_review_votes;
CREATE POLICY "Users can vote on community reviews" ON community_review_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON community_reviews TO authenticated;
GRANT ALL ON module_review_votes TO authenticated;
GRANT ALL ON community_review_votes TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Community review system created';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
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
WHERE code IN ('LAUNCH100', 'PARTNER50', 'WELCOME25')
UNION ALL
SELECT 
  '✅ PLATFORM MODULES',
  COUNT(*)
FROM marketplace_modules
WHERE is_platform_module = TRUE
UNION ALL
SELECT 
  '✅ PUBLISHED MODULES',
  COUNT(*)
FROM marketplace_modules
WHERE status = 'published'
UNION ALL
SELECT 
  '✅ COMMUNITY REVIEW TABLES',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'community_reviews'
  ) THEN 1 ELSE 0 END;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was added:';
  RAISE NOTICE '✅ 6 platform modules (upserted)';
  RAISE NOTICE '✅ 3 sample promo codes';
  RAISE NOTICE '✅ Community reviews table';
  RAISE NOTICE '✅ Review voting system';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Visit /marketplace to see modules!';
  RAISE NOTICE '🚀 Visit /admin/promo-codes to manage codes!';
END $$;

