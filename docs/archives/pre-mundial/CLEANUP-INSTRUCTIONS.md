# 🧹 Cleanup Instructions - Duplicate Functions

## ❌ **Problem Identified**

You have **duplicate functions** with the same parameters but different return types:
- `award_xp` - 4 versions (2 with `jsonb`, 2 with `void`)
- `check_achievements` - 4 versions (2 with `jsonb`, 2 with `void`)

This causes **ambiguity** - PostgreSQL doesn't know which function to call!

---

## ✅ **Solution**

Run the cleanup script to remove duplicates and keep only the correct versions:

**File**: `sql-migrations/cleanup-duplicate-functions-final.sql`

This will:
1. ✅ Drop all old/duplicate versions
2. ✅ Recreate only the correct functions (with `RETURNS JSONB`)
3. ✅ Keep all other functions intact

---

## 🚀 **Steps**

### **1. Run Cleanup**

In Supabase SQL Editor, run:
```
sql-migrations/cleanup-duplicate-functions-final.sql
```

### **2. Verify Cleanup**

After running, verify you now have only **ONE** of each:

```sql
SELECT 
  routine_name,
  data_type as return_type,
  pg_get_function_arguments(oid) as arguments
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE routine_schema = 'public' 
AND routine_name IN ('award_xp', 'check_achievements')
ORDER BY routine_name, arguments;
```

**Expected Result**: Should show only **2 functions**:
- `award_xp` with `RETURNS jsonb` (one version)
- `check_achievements` with `RETURNS jsonb` (one version)

### **3. Test Functions**

Test that functions work correctly:

```sql
-- Test award_xp (will fail if no user/xp_rewards, but should not error on signature)
SELECT public.calculate_tier(0); -- Should return 1

-- Test check_achievements signature
SELECT public.xp_for_next_tier(1); -- Should return 501
```

---

## ✅ **After Cleanup**

Once cleanup is complete:
- ✅ Only correct function signatures remain
- ✅ No ambiguity
- ✅ Functions work as expected
- ✅ Ready for Phase 2 integration!

---

**Run the cleanup script now!** 🚀

