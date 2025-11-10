# ⚡ Quick Fix Reference Card

**Last Updated**: November 10, 2025  
**Total Time**: 35 minutes

---

## 🔴 3 SQL Scripts to Run (IN ORDER!)

### 1️⃣ **URGENT-FIX-XP-TRACKING.sql** (5 min)
**Fixes**: 0 XP issue, certificate mismatch  
**Run in**: Supabase SQL Editor  
**Result**: All enrollments show correct XP (50 per lesson)

### 2️⃣ **FIX-LESSON-COUNTS.sql** (3 min)
**Fixes**: 120% progress bug  
**Run in**: Supabase SQL Editor  
**Result**: All progress ≤ 100%

### 3️⃣ **FIX-XP-STANDARDIZATION.sql** (3 min)
**Fixes**: Inconsistent XP (90, 265, 575)  
**Run in**: Supabase SQL Editor  
**Result**: All XP = multiples of 50

---

## ✅ After SQL: Refresh & Test

1. **Hard Refresh All Pages**: `Ctrl+Shift+R` (Win) or `Cmd+Shift+R` (Mac)

2. **Employee Portal** (`/employee-portal/dashboard`):
   - ✅ All modules show XP > 0
   - ✅ Progress ≤ 100%
   - ✅ Certificates match dashboard

3. **ESG Reports** (`/employee-portal/mi-impacto`):
   - ✅ Shows 5 reports (not 3!)
   - ✅ Can download PDF/Excel

4. **Corporate ESG** (`/corporate/esg-reports`): 🆕
   - ✅ Company metrics visible
   - ✅ Impact aggregation works
   - ✅ Can download corporate reports

---

## 🎯 Expected Results

| Before | After |
|--------|-------|
| 0 XP | 300 XP (6 lessons) |
| 120% progress | 100% progress |
| 3 ESG reports | 5 ESG reports |
| No corporate ESG | Full ESG dashboard |

---

## 📁 Where to Go

### Employee:
- Dashboard: `/employee-portal/dashboard`
- ESG Reports: `/employee-portal/mi-impacto`
- Courses: `/employee-portal/courses`

### Corporate Admin:
- Dashboard: `/corporate/dashboard`
- **ESG Reports**: `/corporate/esg-reports` 🆕
- Employees: `/corporate/employees`
- Progress: `/corporate/progress`

---

## 🆘 If Something's Wrong

**XP still 0?**
→ Run SQL again, hard refresh

**120% still showing?**
→ Run FIX-LESSON-COUNTS.sql again

**Only 3 reports?**
→ Hard refresh ESG page

**Corporate page error?**
→ Check you're on corporate account

---

## 📊 Quick Status Check

Run this in Supabase to verify:

```sql
-- Check XP is fixed
SELECT 
  COUNT(*) as broken_count
FROM course_enrollments
WHERE xp_earned = 0 
  AND progress_percentage > 0;
-- Should return 0

-- Check no progress > 100%
SELECT 
  COUNT(*) as over_100_count  
FROM course_enrollments
WHERE progress_percentage > 100;
-- Should return 0
```

---

## ✅ Success = All Green

- ✅ No 0 XP
- ✅ No 120% progress
- ✅ 5 ESG reports visible
- ✅ Corporate ESG works
- ✅ PDF downloads work

---

**Need detailed help?** → See `FINAL-ACTION-PLAN-ALL-FIXES.md`

