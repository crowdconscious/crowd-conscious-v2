-- ================================================================
-- PROPER ESG REPORTING INFRASTRUCTURE
-- ================================================================
-- Purpose: Create dedicated tables and buckets for activity responses,
-- impact tracking, and ESG report generation
-- Date: November 9, 2025
-- ================================================================

-- ================================================================
-- TABLE 1: activity_responses (Detailed tracking)
-- ================================================================
-- Better structure than JSONB in lesson_responses
-- Allows proper querying, filtering, and analytics

-- Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS activity_responses CASCADE;

CREATE TABLE activity_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User & Enrollment
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  
  -- Module & Lesson
  module_id UUID NOT NULL REFERENCES marketplace_modules(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES module_lessons(id) ON DELETE CASCADE,
  
  -- Activity Details
  activity_type TEXT NOT NULL, -- 'reflection', 'audit', 'assessment', etc.
  activity_title TEXT NOT NULL,
  
  -- Structured Responses (easier to query than JSONB)
  pre_assessment_level TEXT, -- 'Ninguno', 'Básico', 'Intermedio', 'Avanzado'
  key_learning TEXT, -- Long text response
  application_plan TEXT, -- Long text response
  challenges_identified TEXT, -- Long text response
  steps_completed TEXT[], -- Array of completed steps
  confidence_level INTEGER, -- 1-5 rating
  additional_notes TEXT,
  
  -- Custom responses (for module-specific questions)
  custom_responses JSONB DEFAULT '{}'::jsonb,
  
  -- Evidence & Files
  evidence_urls TEXT[] DEFAULT ARRAY[]::text[],
  evidence_metadata JSONB DEFAULT '{}'::jsonb, -- File names, types, sizes
  
  -- Completion Tracking
  completion_percentage INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- Versioning (for re-takes)
  attempt_number INTEGER DEFAULT 1,
  previous_response_id UUID REFERENCES activity_responses(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_confidence CHECK (confidence_level >= 1 AND confidence_level <= 5),
  CONSTRAINT valid_completion CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_activity_responses_user ON activity_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_responses_enrollment ON activity_responses(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_activity_responses_module ON activity_responses(module_id);
CREATE INDEX IF NOT EXISTS idx_activity_responses_lesson ON activity_responses(lesson_id);
CREATE INDEX IF NOT EXISTS idx_activity_responses_created ON activity_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_responses_completed ON activity_responses(completed);

-- ================================================================
-- TABLE 2: impact_measurements (Track progress over time)
-- ================================================================
-- Allows users to re-measure and see improvement

-- Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS impact_measurements CASCADE;

CREATE TABLE impact_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User & Context
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL,
  
  -- Module & Time
  module_id UUID NOT NULL REFERENCES marketplace_modules(id) ON DELETE CASCADE,
  measurement_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  measurement_period TEXT NOT NULL, -- 'baseline', 'month_1', 'month_3', 'month_6', 'year_1'
  
  -- Quantitative Metrics (module-specific)
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example: {"co2_reduced_kg": 150, "water_saved_liters": 5000, "waste_diverted_kg": 200}
  
  -- Qualitative Metrics
  confidence_score INTEGER, -- 1-5
  implementation_level TEXT, -- 'planning', 'piloting', 'scaling', 'embedded'
  challenges_faced TEXT[],
  successes TEXT[],
  
  -- Supporting Evidence
  evidence_urls TEXT[] DEFAULT ARRAY[]::text[],
  notes TEXT,
  
  -- Comparison to Previous
  previous_measurement_id UUID REFERENCES impact_measurements(id),
  improvement_percentage NUMERIC(5,2), -- Calculated improvement
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_impact_measurements_user ON impact_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_impact_measurements_module ON impact_measurements(module_id);
CREATE INDEX IF NOT EXISTS idx_impact_measurements_date ON impact_measurements(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_impact_measurements_period ON impact_measurements(measurement_period);

-- ================================================================
-- TABLE 3: esg_reports (Generated reports)
-- ================================================================
-- Store compiled ESG reports for download

-- Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS esg_reports CASCADE;

CREATE TABLE esg_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User & Account
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL,
  
  -- Report Details
  report_type TEXT NOT NULL, -- 'individual', 'team', 'corporate', 'module_specific'
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  
  -- Modules Included
  modules_included UUID[] NOT NULL, -- Array of module IDs
  
  -- Report Content (structured)
  executive_summary TEXT,
  key_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  activity_responses_included UUID[] DEFAULT ARRAY[]::uuid[], -- References to activity_responses
  impact_measurements_included UUID[] DEFAULT ARRAY[]::uuid[], -- References to impact_measurements
  
  -- Charts & Visualizations
  charts JSONB DEFAULT '{}'::jsonb, -- Chart data for rendering
  
  -- Generated Files
  pdf_url TEXT, -- Link to generated PDF
  excel_url TEXT, -- Link to generated Excel
  json_data JSONB, -- Full data export
  
  -- Sharing & Access
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE, -- For public sharing
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  generated_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_esg_reports_user ON esg_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_esg_reports_corporate ON esg_reports(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_esg_reports_period ON esg_reports(report_period_end DESC);
CREATE INDEX IF NOT EXISTS idx_esg_reports_status ON esg_reports(status);

-- ================================================================
-- RLS POLICIES
-- ================================================================

-- activity_responses: Users can only see their own
ALTER TABLE activity_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own activity responses"
ON activity_responses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users create own activity responses"
ON activity_responses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own activity responses"
ON activity_responses FOR UPDATE
USING (auth.uid() = user_id);

-- impact_measurements: Users view own, admins view team
ALTER TABLE impact_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own impact measurements"
ON impact_measurements FOR SELECT
USING (
  auth.uid() = user_id OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

CREATE POLICY "Users create own impact measurements"
ON impact_measurements FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- esg_reports: Users view own, public if shared
ALTER TABLE esg_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ESG reports"
ON esg_reports FOR SELECT
USING (
  auth.uid() = user_id OR
  is_public = true OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

CREATE POLICY "Users create own ESG reports"
ON esg_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ESG reports"
ON esg_reports FOR UPDATE
USING (auth.uid() = user_id);

-- ================================================================
-- STORAGE BUCKETS
-- ================================================================
-- Note: Run these in Supabase Storage dashboard or via SQL if enabled

/*
1. activity-evidence bucket (if not exists)
   - Purpose: Store user-uploaded evidence files
   - Access: Private, user-specific
   - Path structure: {user_id}/{module_id}/{lesson_id}/{filename}
   
2. esg-reports bucket (if not exists)
   - Purpose: Store generated PDF and Excel reports
   - Access: Private, but shareable with token
   - Path structure: {user_id}/reports/{report_id}/{filename}
   
3. impact-measurements bucket (if not exists)
   - Purpose: Store evidence for impact measurements
   - Access: Private, user-specific
   - Path structure: {user_id}/measurements/{measurement_id}/{filename}
*/

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Function: Calculate improvement percentage
CREATE OR REPLACE FUNCTION calculate_improvement_percentage(
  p_current_measurement_id UUID,
  p_metric_name TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_current_value NUMERIC;
  v_previous_value NUMERIC;
  v_previous_id UUID;
  v_improvement NUMERIC;
BEGIN
  -- Get current measurement
  SELECT 
    (metrics->>p_metric_name)::NUMERIC,
    previous_measurement_id
  INTO v_current_value, v_previous_id
  FROM impact_measurements
  WHERE id = p_current_measurement_id;
  
  -- If no previous measurement, return NULL
  IF v_previous_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get previous measurement
  SELECT (metrics->>p_metric_name)::NUMERIC
  INTO v_previous_value
  FROM impact_measurements
  WHERE id = v_previous_id;
  
  -- Calculate improvement
  IF v_previous_value > 0 THEN
    v_improvement := ((v_current_value - v_previous_value) / v_previous_value) * 100;
    RETURN ROUND(v_improvement, 2);
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user's latest activity responses per module
CREATE OR REPLACE FUNCTION get_latest_responses_per_module(p_user_id UUID)
RETURNS TABLE (
  module_id UUID,
  module_title TEXT,
  total_responses INTEGER,
  avg_confidence NUMERIC,
  last_response_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.module_id,
    mm.title,
    COUNT(ar.id)::INTEGER,
    AVG(ar.confidence_level),
    MAX(ar.created_at)
  FROM activity_responses ar
  JOIN marketplace_modules mm ON ar.module_id = mm.id
  WHERE ar.user_id = p_user_id
  GROUP BY ar.module_id, mm.title
  ORDER BY MAX(ar.created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- MIGRATION FROM lesson_responses (Optional - SKIP FOR NOW)
-- ================================================================
-- Migration can be done later once we understand the exact schema
-- For now, start fresh with the new activity_responses table

/*
-- This migration is DISABLED because column names need verification
-- Run this ONLY after confirming actual lesson_responses schema

INSERT INTO activity_responses (
  user_id,
  enrollment_id,
  module_id,
  lesson_id,
  activity_type,
  activity_title,
  custom_responses,
  evidence_urls,
  created_at
)
SELECT 
  ce.user_id,
  lr.enrollment_id,
  lr.module_id,
  lr.lesson_id,
  'reflection',
  'Actividad de Lección',
  lr.responses, -- Store entire JSONB as custom_responses
  COALESCE(lr.evidence_urls, ARRAY[]::text[]),
  lr.created_at
FROM lesson_responses lr
JOIN course_enrollments ce ON lr.enrollment_id = ce.id
WHERE lr.responses IS NOT NULL;
*/

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check if tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM (
  VALUES 
    ('activity_responses'),
    ('impact_measurements'),
    ('esg_reports')
) AS t(table_name)
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = t.table_name
);

-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('activity_responses', 'impact_measurements', 'esg_reports')
ORDER BY tablename, policyname;

-- ================================================================
-- ✅ ESG INFRASTRUCTURE SETUP COMPLETE
-- ================================================================
-- 
-- 📊 TABLES CREATED:
--   1. activity_responses - Detailed activity tracking
--   2. impact_measurements - Progress over time  
--   3. esg_reports - Generated reports
-- 
-- 🔐 RLS POLICIES: Applied
-- 📈 HELPER FUNCTIONS: Created
-- 
-- 🚀 NEXT STEPS:
--   1. Create storage buckets in Supabase Dashboard:
--      - activity-evidence (Private)
--      - esg-reports (Private, shareable)
--      - impact-measurements (Private)
--   2. Update API to use new activity_responses table
--   3. Build ESG report generator
--   4. Test data flow end-to-end
-- 
-- ✅ Ready to use!

