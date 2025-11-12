-- =====================================================
-- PHASE 3: DATABASE SCHEMA SIMPLIFICATION
-- =====================================================
-- Purpose: Consolidate progress fields, add missing indexes,
--          create unified progress views, clarify business rules
-- Impact: Better performance, clearer data model, easier queries
-- Safe to run: Uses IF NOT EXISTS and preserves existing data
-- Date: December 2025
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Consolidate Progress Fields
-- =====================================================
-- Standardize on progress_percentage (deprecate completion_percentage)
-- Standardize on completed_at (deprecate completion_date)

-- Ensure progress_percentage exists and sync with completion_percentage
DO $$
BEGIN
  -- Add progress_percentage if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_enrollments' AND column_name = 'progress_percentage'
  ) THEN
    ALTER TABLE course_enrollments 
    ADD COLUMN progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
    
    -- Copy data from completion_percentage if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'course_enrollments' AND column_name = 'completion_percentage'
    ) THEN
      UPDATE course_enrollments 
      SET progress_percentage = completion_percentage 
      WHERE progress_percentage = 0 AND completion_percentage > 0;
    END IF;
    
    RAISE NOTICE '✅ Added progress_percentage column';
  ELSE
    RAISE NOTICE 'ℹ️  progress_percentage already exists';
  END IF;
END $$;

-- Sync completion_percentage with progress_percentage (backward compatibility)
-- This ensures both fields stay in sync until we fully migrate
CREATE OR REPLACE FUNCTION sync_progress_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If progress_percentage changed, update completion_percentage
  IF TG_OP = 'UPDATE' AND NEW.progress_percentage IS DISTINCT FROM OLD.progress_percentage THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'course_enrollments' AND column_name = 'completion_percentage'
    ) THEN
      NEW.completion_percentage = NEW.progress_percentage;
    END IF;
  END IF;
  
  -- If completion_percentage changed, update progress_percentage (legacy support)
  IF TG_OP = 'UPDATE' AND NEW.completion_percentage IS DISTINCT FROM OLD.completion_percentage THEN
    NEW.progress_percentage = NEW.completion_percentage;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_progress_fields_trigger ON course_enrollments;
CREATE TRIGGER sync_progress_fields_trigger
  BEFORE UPDATE ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION sync_progress_fields();

-- Ensure completed_at exists and sync with completion_date
DO $$
BEGIN
  -- Add completed_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_enrollments' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE course_enrollments 
    ADD COLUMN completed_at TIMESTAMP NULL;
    
    -- Copy data from completion_date if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'course_enrollments' AND column_name = 'completion_date'
    ) THEN
      UPDATE course_enrollments 
      SET completed_at = completion_date 
      WHERE completed_at IS NULL AND completion_date IS NOT NULL;
    END IF;
    
    RAISE NOTICE '✅ Added completed_at column';
  ELSE
    RAISE NOTICE 'ℹ️  completed_at already exists';
  END IF;
END $$;

-- Sync completion_date with completed_at (backward compatibility)
CREATE OR REPLACE FUNCTION sync_completion_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- If completed_at changed, update completion_date
  IF TG_OP = 'UPDATE' AND NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'course_enrollments' AND column_name = 'completion_date'
    ) THEN
      NEW.completion_date = NEW.completed_at;
    END IF;
  END IF;
  
  -- If completion_date changed, update completed_at (legacy support)
  IF TG_OP = 'UPDATE' AND NEW.completion_date IS DISTINCT FROM OLD.completion_date THEN
    NEW.completed_at = NEW.completion_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_completion_dates_trigger ON course_enrollments;
CREATE TRIGGER sync_completion_dates_trigger
  BEFORE UPDATE ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION sync_completion_dates();

-- Add helpful comments
COMMENT ON COLUMN course_enrollments.progress_percentage IS 
  '✅ PRIMARY: Progress percentage (0-100). Use this field going forward.';
COMMENT ON COLUMN course_enrollments.completion_percentage IS 
  '⚠️ DEPRECATED: Use progress_percentage instead. Kept for backward compatibility.';
COMMENT ON COLUMN course_enrollments.completed_at IS 
  '✅ PRIMARY: Completion timestamp. Use this field going forward.';
COMMENT ON COLUMN course_enrollments.completion_date IS 
  '⚠️ DEPRECATED: Use completed_at instead. Kept for backward compatibility.';

-- =====================================================
-- STEP 2: Add Missing Foreign Key Indexes
-- =====================================================
-- Critical for JOIN performance (10-100x speedup)

-- course_enrollments indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_module_id 
ON course_enrollments(module_id) 
WHERE module_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_course_id 
ON course_enrollments(course_id) 
WHERE course_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_user_corporate 
ON course_enrollments(user_id, corporate_account_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_user_module 
ON course_enrollments(user_id, module_id) 
WHERE module_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_corporate_module 
ON course_enrollments(corporate_account_id, module_id) 
WHERE corporate_account_id IS NOT NULL AND module_id IS NOT NULL;

-- lesson_responses indexes
CREATE INDEX IF NOT EXISTS idx_lesson_responses_enrollment_id 
ON lesson_responses(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_lesson_responses_lesson_id 
ON lesson_responses(lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_responses_enrollment_lesson 
ON lesson_responses(enrollment_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_responses_completed 
ON lesson_responses(enrollment_id, completed) 
WHERE completed = true;

-- activity_responses indexes
CREATE INDEX IF NOT EXISTS idx_activity_responses_enrollment_id 
ON activity_responses(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_activity_responses_lesson_id 
ON activity_responses(lesson_id);

CREATE INDEX IF NOT EXISTS idx_activity_responses_module_id 
ON activity_responses(module_id);

CREATE INDEX IF NOT EXISTS idx_activity_responses_user_id 
ON activity_responses(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_responses_enrollment_lesson 
ON activity_responses(enrollment_id, lesson_id);

-- =====================================================
-- STEP 3: Add CHECK Constraints for Business Rules
-- =====================================================
-- Clarify enrollment type logic

-- Ensure enrollment has either course_id OR module_id (not both, not neither)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'enrollment_type_check'
  ) THEN
    ALTER TABLE course_enrollments
    ADD CONSTRAINT enrollment_type_check CHECK (
      (course_id IS NULL AND module_id IS NOT NULL) OR
      (course_id IS NOT NULL AND module_id IS NULL)
    );
    
    RAISE NOTICE '✅ Added enrollment_type_check constraint';
  ELSE
    RAISE NOTICE 'ℹ️  enrollment_type_check constraint already exists';
  END IF;
END $$;

-- Ensure user_id is not null when enrollment is created
DO $$
BEGIN
  -- Check if there are any NULL user_ids
  IF EXISTS (
    SELECT 1 FROM course_enrollments WHERE user_id IS NULL LIMIT 1
  ) THEN
    RAISE NOTICE '⚠️  WARNING: Found enrollments with NULL user_id. Cannot add NOT NULL constraint yet.';
    RAISE NOTICE '⚠️  Please fix NULL user_ids before adding NOT NULL constraint.';
  ELSE
    -- Only add NOT NULL if no NULL values exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'course_enrollments' 
      AND column_name = 'user_id' 
      AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE course_enrollments
      ALTER COLUMN user_id SET NOT NULL;
      
      RAISE NOTICE '✅ Made user_id NOT NULL';
    ELSE
      RAISE NOTICE 'ℹ️  user_id already NOT NULL';
    END IF;
  END IF;
END $$;

-- Ensure progress_percentage is valid (0-100)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'enrollments_progress_percentage_check'
  ) THEN
    ALTER TABLE course_enrollments
    ADD CONSTRAINT enrollments_progress_percentage_check 
    CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
    
    RAISE NOTICE '✅ Added progress_percentage check constraint';
  ELSE
    RAISE NOTICE 'ℹ️  progress_percentage check constraint already exists';
  END IF;
END $$;

-- =====================================================
-- STEP 4: Create Unified Progress View
-- =====================================================
-- Materialized view for fast progress queries

DROP MATERIALIZED VIEW IF EXISTS user_progress_summary CASCADE;

CREATE MATERIALIZED VIEW user_progress_summary AS
SELECT
  e.id as enrollment_id,
  e.user_id,
  e.module_id,
  e.course_id,
  e.corporate_account_id,
  e.progress_percentage,
  e.xp_earned,
  e.completed,
  e.completed_at,
  e.status,
  e.purchase_type,
  e.purchased_at,
  -- Lesson-level stats
  COUNT(DISTINCT lr.lesson_id) FILTER (WHERE lr.completed = true) as lessons_completed,
  COUNT(DISTINCT lr.lesson_id) as total_lessons,
  -- Activity-level stats
  COUNT(DISTINCT ar.id) FILTER (WHERE ar.completed = true) as activities_completed,
  COUNT(DISTINCT ar.id) as total_activities,
  -- Time tracking
  COALESCE(SUM(ar.time_spent_minutes), 0) as total_time_minutes,
  COALESCE(e.total_time_spent, 0) as enrollment_time_minutes,
  -- Module info
  m.title as module_title,
  m.core_value as module_core_value,
  m.lesson_count as module_lesson_count,
  m.xp_reward as module_xp_reward
FROM course_enrollments e
LEFT JOIN lesson_responses lr ON lr.enrollment_id = e.id
LEFT JOIN activity_responses ar ON ar.enrollment_id = e.id
LEFT JOIN marketplace_modules m ON m.id = e.module_id
GROUP BY 
  e.id, e.user_id, e.module_id, e.course_id, e.corporate_account_id,
  e.progress_percentage, e.xp_earned, e.completed, e.completed_at,
  e.status, e.purchase_type, e.purchased_at, e.total_time_spent,
  m.title, m.core_value, m.lesson_count, m.xp_reward;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_progress_summary_user_id 
ON user_progress_summary(user_id);

CREATE INDEX IF NOT EXISTS idx_progress_summary_module_id 
ON user_progress_summary(module_id);

CREATE INDEX IF NOT EXISTS idx_progress_summary_corporate 
ON user_progress_summary(corporate_account_id) 
WHERE corporate_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_progress_summary_user_module 
ON user_progress_summary(user_id, module_id);

-- Add comment
COMMENT ON MATERIALIZED VIEW user_progress_summary IS 
  'Unified progress view combining enrollment, lesson, and activity data. Refresh with: REFRESH MATERIALIZED VIEW user_progress_summary;';

-- =====================================================
-- STEP 5: Create Function to Refresh Progress View
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_progress_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_progress_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refresh_progress_summary() IS 
  'Refresh the user_progress_summary materialized view. Run periodically or after bulk updates.';

-- =====================================================
-- STEP 6: Add Computed Column for Enrollment Type
-- =====================================================
-- Makes it easier to query enrollment type

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_enrollments' AND column_name = 'enrollment_type'
  ) THEN
    ALTER TABLE course_enrollments
    ADD COLUMN enrollment_type TEXT GENERATED ALWAYS AS (
      CASE
        WHEN course_id IS NOT NULL THEN 'course'
        WHEN module_id IS NOT NULL THEN 'module'
        ELSE 'invalid'
      END
    ) STORED;
    
    CREATE INDEX IF NOT EXISTS idx_enrollments_type 
    ON course_enrollments(enrollment_type);
    
    RAISE NOTICE '✅ Added enrollment_type computed column';
  ELSE
    RAISE NOTICE 'ℹ️  enrollment_type column already exists';
  END IF;
END $$;

COMMENT ON COLUMN course_enrollments.enrollment_type IS 
  'Computed: "course" for multi-module courses, "module" for individual modules';

-- =====================================================
-- STEP 7: Add Wallet Transaction Indexes
-- =====================================================
-- Improve wallet query performance

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_date 
ON wallet_transactions(wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type 
ON wallet_transactions(wallet_id, type);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status 
ON wallet_transactions(wallet_id, status) 
WHERE status = 'completed';

-- =====================================================
-- STEP 8: Summary and Verification
-- =====================================================

-- Log what was created
DO $$
DECLARE
  index_count INTEGER;
  constraint_count INTEGER;
BEGIN
  -- Count new indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND (
    indexname LIKE '%enrollments%' OR
    indexname LIKE '%lesson_responses%' OR
    indexname LIKE '%activity_responses%' OR
    indexname LIKE '%wallet_transactions%' OR
    indexname LIKE '%progress_summary%'
  );
  
  -- Count constraints
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE conname IN (
    'enrollment_type_check',
    'enrollments_progress_percentage_check'
  );
  
  RAISE NOTICE '✅ Phase 3 Migration Complete!';
  RAISE NOTICE '   Indexes created/verified: %', index_count;
  RAISE NOTICE '   Constraints added: %', constraint_count;
  RAISE NOTICE '   Materialized view: user_progress_summary';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Refresh materialized view: REFRESH MATERIALIZED VIEW user_progress_summary;';
  RAISE NOTICE '   2. Update APIs to use progress_percentage instead of completion_percentage';
  RAISE NOTICE '   3. Update APIs to use completed_at instead of completion_date';
  RAISE NOTICE '   4. Monitor query performance improvements';
END $$;

COMMIT;

-- =====================================================
-- POST-MIGRATION: Refresh Materialized View
-- =====================================================
-- Run this after migration completes

-- REFRESH MATERIALIZED VIEW user_progress_summary;

