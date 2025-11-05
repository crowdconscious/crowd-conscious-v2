# 🚀 Phase 1: Universal Marketplace Migration Guide

**Status**: Ready to Execute  
**Goal**: Transform marketplace from corporate-only to universal access (individuals + corporates)

---

## 📋 **PRE-MIGRATION CHECKLIST**

### **1. Backup Database** ⚠️
```sql
-- In Supabase Dashboard → Database → Backups
-- Or run this to export current state:
pg_dump your_database > backup_before_phase1_$(date +%Y%m%d).sql
```

### **2. Verify Current State**
```sql
-- Check cart_items structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cart_items';

-- Check course_enrollments structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'course_enrollments';

-- Count existing data
SELECT 
  (SELECT COUNT(*) FROM cart_items) as cart_items_count,
  (SELECT COUNT(*) FROM course_enrollments) as enrollments_count,
  (SELECT COUNT(*) FROM marketplace_modules) as modules_count;
```

### **3. Test in Staging First** (Recommended)
- Create a staging Supabase project
- Run migrations there first
- Test cart flow end-to-end
- Then run in production

---

## 🗂️ **MIGRATION FILES**

### **Phase 1: Universal Cart** (Run First)
**File**: `sql-migrations/phase-1-universal-cart.sql`

**What it does**:
- ✅ Adds `user_id` column to `cart_items`
- ✅ Makes `corporate_account_id` optional
- ✅ Adds constraint: cart must have EITHER user OR corporate owner
- ✅ Updates unique constraints (prevent duplicates per owner)
- ✅ Updates RLS policies (support both user types)
- ✅ Creates helper function `get_cart_owner_type()`

**Impact**:
- ✅ Backwards compatible (existing corporate carts work as-is)
- ✅ Enables individual users to add items to cart
- ✅ No data loss

---

### **Phase 2: Universal Enrollments** (Run Second)
**File**: `sql-migrations/phase-2-universal-enrollments.sql`

**What it does**:
- ✅ Adds `purchase_type` column (individual/corporate/team/enterprise/gift)
- ✅ Makes `corporate_account_id` optional
- ✅ Renames `employee_id` → `user_id` (clearer naming)
- ✅ Adds `purchased_at` and `purchase_price_snapshot` columns
- ✅ Updates RLS policies (support all user types)
- ✅ Creates `user_enrolled_modules` view (unified dashboard)
- ✅ Updates existing enrollments to `purchase_type = 'corporate'`

**Impact**:
- ✅ Backwards compatible (existing enrollments work as-is)
- ✅ Enables individual purchases
- ✅ Better tracking of purchase history
- ✅ No data loss

---

### **Phase 3: Community Pricing** (Run Third)
**File**: `sql-migrations/phase-3-community-pricing.sql`

**What it does**:
- ✅ Adds `price_set_by_community` flag
- ✅ Adds `platform_suggested_price` (guidance)
- ✅ Adds `individual_price_mxn` (1-person pricing)
- ✅ Adds `team_price_mxn` and `team_discount_percent`
- ✅ Creates `calculate_module_price()` function (dynamic pricing)
- ✅ Creates `get_pricing_preview()` function (for module builder)
- ✅ Creates `marketplace_modules_with_pricing` view
- ✅ Adds pricing validation trigger
- ✅ Sets platform modules to fixed pricing

**Impact**:
- ✅ Backwards compatible (existing prices work as-is)
- ✅ Enables community-set pricing
- ✅ Auto-calculates individual prices
- ✅ No data loss

---

## 🚀 **EXECUTION STEPS**

### **Step 1: Run Phase 1 (Universal Cart)**

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `sql-migrations/phase-1-universal-cart.sql`
3. Paste and click **Run**
4. Wait for success message
5. Verify:

```sql
-- Should see: user_id column exists, corporate_account_id is nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cart_items' 
AND column_name IN ('user_id', 'corporate_account_id');

-- Should return: user_id (YES), corporate_account_id (YES)
```

---

### **Step 2: Run Phase 2 (Universal Enrollments)**

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `sql-migrations/phase-2-universal-enrollments.sql`
3. Paste and click **Run**
4. Wait for success message
5. Verify:

```sql
-- Should see: user_id (renamed from employee_id), purchase_type, purchased_at
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'course_enrollments' 
AND column_name IN ('user_id', 'purchase_type', 'purchased_at');

-- Check view exists
SELECT * FROM user_enrolled_modules LIMIT 1;
```

---

### **Step 3: Run Phase 3 (Community Pricing)**

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `sql-migrations/phase-3-community-pricing.sql`
3. Paste and click **Run**
4. Wait for success message
5. Verify:

```sql
-- Should see: new pricing columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'marketplace_modules' 
AND column_name IN ('price_set_by_community', 'individual_price_mxn', 'team_price_mxn');

-- Test pricing function
SELECT calculate_module_price(
  (SELECT id FROM marketplace_modules LIMIT 1),
  1,
  'individual'
);
-- Should return individual price (e.g., 360)

-- Test pricing preview
SELECT * FROM get_pricing_preview(18000, 8000, 360, 10);
-- Should return pricing table
```

---

## ✅ **POST-MIGRATION VERIFICATION**

### **1. Database Structure**
```sql
-- Verify all new columns exist
SELECT 
  'cart_items' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'cart_items' 
AND column_name IN ('user_id', 'corporate_account_id')

UNION ALL

SELECT 
  'course_enrollments',
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'course_enrollments' 
AND column_name IN ('user_id', 'purchase_type', 'purchased_at')

UNION ALL

SELECT 
  'marketplace_modules',
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'marketplace_modules' 
AND column_name IN ('price_set_by_community', 'individual_price_mxn');
```

### **2. RLS Policies**
```sql
-- Verify new policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('cart_items', 'course_enrollments')
ORDER BY tablename, policyname;

-- Should see policies like:
-- cart_items: "Users can view own cart"
-- cart_items: "Users can add to own cart"
-- course_enrollments: "Users can view own enrollments"
```

### **3. Functions & Views**
```sql
-- Verify functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN (
  'get_cart_owner_type',
  'get_enrollment_type',
  'calculate_module_price',
  'get_pricing_preview',
  'validate_module_pricing'
);

-- Verify views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_name IN (
  'user_enrolled_modules',
  'marketplace_modules_with_pricing'
);
```

### **4. Data Integrity**
```sql
-- Verify no data was lost
SELECT 
  (SELECT COUNT(*) FROM cart_items) as cart_items_count,
  (SELECT COUNT(*) FROM course_enrollments) as enrollments_count,
  (SELECT COUNT(*) FROM marketplace_modules) as modules_count;

-- Should match pre-migration counts

-- Verify existing corporate carts still work
SELECT * FROM cart_items 
WHERE corporate_account_id IS NOT NULL 
LIMIT 5;

-- Verify existing enrollments have purchase_type
SELECT DISTINCT purchase_type, COUNT(*) 
FROM course_enrollments 
GROUP BY purchase_type;
-- Should see: corporate (with count)
```

---

## 🧪 **TESTING CHECKLIST**

### **Test 1: Corporate Cart Still Works** ✅
```sql
-- As corporate admin, try to view cart
SELECT * FROM cart_items 
WHERE corporate_account_id = 'YOUR_CORPORATE_ID';
-- Expected: SUCCESS (existing cart items visible)
```

### **Test 2: Individual Can Create Cart** ✅
```sql
-- As individual user, try to add to cart
INSERT INTO cart_items (user_id, module_id, employee_count, price_snapshot)
VALUES (auth.uid(), 'test-module-id', 1, 360);
-- Expected: SUCCESS
```

### **Test 3: Constraint Validation** ✅
```sql
-- Try to create cart with NO owner (should fail)
INSERT INTO cart_items (module_id, employee_count, price_snapshot)
VALUES ('test-module-id', 1, 360);
-- Expected: ERROR - violates check constraint "cart_owner_check"

-- Try to create cart with BOTH owners (should fail)
INSERT INTO cart_items (user_id, corporate_account_id, module_id, employee_count, price_snapshot)
VALUES ('user-id', 'corporate-id', 'test-module-id', 1, 360);
-- Expected: ERROR - violates check constraint "cart_owner_check"
```

### **Test 4: Pricing Calculation** ✅
```sql
-- Test individual pricing
SELECT calculate_module_price(
  (SELECT id FROM marketplace_modules WHERE is_platform_module = true LIMIT 1),
  1,
  'individual'
);
-- Expected: 360 (for platform module)

-- Test corporate pricing
SELECT calculate_module_price(
  (SELECT id FROM marketplace_modules WHERE is_platform_module = true LIMIT 1),
  75,
  'corporate'
);
-- Expected: 26000 (18000 + 8000 for 2 packs)
```

---

## 🔄 **ROLLBACK PLAN** (If Needed)

### **If Something Goes Wrong**:

```sql
-- ROLLBACK Phase 3 (Community Pricing)
BEGIN;
DROP VIEW IF EXISTS marketplace_modules_with_pricing CASCADE;
DROP FUNCTION IF EXISTS validate_module_pricing CASCADE;
DROP FUNCTION IF EXISTS get_pricing_preview CASCADE;
DROP FUNCTION IF EXISTS calculate_module_price CASCADE;
ALTER TABLE marketplace_modules DROP COLUMN IF EXISTS team_discount_percent;
ALTER TABLE marketplace_modules DROP COLUMN IF EXISTS team_price_mxn;
ALTER TABLE marketplace_modules DROP COLUMN IF EXISTS individual_price_mxn;
ALTER TABLE marketplace_modules DROP COLUMN IF EXISTS pricing_notes;
ALTER TABLE marketplace_modules DROP COLUMN IF EXISTS platform_suggested_price;
ALTER TABLE marketplace_modules DROP COLUMN IF EXISTS price_set_by_community;
COMMIT;

-- ROLLBACK Phase 2 (Universal Enrollments)
BEGIN;
DROP VIEW IF EXISTS user_enrolled_modules CASCADE;
DROP FUNCTION IF EXISTS get_enrollment_type CASCADE;
ALTER TABLE course_enrollments DROP COLUMN IF EXISTS purchase_price_snapshot;
ALTER TABLE course_enrollments DROP COLUMN IF EXISTS purchased_at;
ALTER TABLE course_enrollments RENAME COLUMN user_id TO employee_id;
ALTER TABLE course_enrollments DROP COLUMN IF EXISTS purchase_type;
ALTER TABLE course_enrollments ALTER COLUMN corporate_account_id SET NOT NULL;
COMMIT;

-- ROLLBACK Phase 1 (Universal Cart)
BEGIN;
DROP FUNCTION IF EXISTS get_cart_owner_type CASCADE;
DROP INDEX IF EXISTS cart_items_corporate_module_unique;
DROP INDEX IF EXISTS cart_items_user_module_unique;
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_owner_check;
ALTER TABLE cart_items ALTER COLUMN corporate_account_id SET NOT NULL;
ALTER TABLE cart_items DROP COLUMN IF EXISTS user_id;
COMMIT;
```

**Then restore from backup**:
```bash
psql your_database < backup_before_phase1_YYYYMMDD.sql
```

---

## 📊 **EXPECTED RESULTS**

### **Before Migration**:
- ❌ Only corporate admins can use cart
- ❌ Only corporate employees can be enrolled
- ❌ All modules have same pricing structure
- ❌ No individual purchases possible

### **After Migration**:
- ✅ **Anyone** can use cart (individuals + corporates)
- ✅ **Anyone** can be enrolled (individuals + employees)
- ✅ **Communities** can set their own prices
- ✅ **Dynamic pricing** based on user count
- ✅ **Platform modules** maintain 100% revenue
- ✅ **Backwards compatible** (existing data works as-is)

---

## 🚨 **TROUBLESHOOTING**

### **Issue: Migration fails with "column already exists"**
**Solution**: Column was added in a previous run. Safe to ignore or use `IF NOT EXISTS`.

### **Issue: RLS policy error**
**Solution**: Drop old policies first:
```sql
DROP POLICY IF EXISTS "old_policy_name" ON table_name;
```

### **Issue: Function already exists**
**Solution**: Use `CREATE OR REPLACE FUNCTION` (already in migration files).

### **Issue: Data seems missing**
**Solution**: Check RLS policies are correctly applied:
```sql
-- Temporarily disable RLS to check data
ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;
SELECT * FROM cart_items;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
```

---

## ✅ **SUCCESS CRITERIA**

**Migration is successful when**:
- [x] All 3 SQL files run without errors
- [x] All verification queries return expected results
- [x] Existing corporate carts still work
- [x] New individual carts can be created
- [x] Pricing functions return correct values
- [x] No data was lost (counts match)
- [x] RLS policies allow appropriate access

---

## 📝 **NEXT STEPS AFTER MIGRATION**

1. **Update API Routes** (Week 2-3):
   - Modify `/api/cart/*` to support both user types
   - Update checkout flow for individuals
   - Add pricing calculation logic

2. **Update UI** (Week 3-4):
   - Module detail page (show dynamic pricing)
   - Cart page (support both types)
   - Unified dashboard

3. **Test End-to-End** (Week 4):
   - Individual purchase flow
   - Corporate purchase flow
   - Pricing accuracy
   - Revenue distribution

4. **Launch** (Week 5):
   - Soft launch to beta users
   - Monitor for issues
   - Iterate based on feedback

---

**Ready to begin! 🚀**

Run Phase 1 first, verify, then proceed to Phase 2 and 3.

