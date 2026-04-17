

# 🚨 URGENT FIX GUIDE - Critical Issues Resolution

**Date**: November 10, 2025  
**Issues**: Review system failing, Courses not showing after re-login  
**Affected User**: punkys@crowdconscious.app (and potentially others)

---

## 🎯 **Quick Summary**

**2 Critical Issues Identified**:

1. ❌ **Review System**: Cannot create reviews (table/RLS issue)
2. ❌ **Dashboard**: Courses not appearing after re-login (RLS or enrollment issue)

**3 SQL Files Created**:

1. ✅ `CHECK-USER-ENROLLMENTS.sql` - Diagnostic queries
2. ✅ `FIX-ALL-CRITICAL-ISSUES.sql` - Fix review system + RLS
3. ✅ `MANUAL-FIX-ENROLLMENT.sql` - Manual enrollment creation

---

## 🔍 **STEP 1: Diagnose User Issue** (2 minutes)

### **Run Diagnostic SQL**

**File**: `CHECK-USER-ENROLLMENTS.sql`

**Copy and run in Supabase SQL Editor**

**What to look for**:

```sql
-- Step 1: User exists? ✅
-- Step 2: Profile exists? ✅
-- Step 3: Enrollments? ❓ This is the critical one
-- Step 4: Cart items? (should be empty after purchase)
```

### **Possible Outcomes**:

#### **Scenario A: Enrollments exist but dashboard doesn't show them**
```
✅ User found
✅ Profile found
✅ Enrollments: 1-2 rows with module_id
❌ Dashboard: Still showing 0 courses
```

**Problem**: RLS policy or JOIN failing  
**Solution**: Run `FIX-ALL-CRITICAL-ISSUES.sql` (Step 2)

---

#### **Scenario B: No enrollments found**
```
✅ User found
✅ Profile found
❌ Enrollments: 0 rows
✅ Cart items: May have items (webhook failed)
```

**Problem**: Stripe webhook didn't create enrollment  
**Solution**: Manual enrollment (Step 3)

---

#### **Scenario C: Enrollments with NULL module_id**
```
✅ User found
✅ Enrollments: 1 row but module_id is NULL
```

**Problem**: Webhook set course_id instead of module_id  
**Solution**: Update enrollment (Step 3)

---

## 🔧 **STEP 2: Fix System-Wide Issues** (2 minutes)

### **Run Critical Fixes SQL**

**File**: `FIX-ALL-CRITICAL-ISSUES.sql`

**What it does**:

1. ✅ **Creates module_reviews table** (if missing)
2. ✅ **Creates all RLS policies** (review system)
3. ✅ **Fixes marketplace_modules RLS** (dashboard can read)
4. ✅ **Fixes course_enrollments RLS** (users can see their enrollments)
5. ✅ **Ensures profiles has full_name, avatar_url**
6. ✅ **Grants correct permissions**

**Copy entire file and run in Supabase SQL Editor**

### **Expected Output**:

```
✅ ========================================
✅ CRITICAL FIXES APPLIED SUCCESSFULLY!
✅ ========================================

✅ module_reviews table created
✅ RLS policies configured
✅ Dashboard permissions fixed

🔄 NEXT STEPS:
1. Run CHECK-USER-ENROLLMENTS.sql to verify user data
2. Hard refresh browser (Ctrl+Shift+R)
3. Test review creation
4. Check dashboard loads courses
```

---

## 🩹 **STEP 3: Manual Enrollment Fix** (Only if needed)

**If Step 1 showed NO enrollments for user**:

### **File**: `MANUAL-FIX-ENROLLMENT.sql`

### **Before Running**:

1. ✅ Confirm payment successful in Stripe Dashboard
2. ✅ Get user_id from Step 1 output
3. ✅ Get module_id from Step 1 output
4. ✅ Confirm enrollment doesn't already exist

### **How to Use**:

```sql
-- 1. Run Step 1 to get user_id
SELECT id FROM auth.users WHERE email = 'punkys@crowdconscious.app';
-- Output: '98fb646e-6f7e-4afc-92ec-80f1b5d3c2a1'

-- 2. Run Step 1 to get module_id
SELECT id, title FROM marketplace_modules WHERE status = 'published';
-- Output: '63c08c28-638d-42d9-ba5d-ecfc541957b0', 'Estrategias Avanzadas...'

-- 3. Modify INSERT query in MANUAL-FIX-ENROLLMENT.sql:
-- Replace USER_ID_HERE with actual UUID
-- Replace MODULE_ID_HERE with actual UUID

-- 4. Run the INSERT
-- 5. Run Step 3 verify query to confirm
```

---

## 🧪 **STEP 4: Test Everything** (5 minutes)

### **Test Review System**:

1. Visit module page: `/marketplace/[module-id]`
2. Scroll to reviews section
3. Click "Escribe una Reseña" button
4. Fill form (5 stars, title, comment)
5. Click "Crear Reseña"
6. Should see: ✅ "Reseña creada exitosamente"

**If still fails**:
- Check browser console for errors
- Check Supabase logs
- Verify you ran `FIX-ALL-CRITICAL-ISSUES.sql`

---

### **Test Dashboard**:

1. Visit `/employee-portal/dashboard`
2. Should see enrolled modules
3. Stats should show correct numbers
4. Click "Ir al Módulo" should work

**If courses still don't show**:
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Check browser console (F12)
- Look for RLS errors or 401/403 responses
- Re-run `FIX-ALL-CRITICAL-ISSUES.sql`

---

## 🐛 **Common Issues & Solutions**

### **Issue: "Must be enrolled to review"**

**Cause**: User not enrolled OR enrollment check failing

**Fix**:
```sql
-- Verify enrollment exists:
SELECT * FROM course_enrollments 
WHERE user_id = 'USER_ID' AND module_id = 'MODULE_ID';

-- If missing, create manually (see Step 3)
```

---

### **Issue: Dashboard shows 0 courses despite enrollments**

**Cause**: RLS policy blocking the JOIN

**Fix**:
```sql
-- Test query manually:
SELECT 
  ce.*,
  mm.title
FROM course_enrollments ce
LEFT JOIN marketplace_modules mm ON mm.id = ce.module_id
WHERE ce.user_id = 'USER_ID';

-- If this works but dashboard doesn't, check:
-- 1. Browser cache (hard refresh)
-- 2. Server logs (Vercel function logs)
-- 3. Re-run FIX-ALL-CRITICAL-ISSUES.sql
```

---

### **Issue: "Failed to create review" 500 error**

**Cause**: module_reviews table doesn't exist OR RLS blocking

**Fix**:
1. Re-run `FIX-ALL-CRITICAL-ISSUES.sql`
2. Verify table exists:
   ```sql
   SELECT * FROM module_reviews LIMIT 1;
   ```
3. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'module_reviews';
   ```

---

## 📊 **Verification Checklist**

After running all fixes:

### **Database Checks**:
- [ ] module_reviews table exists
- [ ] course_enrollments has data for user
- [ ] marketplace_modules has published modules
- [ ] RLS policies exist for all 3 tables

### **User Experience Checks**:
- [ ] User can log in
- [ ] Dashboard shows enrolled modules
- [ ] Can click into module and see lessons
- [ ] Can navigate to module detail page
- [ ] Can see reviews section
- [ ] Can create review (if enrolled)
- [ ] Review appears immediately after creation

---

## 🚀 **Expected Timeline**

| Step | Time | Status |
|------|------|--------|
| 1. Run CHECK-USER-ENROLLMENTS.sql | 2 min | Diagnostic |
| 2. Run FIX-ALL-CRITICAL-ISSUES.sql | 2 min | Fix RLS |
| 3. Manual enrollment (if needed) | 3 min | Fix data |
| 4. Test review system | 2 min | Verify |
| 5. Test dashboard | 2 min | Verify |
| **Total** | **11 min** | - |

---

## 🔍 **Root Cause Analysis**

### **Review System Failure**:

**Why**: `create-review-system-FIXED.sql` wasn't run OR `module_reviews` table corrupted

**How it happened**: 
- Original `create-review-system.sql` had index creation errors
- Fixed version was created but may not have been run
- OR table was partially created and needs recreation

**Permanent Fix**: Always use DROP TABLE IF EXISTS before CREATE TABLE

---

### **Dashboard Not Showing Courses**:

**Possible Causes**:
1. **RLS Policy**: marketplace_modules table not readable by authenticated users
2. **JOIN Failure**: Foreign key mismatch (course_id vs module_id confusion)
3. **Enrollment Missing**: Webhook failed to create enrollment
4. **NULL Values**: purchased_at NULL causing ORDER BY to fail

**Permanent Fix**: 
- Robust RLS policies
- Better webhook error handling
- Enrollment verification after purchase
- Fallback ordering (ORDER BY created_at if purchased_at is NULL)

---

## 📞 **If Still Not Working**

### **Gather This Info**:

1. **User email**: punkys@crowdconscious.app
2. **Output of CHECK-USER-ENROLLMENTS.sql** (all steps)
3. **Browser console errors** (F12 → Console tab)
4. **Supabase logs** (Dashboard → Logs)
5. **Stripe payment ID** (if available)

### **Check These Logs**:

**Vercel Function Logs**:
1. Go to Vercel Dashboard
2. Project → Functions
3. Filter by `/api/webhooks/stripe`
4. Look for recent invocations
5. Check for errors

**Supabase Logs**:
1. Go to Supabase Dashboard
2. Logs → Postgres Logs
3. Filter by table: `course_enrollments`
4. Look for INSERT failures

---

## ✅ **Success Criteria**

You'll know everything is fixed when:

1. ✅ `CHECK-USER-ENROLLMENTS.sql` shows enrollments with module_id
2. ✅ Dashboard displays enrolled modules immediately after login
3. ✅ Review form submits successfully
4. ✅ Review appears on module page immediately
5. ✅ No errors in browser console
6. ✅ No RLS errors in Supabase logs

---

## 📚 **Reference Files**

| File | Purpose | When to Use |
|------|---------|-------------|
| `CHECK-USER-ENROLLMENTS.sql` | Diagnostic | Always run first |
| `FIX-ALL-CRITICAL-ISSUES.sql` | System fix | Always run second |
| `MANUAL-FIX-ENROLLMENT.sql` | Data fix | Only if enrollments missing |
| `create-review-system-FIXED.sql` | Alternative | If FIX-ALL-CRITICAL doesn't work |

---

## 🎯 **Action Plan Summary**

1. **RUN**: `CHECK-USER-ENROLLMENTS.sql` → Identify issue
2. **RUN**: `FIX-ALL-CRITICAL-ISSUES.sql` → Fix system
3. **IF NEEDED**: `MANUAL-FIX-ENROLLMENT.sql` → Fix data
4. **TEST**: Review creation + Dashboard loading
5. **VERIFY**: User can access courses

**Estimated Total Time**: 10-15 minutes

---

_Created: November 10, 2025_  
_For: Francisco Blockstrand_  
_Status: Ready to Execute_

