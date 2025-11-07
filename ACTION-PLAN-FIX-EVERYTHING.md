# 🚀 Complete Action Plan: Fix Enrollments & Standardize Modules

**Date:** November 7, 2025  
**Status:** Ready to Execute  
**Priority:** 🔴 CRITICAL

---

## 🎯 **The Goal**

Make ALL module enrollments work correctly by:
1. ✅ Standardizing module names (database = frontend = marketplace)
2. ✅ Removing 6 duplicate modules (11 → 5)
3. ✅ Fixing enrollment schema (course_id + module_id)
4. ✅ Testing end-to-end

---

## 📋 **Execute These Scripts IN ORDER**

### **Step 1: Standardize Module Names** ⭐ **START HERE**

**File:** `STANDARDIZE-MODULE-NAMES.sql`

**What it does:**
- Renames all modules to marketplace-friendly names:
  - ✅ "Estrategias Avanzadas de Calidad del Aire" (clean_air)
  - ✅ "Gestión Sostenible del Agua" (clean_water)
  - ✅ "Ciudades Seguras y Espacios Inclusivos" (safe_cities)
  - ✅ "Economía Circular: Cero Residuos" (zero_waste)
  - ✅ "Comercio Justo y Cadenas de Valor" (fair_trade)
- Keeps modules WITH lessons (enriched content)
- Deletes ALL duplicates (removes 6 modules)

**Expected result:**
```
Before: 11 modules (4 clean_air, 2 clean_water, 2 zero_waste, etc.)
After:  5 modules (1 per core_value)
```

**How to run:**
1. Open Supabase SQL Editor
2. Copy entire `STANDARDIZE-MODULE-NAMES.sql`
3. Click "Run"
4. Wait for "COMMIT successful"
5. Check results in output

---

### **Step 2: Enroll in All Modules**

**File:** `ENROLL-AFTER-STANDARDIZATION.sql`

**What it does:**
- Enrolls you in ALL 5 modules
- Uses BOTH `course_id` AND `module_id` (fixes the schema issue!)
- Uses standardized module names

**Expected result:**
```
5 new enrollments created for francisco.blockstrand@gmail.com
```

**How to run:**
1. Open Supabase SQL Editor
2. Copy entire `ENROLL-AFTER-STANDARDIZATION.sql`
3. Click "Run"
4. You should see 5 RETURNING rows (one per module)

---

### **Step 3: Verify Dashboard**

**What to check:**
1. Go to `crowdconscious.app/employee-portal`
2. You should see ALL 5 modules:
   - ✅ Estrategias Avanzadas de Calidad del Aire
   - ✅ Gestión Sostenible del Agua
   - ✅ Ciudades Seguras y Espacios Inclusivos
   - ✅ Economía Circular: Cero Residuos
   - ✅ Comercio Justo y Cadenas de Valor

**If modules still don't show:**
- Run diagnostic: `SELECT * FROM course_enrollments WHERE user_id = (SELECT id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com');`
- Check if `course_id` is populated
- Check if `module_id` matches a real module UUID

---

### **Step 4: Fix Webhook (If Needed)**

**Only do this if Step 3 works but future purchases don't!**

**File to edit:** `app/api/webhooks/stripe/route.ts`

**What to fix:**
Find where enrollments are created and ensure BOTH fields are set:

```typescript
// ❌ BEFORE (BROKEN):
await supabase.from('course_enrollments').insert({
  user_id: userId,
  module_id: moduleId,  // Only setting module_id!
  // ...
})

// ✅ AFTER (FIXED):
await supabase.from('course_enrollments').insert({
  user_id: userId,
  course_id: moduleId,  // ⚠️ Set BOTH!
  module_id: moduleId,  // ⚠️ Same UUID!
  // ...
})
```

---

## 📊 **Problem Summary**

### **What We Found:**

1. **Schema Mismatch**
   - Unique constraint on `(user_id, course_id)`
   - But webhook only set `module_id`
   - Result: Enrollments failed OR created but invisible

2. **11 Duplicate Modules**
   - 4x clean_air (2 "Aire Limpio" + 2 "Estrategias Avanzadas")
   - 2x clean_water (both "Gestión Sostenible")
   - 2x zero_waste (both "Economía Circular")
   - Caused confusion in marketplace & enrollments

3. **Name Mismatches**
   - Database: "Aire Limpio: El Despertar Corporativo"
   - Frontend: "Estrategias Avanzadas de Calidad del Aire"
   - Enriched content: "El Pozo se Seca" vs "Gestión Sostenible"

### **Why Purchases Didn't Show:**

```mermaid
User → Stripe Checkout ✅
  → Webhook Triggered ✅
    → Enrollment Created ❌ (only module_id, missing course_id)
      → Unique Constraint FAILS ❌
        OR
      → Enrollment Exists BUT Dashboard JOINs on NULL course_id ❌
        → "No Courses Found" ❌
```

---

## ✅ **What's Fixed:**

| Issue | Before | After | Status |
|-------|--------|-------|--------|
| Module count | 11 modules | 5 modules | ✅ Script ready |
| Duplicate names | 4x "Aire Limpio" variants | 1x "Estrategias Avanzadas..." | ✅ Script ready |
| Schema issue | Only `module_id` set | Both `course_id` + `module_id` set | ✅ Script ready |
| Name consistency | DB ≠ Frontend | DB = Frontend = Marketplace | ✅ Script ready |
| Documentation | Outdated schema | Real production schema | ✅ Updated |

---

## 🔍 **Verification Commands**

### **Check Module Count:**
```sql
SELECT core_value, COUNT(*) as count
FROM marketplace_modules
WHERE status = 'published'
GROUP BY core_value
ORDER BY core_value;
```
**Expected:** 5 rows, all with count = 1

### **Check Your Enrollments:**
```sql
SELECT 
  ce.id,
  mm.title,
  ce.course_id IS NOT NULL as has_course_id,
  ce.module_id IS NOT NULL as has_module_id,
  ce.status,
  ce.progress_percentage
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id = (SELECT id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com')
ORDER BY ce.created_at DESC;
```
**Expected:** All rows show `has_course_id = true` AND `has_module_id = true`

### **Check for Duplicates:**
```sql
SELECT 
  core_value, 
  COUNT(*) as module_count,
  string_agg(title, ' | ') as titles
FROM marketplace_modules
WHERE status = 'published'
GROUP BY core_value
HAVING COUNT(*) > 1;
```
**Expected:** 0 rows (no duplicates)

---

## 📁 **Files Created:**

| File | Purpose | Run Order |
|------|---------|-----------|
| `STANDARDIZE-MODULE-NAMES.sql` | Rename & deduplicate modules | 1️⃣ First |
| `ENROLL-AFTER-STANDARDIZATION.sql` | Enroll you in all modules | 2️⃣ Second |
| `DIAGNOSE-MODULES-AND-SCHEMA.sql` | Check current state (diagnostic) | 🔍 Anytime |
| `CHECK-MODULE-NAME-MISMATCHES.sql` | Find naming issues (diagnostic) | 🔍 Anytime |
| `PLATFORM-MASTER-DOCUMENTATION.md` | Updated schema docs | 📖 Reference |
| `ACTION-PLAN-FIX-EVERYTHING.md` | This file! | 📋 Guide |

---

## 🎓 **Success Criteria:**

After running Steps 1 & 2, you should have:

✅ **Dashboard shows 5 modules**  
✅ **All have correct marketplace names**  
✅ **No "Cargando..." or missing courses**  
✅ **Click any module → lessons load**  
✅ **Progress tracks correctly**  
✅ **Certificates generate after completion**  

---

## 🆘 **If Something Goes Wrong:**

### **"Query failed" error:**
- Check if BEGIN/COMMIT syntax is supported
- Try running each UPDATE/DELETE individually
- Check for foreign key constraints

### **Enrollments still don't show:**
- Verify `course_id` is set: `SELECT course_id, module_id FROM course_enrollments WHERE user_id = 'YOUR_ID';`
- Check dashboard JOIN query uses correct field
- Look for RLS policy blocking SELECT

### **Modules got deleted accidentally:**
- Restore from backup if available
- Re-run `COMPLETE-DATABASE-SETUP.sql` to recreate base modules
- Re-run enrichment SQLs for content

---

## 🚀 **Ready to Execute?**

1. ✅ Save all open files
2. ✅ Open Supabase SQL Editor
3. ✅ Run `STANDARDIZE-MODULE-NAMES.sql`
4. ✅ Run `ENROLL-AFTER-STANDARDIZATION.sql`
5. ✅ Refresh `crowdconscious.app/employee-portal`
6. ✅ Celebrate! 🎉

---

**Questions?** Check `PLATFORM-MASTER-DOCUMENTATION.md` for schema reference.

