-- =====================================================
-- CROWD CONSCIOUS V2 - COMPLETE DATABASE SETUP (FIXED)
-- =====================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- This creates ALL tables from scratch, no dependencies
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🚀 Starting Crowd Conscious V2 Complete Setup...';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Step 1/4: Creating base tables...';
END $$;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 1: CREATE MARKETPLACE_MODULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS marketplace_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  creator_community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  creator_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  creator_name TEXT,
  estimated_duration_hours INTEGER NOT NULL DEFAULT 8,
  lesson_count INTEGER DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 200,
  core_value TEXT NOT NULL,
  industry_tags TEXT[],
  difficulty_level TEXT DEFAULT 'beginner',
  base_price_mxn INTEGER NOT NULL DEFAULT 18000,
  price_per_50_employees INTEGER NOT NULL DEFAULT 8000,
  individual_price_mxn INTEGER,
  is_platform_module BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'draft',
  approved_by UUID REFERENCES profiles(id),
  approval_date TIMESTAMP WITH TIME ZONE,
  purchase_count INTEGER DEFAULT 0,
  enrollment_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  completion_rate INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  search_keywords TEXT[],
  thumbnail_url TEXT,
  preview_video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_marketplace_modules_status ON marketplace_modules(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_modules_core_value ON marketplace_modules(core_value);
CREATE INDEX IF NOT EXISTS idx_marketplace_modules_featured ON marketplace_modules(featured);

-- =====================================================
-- STEP 2: CREATE MODULE_LESSONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS module_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES marketplace_modules(id) ON DELETE CASCADE NOT NULL,
  lesson_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_minutes INTEGER NOT NULL DEFAULT 60,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  story_content JSONB,
  learning_objectives TEXT[],
  key_points TEXT[],
  did_you_know TEXT[],
  tools JSONB,
  quiz_questions JSONB,
  interactive_activities JSONB,
  evidence_required BOOLEAN DEFAULT false,
  evidence_prompt TEXT,
  resources JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_lessons_module ON module_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_module_lessons_order ON module_lessons(module_id, lesson_order);

DO $$
BEGIN
  RAISE NOTICE '✅ Base tables created';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Step 2/4: Creating Promo Codes System...';
END $$;

-- =====================================================
-- STEP 3: PROMO CODES SYSTEM
-- =====================================================

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
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  partner_name TEXT,
  campaign_name TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
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

GRANT SELECT ON promo_codes TO authenticated, anon;
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
  RAISE NOTICE '';
  RAISE NOTICE '📋 Step 3/4: Inserting Platform Modules...';
END $$;

-- =====================================================
-- STEP 4: INSERT 6 PLATFORM MODULES
-- =====================================================

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  -- Module 1: Aire Limpio
  INSERT INTO marketplace_modules (
    slug, title, description, core_value, difficulty_level,
    estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
    individual_price_mxn, is_platform_module, status
  ) VALUES (
    'aire-limpio-despertar-corporativo',
    'Aire Limpio: El Despertar Corporativo',
    'Descubre el impacto invisible de la calidad del aire en tu organización y aprende estrategias prácticas para mejorarla.',
    'clean_air', 'beginner', 8, 200, 18000, 8000, 360, TRUE, 'published'
  ) ON CONFLICT (slug) DO UPDATE SET 
    status = 'published',
    is_platform_module = TRUE
  RETURNING id INTO v_module_id;

  -- Module 1 Lessons
  INSERT INTO module_lessons (module_id, lesson_order, title, estimated_minutes, xp_reward)
  SELECT v_module_id, lesson_order, title, minutes, xp FROM (VALUES
    (1, 'El Impacto Invisible', 45, 40),
    (2, 'Identificando Fuentes de Emisión', 60, 50),
    (3, 'Calculando el ROI', 45, 40),
    (4, 'Plan de Acción 90 Días', 60, 50),
    (5, 'Reflexión y Compromiso', 30, 20)
  ) AS lessons(lesson_order, title, minutes, xp)
  ON CONFLICT DO NOTHING;

  -- Module 2: Estrategias Avanzadas
  INSERT INTO marketplace_modules (
    slug, title, description, core_value, difficulty_level,
    estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
    individual_price_mxn, is_platform_module, status
  ) VALUES (
    'estrategias-avanzadas-calidad-aire',
    'Estrategias Avanzadas de Calidad del Aire',
    'Lleva tu programa de calidad del aire al siguiente nivel con monitoreo avanzado, optimización HVAC y certificaciones internacionales.',
    'clean_air', 'intermediate', 8, 250, 18000, 8000, 360, TRUE, 'published'
  ) ON CONFLICT (slug) DO UPDATE SET 
    status = 'published',
    is_platform_module = TRUE
  RETURNING id INTO v_module_id;

  INSERT INTO module_lessons (module_id, lesson_order, title, estimated_minutes, xp_reward)
  SELECT v_module_id, lesson_order, title, minutes, xp FROM (VALUES
    (1, 'Monitoreo Avanzado', 60, 50),
    (2, 'Optimización HVAC', 60, 50),
    (3, 'Flota Verde', 60, 50),
    (4, 'Certificaciones', 45, 50),
    (5, 'Plan Maestro', 75, 50)
  ) AS lessons(lesson_order, title, minutes, xp)
  ON CONFLICT DO NOTHING;

  -- Module 3: Gestión del Agua
  INSERT INTO marketplace_modules (
    slug, title, description, core_value, difficulty_level,
    estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
    individual_price_mxn, is_platform_module, status
  ) VALUES (
    'gestion-sostenible-agua',
    'Gestión Sostenible del Agua',
    'Aprende a calcular tu huella hídrica, implementar estrategias de conservación y cumplir con regulaciones ambientales.',
    'clean_water', 'beginner', 6, 200, 18000, 8000, 360, TRUE, 'published'
  ) ON CONFLICT (slug) DO UPDATE SET 
    status = 'published',
    is_platform_module = TRUE
  RETURNING id INTO v_module_id;

  INSERT INTO module_lessons (module_id, lesson_order, title, estimated_minutes, xp_reward)
  SELECT v_module_id, lesson_order, title, minutes, xp FROM (VALUES
    (1, 'El Agua en tu Empresa', 45, 40),
    (2, 'Huella Hídrica', 60, 50),
    (3, 'Estrategias de Ahorro', 60, 50),
    (4, 'Calidad y Tratamiento', 45, 30),
    (5, 'Plan Gestión Hídrica', 60, 30)
  ) AS lessons(lesson_order, title, minutes, xp)
  ON CONFLICT DO NOTHING;

  -- Module 4: Economía Circular
  INSERT INTO marketplace_modules (
    slug, title, description, core_value, difficulty_level,
    estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
    individual_price_mxn, is_platform_module, status
  ) VALUES (
    'economia-circular-cero-residuos',
    'Economía Circular: Cero Residuos',
    'Transforma tu modelo de negocio hacia la economía circular y alcanza la meta de cero residuos en tu organización.',
    'zero_waste', 'intermediate', 10, 250, 18000, 8000, 360, TRUE, 'published'
  ) ON CONFLICT (slug) DO UPDATE SET 
    status = 'published',
    is_platform_module = TRUE
  RETURNING id INTO v_module_id;

  INSERT INTO module_lessons (module_id, lesson_order, title, estimated_minutes, xp_reward)
  SELECT v_module_id, lesson_order, title, minutes, xp FROM (VALUES
    (1, 'De Lineal a Circular', 45, 40),
    (2, 'Auditoría de Residuos', 60, 50),
    (3, 'Las 5 R''s en Acción', 60, 50),
    (4, 'Reciclaje y Valorización', 60, 50),
    (5, 'Compostaje Corporativo', 45, 30),
    (6, 'Plan Cero Residuos', 75, 30)
  ) AS lessons(lesson_order, title, minutes, xp)
  ON CONFLICT DO NOTHING;

  -- Module 5: Ciudades Seguras
  INSERT INTO marketplace_modules (
    slug, title, description, core_value, difficulty_level,
    estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
    individual_price_mxn, is_platform_module, status
  ) VALUES (
    'ciudades-seguras-espacios-inclusivos',
    'Ciudades Seguras y Espacios Inclusivos',
    'Aprende principios de seguridad urbana y cómo tu organización puede contribuir a crear espacios públicos más seguros e inclusivos.',
    'safe_cities', 'beginner', 6, 200, 18000, 8000, 360, TRUE, 'published'
  ) ON CONFLICT (slug) DO UPDATE SET 
    status = 'published',
    is_platform_module = TRUE
  RETURNING id INTO v_module_id;

  INSERT INTO module_lessons (module_id, lesson_order, title, estimated_minutes, xp_reward)
  SELECT v_module_id, lesson_order, title, minutes, xp FROM (VALUES
    (1, 'Principios de Seguridad Urbana', 45, 40),
    (2, 'Mapeo de Seguridad', 60, 50),
    (3, 'Diseño de Espacios Seguros', 60, 50),
    (4, 'Movilidad Segura', 45, 30),
    (5, 'Plan de Seguridad Comunitaria', 60, 30)
  ) AS lessons(lesson_order, title, minutes, xp)
  ON CONFLICT DO NOTHING;

  -- Module 6: Comercio Justo
  INSERT INTO marketplace_modules (
    slug, title, description, core_value, difficulty_level,
    estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
    individual_price_mxn, is_platform_module, status
  ) VALUES (
    'comercio-justo-cadenas-valor',
    'Comercio Justo y Cadenas de Valor',
    'Implementa prácticas de comercio justo en tu cadena de suministro y aprende a calcular salarios dignos.',
    'fair_trade', 'intermediate', 8, 250, 18000, 8000, 360, TRUE, 'published'
  ) ON CONFLICT (slug) DO UPDATE SET 
    status = 'published',
    is_platform_module = TRUE
  RETURNING id INTO v_module_id;

  INSERT INTO module_lessons (module_id, lesson_order, title, estimated_minutes, xp_reward)
  SELECT v_module_id, lesson_order, title, minutes, xp FROM (VALUES
    (1, 'Principios de Comercio Justo', 45, 50),
    (2, 'Mapeo de Cadena de Suministro', 60, 50),
    (3, 'Sourcing Local', 60, 50),
    (4, 'Salarios y Condiciones Dignas', 45, 50),
    (5, 'Plan de Compras Responsables', 75, 50)
  ) AS lessons(lesson_order, title, minutes, xp)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ 6 Platform modules created and published';
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Step 4/4: Creating Review System...';
END $$;

-- =====================================================
-- STEP 5: REVIEW SYSTEM
-- =====================================================

-- Module Reviews
CREATE TABLE IF NOT EXISTS module_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES marketplace_modules(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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

-- Review votes
CREATE TABLE IF NOT EXISTS module_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES module_reviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT CHECK (vote_type IN ('helpful', 'not_helpful')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES community_reviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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
  RAISE NOTICE '1. Visit /marketplace to see your 6 modules';
  RAISE NOTICE '2. Visit /admin/promo-codes to manage promo codes';
  RAISE NOTICE '3. Review system is ready for users';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Platform is ready to use!';
END $$;

