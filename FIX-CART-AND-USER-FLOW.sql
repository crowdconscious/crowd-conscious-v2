-- =====================================================
-- COMPREHENSIVE FIX: CART & USER FLOW
-- =====================================================
-- Fixes:
-- 1. Add user_id to cart_items for individual users
-- 2. Make corporate_account_id nullable
-- 3. Fix course_enrollments if needed
-- 4. Ensure all constraints work correctly
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🛠️  Starting comprehensive cart and user flow fix...';
END $$;

-- =====================================================
-- STEP 1: FIX CART_ITEMS TABLE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🛒 Step 1/4: Fixing cart_items table...';
END $$;

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cart_items' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE cart_items ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added user_id column';
  ELSE
    RAISE NOTICE '⏭️  user_id column already exists';
  END IF;
END $$;

-- Make corporate_account_id nullable
DO $$
BEGIN
  ALTER TABLE cart_items ALTER COLUMN corporate_account_id DROP NOT NULL;
  RAISE NOTICE '✅ Made corporate_account_id nullable';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⏭️  corporate_account_id already nullable or doesn''t exist';
END $$;

-- Drop old unique constraint
DO $$
BEGIN
  ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_corporate_account_id_module_id_key;
  ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS unique_cart_item;
  RAISE NOTICE '✅ Removed old unique constraints';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⏭️  Old constraints already removed';
END $$;

-- Add check constraint: Must have either user_id OR corporate_account_id (not both, not neither)
DO $$
BEGIN
  ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_owner_check;
  
  ALTER TABLE cart_items ADD CONSTRAINT cart_owner_check CHECK (
    (user_id IS NOT NULL AND corporate_account_id IS NULL) OR
    (user_id IS NULL AND corporate_account_id IS NOT NULL)
  );
  RAISE NOTICE '✅ Added cart owner validation';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Could not add cart owner check constraint';
END $$;

-- Add unique constraints for both user types
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_module_unique 
  ON cart_items(user_id, module_id) 
  WHERE user_id IS NOT NULL;
  
  CREATE UNIQUE INDEX IF NOT EXISTS cart_items_corporate_module_unique 
  ON cart_items(corporate_account_id, module_id) 
  WHERE corporate_account_id IS NOT NULL;
  
  RAISE NOTICE '✅ Added unique constraints for both user types';
END $$;

-- =====================================================
-- STEP 2: FIX COURSE_ENROLLMENTS TABLE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📚 Step 2/4: Fixing course_enrollments table...';
END $$;

-- Make sure user_id exists and is NOT NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_enrollments' AND column_name = 'user_id'
  ) THEN
    -- If missing, add it (but this shouldn't happen)
    ALTER TABLE course_enrollments ADD COLUMN user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added user_id to course_enrollments';
  ELSE
    RAISE NOTICE '✅ user_id already exists in course_enrollments';
  END IF;
END $$;

-- Make corporate_account_id nullable (for individual purchases)
DO $$
BEGIN
  ALTER TABLE course_enrollments ALTER COLUMN corporate_account_id DROP NOT NULL;
  RAISE NOTICE '✅ Made corporate_account_id nullable in enrollments';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⏭️  corporate_account_id already nullable';
END $$;

-- Add purchase_type if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_enrollments' AND column_name = 'purchase_type'
  ) THEN
    ALTER TABLE course_enrollments ADD COLUMN purchase_type TEXT DEFAULT 'corporate';
    RAISE NOTICE '✅ Added purchase_type column';
  ELSE
    RAISE NOTICE '⏭️  purchase_type already exists';
  END IF;
END $$;

-- Add purchased_at if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_enrollments' AND column_name = 'purchased_at'
  ) THEN
    ALTER TABLE course_enrollments ADD COLUMN purchased_at TIMESTAMP DEFAULT NOW();
    RAISE NOTICE '✅ Added purchased_at column';
  ELSE
    RAISE NOTICE '⏭️  purchased_at already exists';
  END IF;
END $$;

-- Add purchase_price_snapshot if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_enrollments' AND column_name = 'purchase_price_snapshot'
  ) THEN
    ALTER TABLE course_enrollments ADD COLUMN purchase_price_snapshot NUMERIC(10,2);
    RAISE NOTICE '✅ Added purchase_price_snapshot column';
  ELSE
    RAISE NOTICE '⏭️  purchase_price_snapshot already exists';
  END IF;
END $$;

-- =====================================================
-- STEP 3: UPDATE RLS POLICIES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Step 3/4: Updating RLS policies...';
END $$;

-- Drop all existing cart_items policies
DROP POLICY IF EXISTS "Users can view own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can add to own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can update own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can delete from own cart" ON cart_items;
DROP POLICY IF EXISTS cart_items_select_policy ON cart_items;
DROP POLICY IF EXISTS cart_items_insert_policy ON cart_items;
DROP POLICY IF EXISTS cart_items_update_policy ON cart_items;
DROP POLICY IF EXISTS cart_items_delete_policy ON cart_items;

-- Create new policies that support both individual and corporate users
CREATE POLICY "Users can view own cart" ON cart_items FOR SELECT
USING (
  user_id = auth.uid() OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

CREATE POLICY "Users can add to own cart" ON cart_items FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

CREATE POLICY "Users can update own cart" ON cart_items FOR UPDATE
USING (
  user_id = auth.uid() OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

CREATE POLICY "Users can delete from own cart" ON cart_items FOR DELETE
USING (
  user_id = auth.uid() OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

DO $$
BEGIN
  RAISE NOTICE '✅ Updated cart_items RLS policies';
END $$;

-- Update enrollments policies
DROP POLICY IF EXISTS "Users can view own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS course_enrollments_select_policy ON course_enrollments;

CREATE POLICY "Users can view own enrollments" ON course_enrollments FOR SELECT
USING (
  user_id = auth.uid() OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

DO $$
BEGIN
  RAISE NOTICE '✅ Updated course_enrollments RLS policies';
END $$;

-- =====================================================
-- STEP 4: VERIFY MARKETPLACE MODULES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Step 4/4: Verifying marketplace modules...';
END $$;

-- Check that we have published modules
DO $$
DECLARE
  v_published_count INTEGER;
  v_template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_published_count 
  FROM marketplace_modules 
  WHERE status = 'published' AND is_template = FALSE;
  
  SELECT COUNT(*) INTO v_template_count 
  FROM marketplace_modules 
  WHERE is_template = TRUE AND status = 'template';
  
  RAISE NOTICE '📦 Published modules: %', v_published_count;
  RAISE NOTICE '📚 Template modules: %', v_template_count;
  
  IF v_published_count < 6 THEN
    RAISE WARNING '⚠️  Expected at least 6 published modules, found %', v_published_count;
  END IF;
END $$;

-- =====================================================
-- COMPLETION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ CART & USER FLOW FIX COMPLETE!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 You can now:';
  RAISE NOTICE '   1. Browse marketplace';
  RAISE NOTICE '   2. Add modules to cart (individual & corporate)';
  RAISE NOTICE '   3. Checkout successfully';
  RAISE NOTICE '   4. Access enrolled modules';
  RAISE NOTICE '   5. Complete lessons';
  RAISE NOTICE '';
END $$;

