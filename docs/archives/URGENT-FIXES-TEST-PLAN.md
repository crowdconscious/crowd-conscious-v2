# Urgent Fixes - Testing Plan

> **Date:** October 30, 2025 (Evening)
> **Issues Fixed:** Routing bugs and progress tracking
> **Status:** ✅ Fixes committed, ready to test

---

## 🐛 **Bugs That Were Fixed**

### 1. ✅ Admin routing to employee portal blocked
**Problem:** Admins clicking "Continuar Mi Capacitación" were redirected back to main dashboard  
**Cause:** Employee portal layout only allowed `corporate_role === 'employee'`  
**Fix:** Now allows both 'admin' and 'employee' roles

### 2. ✅ Progress not saving for employees
**Problem:** Employees completing lessons showed 0% progress  
**Cause:** API was trying to update non-existent `last_accessed_at` column  
**Fix:** Removed the problematic column from update query

### 3. ✅ Smart routing not working for other users
**Problem:** User (salinas.menendez@gmail.com) clicking Corporate Training went to landing page  
**Cause:** HeaderClient and MobileNavigation checking boolean `true` but database had string `"true"`  
**Fix:** Now handles both boolean `true` and string `"true"`

---

## 📋 **Testing Checklist**

### **Part 1: Run Diagnostic SQL**

Run this first to see your current state:

```sql
-- Run in Supabase SQL Editor
-- This shows all user profiles and enrollments

-- 1. Check your admin profile
SELECT 
  'YOUR ADMIN PROFILE' as section,
  id,
  email,
  full_name,
  is_corporate_user,
  corporate_role,
  corporate_account_id
FROM profiles
WHERE email = 'francisco.blockstrand@gmail.com';

-- 2. Check other user profile
SELECT 
  'OTHER USER PROFILE' as section,
  id,
  email,
  full_name,
  is_corporate_user,
  corporate_role,
  corporate_account_id
FROM profiles
WHERE email = 'salinas.menendez@gmail.com';

-- 3. Check ALL enrollments
SELECT 
  'ALL ENROLLMENTS' as section,
  ce.id,
  p.email,
  p.corporate_role,
  c.title as course_name,
  ce.status,
  ce.completion_percentage,
  ce.modules_completed,
  ce.xp_earned
FROM course_enrollments ce
JOIN profiles p ON p.id = ce.employee_id
JOIN courses c ON c.id = ce.course_id
WHERE ce.corporate_account_id = (
  SELECT corporate_account_id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com'
)
ORDER BY ce.created_at DESC;
```

**Expected Results:**
- Your admin profile should show `is_corporate_user = true` (or "true") and `corporate_role = 'admin'`
- Other user should show their corporate settings
- Enrollments should exist with current progress

---

### **Part 2: Fix User Profiles (If Needed)**

If `salinas.menendez@gmail.com` doesn't have proper settings, run:

```sql
-- Option A: Make them admin of your corporate account (for testing)
UPDATE profiles
SET 
  is_corporate_user = true,
  corporate_role = 'admin',
  corporate_account_id = (SELECT corporate_account_id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com')
WHERE email = 'salinas.menendez@gmail.com';

-- Then enroll them
INSERT INTO course_enrollments (
  employee_id,
  corporate_account_id,
  course_id,
  status,
  completion_percentage,
  modules_completed,
  xp_earned
)
SELECT
  p.id,
  p.corporate_account_id,
  'a1a1a1a1-1111-1111-1111-111111111111'::uuid,
  'not_started',
  0,
  0,
  0
FROM profiles p
WHERE p.email = 'salinas.menendez@gmail.com'
AND p.is_corporate_user = true
ON CONFLICT (employee_id, course_id) DO NOTHING;
```

---

### **Part 3: Deploy to Vercel**

```bash
cd /Users/franciscoblockstrand/Desktop/crowd-conscious-v2
git push
```

**Wait for Vercel to deploy** (~2-3 minutes)

---

### **Part 4: Test as Admin (francisco.blockstrand@gmail.com)**

#### Test 1: Corporate Dashboard → Employee Portal
1. ✅ Login at `https://crowdconscious.app/login`
2. ✅ You should see corporate dashboard at `/corporate/dashboard`
3. ✅ Purple progress card should show at top (if enrolled)
4. ✅ Click "Continuar Mi Capacitación" button
5. ✅ **Should route to `/employee-portal/dashboard`** (NOT back to main dashboard!)
6. ✅ You should see "Aire Limpio para Todos" module
7. ✅ Click "Iniciar Módulo" → Should see lessons

#### Test 2: Complete a Lesson (Progress Saving)
1. ✅ Click on "Lección 1"
2. ✅ Read content and fill out activities
3. ✅ Click "Completar Lección"
4. ✅ Should see XP popup (250 XP)
5. ✅ Return to `/employee-portal/dashboard`
6. ✅ **Progress bar should show 33%** (1/3 lessons)
7. ✅ XP should show 250

#### Test 3: Return to Corporate Dashboard
1. ✅ Click "🌍 Ir a Comunidad" in employee portal header
2. ✅ Should go to main dashboard at `/dashboard`
3. ✅ Corporate banner should show at top
4. ✅ Click banner link → Should go to `/corporate/dashboard`
5. ✅ **Progress card should now show 33% completed!**

---

### **Part 5: Test as Other User (salinas.menendez@gmail.com)**

#### Test 1: Smart Routing from Main Dashboard
1. ✅ Login at `https://crowdconscious.app/login`
2. ✅ Should see main dashboard at `/dashboard`
3. ✅ Corporate banner should show at top (if they're corporate)
4. ✅ Click banner → Should go to their corporate dashboard (NOT landing page!)

#### Test 2: Header Navigation
1. ✅ Click "🎓 Corporate Training" in top navigation
2. ✅ **Should route to `/corporate/dashboard` or `/employee-portal/dashboard`**
3. ✅ Should NOT go to `/concientizaciones` landing page

#### Test 3: Mobile Navigation (if on mobile)
1. ✅ Click "Training" tab in bottom nav
2. ✅ Should route correctly based on role

---

### **Part 6: Test as Employee (tjockis88@hotmail.com)**

#### Test 1: Employee Portal Access
1. ✅ Login at `https://crowdconscious.app/login`
2. ✅ Should auto-route to `/employee-portal/dashboard`
3. ✅ Should see modules assigned

#### Test 2: Complete Multiple Lessons
1. ✅ Complete Lección 1 → Progress should show 33%
2. ✅ Complete Lección 2 → Progress should show 66%
3. ✅ Complete Lección 3 → Progress should show 100%
4. ✅ Return to dashboard → Should show "Completado" badge
5. ✅ Certificate should be available

#### Test 3: Admin Can View Employee Progress
1. ✅ Login as admin (francisco.blockstrand@gmail.com)
2. ✅ Go to `/corporate/progress`
3. ✅ Should see employee (tjockis88@hotmail.com) in table
4. ✅ **Progress should show correctly (not 0%!)**
5. ✅ XP should be visible
6. ✅ Recent responses section should show completed lessons

---

## ✅ **Success Criteria**

All these must pass:

- [ ] Admin can access employee portal without being redirected
- [ ] Admin progress card shows on corporate dashboard
- [ ] Employee lesson completion saves progress (not stuck at 0%)
- [ ] Progress percentage updates correctly (33% → 66% → 100%)
- [ ] XP accumulates correctly
- [ ] Other corporate users route to correct dashboards
- [ ] "Corporate Training" links work for all user types
- [ ] No more redirects to landing page for logged-in corporate users

---

## 🚨 **If Something Still Doesn't Work**

### Issue: Admin still redirected from employee portal
**Check:**
```sql
SELECT corporate_role FROM profiles WHERE email = 'francisco.blockstrand@gmail.com';
```
**Should be:** `'admin'`

---

### Issue: Progress still not saving
**Check:**
1. Open browser console (F12)
2. Complete a lesson
3. Look for errors in Network tab
4. Check if POST to `/api/corporate/progress/complete-lesson` returns success

**Run this to verify database:**
```sql
SELECT * FROM course_enrollments 
WHERE employee_id = (SELECT id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com');
```

---

### Issue: Routing still broken for other user
**Check:**
```sql
SELECT is_corporate_user, corporate_role FROM profiles WHERE email = 'salinas.menendez@gmail.com';
```

**If `is_corporate_user` is NULL or FALSE:**
```sql
UPDATE profiles 
SET is_corporate_user = true, corporate_role = 'admin'
WHERE email = 'salinas.menendez@gmail.com';
```

---

## 📊 **Expected Database State After Testing**

Run this to verify everything worked:

```sql
-- Should show progress for all users
SELECT 
  p.email,
  p.corporate_role,
  ce.completion_percentage,
  ce.modules_completed,
  ce.xp_earned,
  ce.status
FROM course_enrollments ce
JOIN profiles p ON p.id = ce.employee_id
WHERE ce.corporate_account_id = (
  SELECT corporate_account_id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com'
)
ORDER BY ce.updated_at DESC;
```

**Should show:**
- Admin with some progress if tested
- Employee (tjockis88@hotmail.com) with progress
- All percentages > 0 if lessons completed

---

## 🎉 **When All Tests Pass**

1. ✅ Take screenshots of working progress
2. ✅ Note any remaining issues
3. ✅ Ready to proceed to Phase 2!

---

**Test completed by:** _______________________  
**Date:** _______________________  
**All tests passed:** ☐ YES  ☐ NO (see notes below)  

**Notes:**
_________________________________________________________
_________________________________________________________
_________________________________________________________

