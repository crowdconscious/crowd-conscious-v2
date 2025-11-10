-- =====================================================
-- MANUAL FIX ENROLLMENT
-- =====================================================
-- Purpose: Manually create enrollment if webhook failed
-- Date: November 10, 2025
-- User: punkys@crowdconscious.app
-- =====================================================

-- ⚠️ IMPORTANT: Only run this AFTER confirming:
-- 1. Payment was successful in Stripe Dashboard
-- 2. User doesn't already have enrollment (check with CHECK-USER-ENROLLMENTS.sql)
-- 3. Module ID is correct

-- =====================================================
-- STEP 1: Get user ID and module ID
-- =====================================================

-- Find user ID
SELECT 
  id as user_id,
  email
FROM auth.users
WHERE email = 'punkys@crowdconscious.app';

-- Find available modules
SELECT 
  id as module_id,
  title,
  core_value,
  status
FROM marketplace_modules
WHERE status = 'published'
ORDER BY created_at DESC;

-- =====================================================
-- STEP 2: Create enrollment manually
-- =====================================================

-- Replace these values with actual IDs from Step 1:
-- USER_ID_HERE = the UUID from first query
-- MODULE_ID_HERE = the UUID of the module they purchased

INSERT INTO course_enrollments (
  user_id,
  corporate_account_id,
  course_id,
  module_id,
  purchase_type,
  purchased_at,
  purchase_price_snapshot,
  status,
  progress_percentage,
  completion_percentage,
  completed,
  xp_earned,
  started_at,
  last_accessed_at,
  created_at,
  updated_at
)
VALUES (
  'USER_ID_HERE'::UUID,  -- Replace with actual user ID
  NULL,  -- NULL for individual purchase
  NULL,  -- NULL for individual modules
  'MODULE_ID_HERE'::UUID,  -- Replace with actual module ID
  'individual',
  NOW(),
  360,  -- Adjust if different price
  'not_started',
  0,
  0,
  FALSE,
  0,
  NOW(),
  NOW(),
  NOW(),
  NOW()
)
RETURNING *;

-- =====================================================
-- EXAMPLE (DO NOT RUN AS-IS):
-- =====================================================

-- Example with actual IDs (REPLACE WITH REAL IDs):
/*
INSERT INTO course_enrollments (
  user_id,
  corporate_account_id,
  course_id,
  module_id,
  purchase_type,
  purchased_at,
  purchase_price_snapshot,
  status,
  progress_percentage,
  completion_percentage,
  completed,
  xp_earned,
  started_at,
  last_accessed_at,
  created_at,
  updated_at
)
VALUES (
  '98fb646e-6f7e-4afc-92ec-80f1b5d3c2a1'::UUID,  -- Example user ID
  NULL,
  NULL,
  '63c08c28-638d-42d9-ba5d-ecfc541957b0'::UUID,  -- Example module ID
  'individual',
  NOW(),
  360,
  'not_started',
  0,
  0,
  FALSE,
  0,
  NOW(),
  NOW(),
  NOW(),
  NOW()
)
RETURNING *;
*/

-- =====================================================
-- STEP 3: Verify enrollment was created
-- =====================================================

SELECT 
  ce.id,
  ce.user_id,
  ce.module_id,
  ce.status,
  ce.progress_percentage,
  ce.purchased_at,
  mm.title as module_title,
  u.email as user_email
FROM course_enrollments ce
JOIN auth.users u ON u.id = ce.user_id
JOIN marketplace_modules mm ON mm.id = ce.module_id
WHERE u.email = 'punkys@crowdconscious.app'
ORDER BY ce.created_at DESC;

-- =====================================================
-- STEP 4: Clear cart if needed
-- =====================================================

DELETE FROM cart_items
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'punkys@crowdconscious.app'
);

-- =====================================================
-- NOTES
-- =====================================================

-- After running this:
-- 1. User should see module in dashboard immediately
-- 2. Hard refresh browser (Ctrl+Shift+R)
-- 3. Check dashboard shows the module
-- 4. If still not showing, check RLS policies with FIX-ALL-CRITICAL-ISSUES.sql

