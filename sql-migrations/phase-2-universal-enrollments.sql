-- ============================================================================
-- PHASE 2: UNIVERSAL ENROLLMENTS MIGRATION
-- ============================================================================
-- Purpose: Enable module enrollments for ALL users (individuals + corporates)
-- Status: Ready to run AFTER Phase 1
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add purchase_type to course_enrollments
-- ============================================================================
-- Track how the module was purchased

ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS purchase_type TEXT DEFAULT 'corporate' 
CHECK (purchase_type IN ('individual', 'corporate', 'team', 'enterprise', 'gift'));

COMMENT ON COLUMN course_enrollments.purchase_type IS 
'How the module was purchased: individual (self), corporate (company), team (small group), enterprise (custom), gift (platform gift)';

-- ============================================================================
-- STEP 2: Make corporate_account_id optional
-- ============================================================================
-- Allow individual enrollments without corporate account

ALTER TABLE course_enrollments
ALTER COLUMN corporate_account_id DROP NOT NULL;

COMMENT ON COLUMN course_enrollments.corporate_account_id IS
'Corporate account (NULL for individual purchases)';

-- ============================================================================
-- STEP 3: Rename employee_id to user_id for clarity
-- ============================================================================
-- More accurate naming for universal access

-- Check if column exists before renaming
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_enrollments' AND column_name = 'employee_id'
  ) THEN
    -- Drop existing indexes that reference employee_id
    DROP INDEX IF EXISTS idx_enrollments_employee;
    
    -- Rename the column
    ALTER TABLE course_enrollments
    RENAME COLUMN employee_id TO user_id;
    
    -- Recreate index with new column name
    CREATE INDEX IF NOT EXISTS idx_enrollments_user ON course_enrollments(user_id);
    
    RAISE NOTICE 'Renamed employee_id to user_id and updated indexes';
  ELSE
    RAISE NOTICE 'Column employee_id does not exist or already renamed';
  END IF;
END $$;

COMMENT ON COLUMN course_enrollments.user_id IS
'User enrolled in the module (individual learner or corporate employee)';

-- ============================================================================
-- STEP 4: Add purchased_at timestamp
-- ============================================================================
-- Track when the purchase was made (different from enrollment_date)

ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ;

COMMENT ON COLUMN course_enrollments.purchased_at IS
'When the module was purchased (NULL for legacy enrollments)';

-- ============================================================================
-- STEP 5: Add purchase_price_snapshot
-- ============================================================================
-- Track the price paid at time of purchase

ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS purchase_price_snapshot INTEGER;

COMMENT ON COLUMN course_enrollments.purchase_price_snapshot IS
'Price paid for this enrollment at time of purchase (in MXN cents)';

-- ============================================================================
-- STEP 6: Update RLS policies for universal access
-- ============================================================================

-- Drop old corporate-only policies
DROP POLICY IF EXISTS "Corporate admins can view enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Employees can view own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Corporate admins can enroll employees" ON course_enrollments;

-- NEW: Universal SELECT policy
CREATE POLICY "Users can view own enrollments"
ON course_enrollments FOR SELECT
USING (
  -- Individual users can see their own enrollments
  user_id = auth.uid() 
  OR
  -- Corporate admins can see all employee enrollments
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
  OR
  -- Corporate employees can see their own enrollments
  (
    user_id = auth.uid() AND
    corporate_account_id IN (
      SELECT corporate_account_id FROM profiles WHERE id = auth.uid()
    )
  )
);

COMMENT ON POLICY "Users can view own enrollments" ON course_enrollments IS
'Allows users to view their own enrollments, and corporate admins to view all employee enrollments';

-- NEW: Universal INSERT policy
CREATE POLICY "Users can create enrollments"
ON course_enrollments FOR INSERT
WITH CHECK (
  -- Individual users can enroll themselves
  (user_id = auth.uid() AND corporate_account_id IS NULL)
  OR
  -- Corporate admins can enroll employees
  (
    corporate_account_id IN (
      SELECT corporate_account_id FROM profiles
      WHERE id = auth.uid() AND corporate_role = 'admin'
    )
  )
);

COMMENT ON POLICY "Users can create enrollments" ON course_enrollments IS
'Allows individual users to enroll themselves, and corporate admins to enroll employees';

-- NEW: Universal UPDATE policy
CREATE POLICY "Users can update own enrollments"
ON course_enrollments FOR UPDATE
USING (
  -- Users can update their own progress
  user_id = auth.uid()
  OR
  -- Corporate admins can update employee enrollments
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

COMMENT ON POLICY "Users can update own enrollments" ON course_enrollments IS
'Allows users to update their own progress, and corporate admins to manage employee enrollments';

-- ============================================================================
-- STEP 7: Create helper function to get enrollment type
-- ============================================================================

CREATE OR REPLACE FUNCTION get_enrollment_type(enrollment_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT purchase_type
    FROM course_enrollments
    WHERE id = enrollment_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_enrollment_type IS
'Returns the purchase type for a given enrollment';

-- ============================================================================
-- STEP 8: Update existing enrollments with purchase_type
-- ============================================================================
-- Set all existing enrollments to 'corporate' (backwards compatibility)

UPDATE course_enrollments
SET purchase_type = 'corporate'
WHERE purchase_type IS NULL OR purchase_type = 'corporate';

-- ============================================================================
-- STEP 9: Create view for user dashboard (DYNAMIC)
-- ============================================================================
-- Unified view for all user types to see their modules
-- This dynamically checks which column name exists (employee_id vs user_id)

DO $$
DECLARE
  user_col_name TEXT;
BEGIN
  -- Check which column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_enrollments' AND column_name = 'user_id'
  ) THEN
    user_col_name := 'user_id';
  ELSE
    user_col_name := 'employee_id';
  END IF;

  -- Create view with correct column name
  EXECUTE format('
    CREATE OR REPLACE VIEW user_enrolled_modules AS
    SELECT 
      e.id AS enrollment_id,
      e.%I AS user_id,
      e.module_id,
      e.corporate_account_id,
      COALESCE(e.purchase_type, ''corporate'') AS purchase_type,
      e.created_at AS enrollment_date,
      e.purchased_at,
      COALESCE(e.completion_percentage, 0) AS progress,
      CASE WHEN e.status = ''completed'' THEN true ELSE false END AS completed,
      e.completed_at AS completion_date,
      NULL::TEXT AS certificate_url,
      COALESCE(e.module_name, ''Unknown Module'') AS module_title,
      NULL::TEXT AS module_description,
      NULL::TEXT AS thumbnail_url,
      NULL::INTEGER AS estimated_duration_hours,
      NULL::TEXT AS difficulty_level,
      NULL::TEXT AS core_value,
      CASE 
        WHEN e.corporate_account_id IS NOT NULL THEN ''corporate''
        ELSE ''individual''
      END AS access_type,
      COALESCE(e.status, ''not_started'') AS status,
      COALESCE(e.time_spent_minutes, 0) AS time_spent_minutes
    FROM course_enrollments e
  ', user_col_name);

  RAISE NOTICE 'Created user_enrolled_modules view using column: %', user_col_name;
END $$;

COMMENT ON VIEW user_enrolled_modules IS
'Unified view of all user enrollments (individual + corporate). Dynamically handles employee_id/user_id column.';

-- Grant access to authenticated users
GRANT SELECT ON user_enrolled_modules TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

DO $$
DECLARE
  enrollment_count INTEGER;
BEGIN
  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'Course enrollments table updated successfully';
  RAISE NOTICE 'New columns: purchase_type, purchased_at, purchase_price_snapshot';
  RAISE NOTICE 'Updated columns: corporate_account_id (now nullable), employee_id → user_id';
  RAISE NOTICE 'RLS Policies: 3 universal policies created';
  RAISE NOTICE 'Views: user_enrolled_modules created';
  
  -- Count existing enrollments
  SELECT COUNT(*) INTO enrollment_count FROM course_enrollments;
  RAISE NOTICE 'Existing enrollments: %', enrollment_count;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION TESTS (Optional - run separately)
-- ============================================================================

/*
-- Test 1: Verify individual enrollment works
INSERT INTO course_enrollments (user_id, module_id, purchase_type, enrollment_date, purchased_at)
VALUES (auth.uid(), 'test-module-id', 'individual', NOW(), NOW());
-- Expected: SUCCESS

-- Test 2: Verify corporate enrollment still works
INSERT INTO course_enrollments (user_id, corporate_account_id, module_id, purchase_type, enrollment_date)
VALUES ('employee-id', 'corporate-id', 'test-module-id', 'corporate', NOW());
-- Expected: SUCCESS

-- Test 3: View user's enrolled modules
SELECT * FROM user_enrolled_modules WHERE user_id = auth.uid();
-- Expected: Shows all modules user has access to

-- Test 4: Corporate admin views all employee enrollments
SELECT * FROM user_enrolled_modules 
WHERE corporate_account_id = 'your-corporate-id';
-- Expected: Shows all employee enrollments
*/

