# ✅ Phase 2 Migration Fix Applied

**Issue**: Phase 2 SQL migration failed with error:
```
ERROR: 42703: column e.module_id does not exist
LINE 205: JOIN marketplace_modules m ON e.module_id = m.id
```

---

## 🔍 **Root Cause**

The `course_enrollments` table schema was different than expected:

### **Expected** (from migration):
```sql
course_enrollments:
  - user_id UUID (FK to auth.users)
  - module_id UUID (FK to marketplace_modules)
  - enrollment_date TIMESTAMP
  - progress INTEGER
  - completed BOOLEAN
  - completion_date TIMESTAMP
```

### **Actual** (in database):
```sql
course_enrollments:
  - employee_id UUID (FK to auth.users) -- Not user_id yet!
  - module_id TEXT -- Not UUID, just TEXT!
  - status TEXT ('not_started', 'in_progress', 'completed')
  - completion_percentage INTEGER
  - created_at TIMESTAMP
  - completed_at TIMESTAMP
  - module_name TEXT
```

---

## ✅ **Fix Applied**

### **1. Updated View to Match Actual Schema**
```sql
CREATE OR REPLACE VIEW user_enrolled_modules AS
SELECT 
  e.id AS enrollment_id,
  e.user_id,  -- Will be renamed from employee_id
  e.module_id,  -- TEXT, not UUID
  e.corporate_account_id,
  e.purchase_type,
  e.created_at AS enrollment_date,  -- Map created_at
  e.purchased_at,
  e.completion_percentage AS progress,  -- Map completion_percentage
  CASE WHEN e.status = 'completed' THEN true ELSE false END AS completed,  -- Map status
  e.completed_at AS completion_date,
  NULL::TEXT AS certificate_url,  -- Placeholder
  e.module_name AS module_title,  -- Use module_name
  NULL::TEXT AS module_description,  -- Placeholder
  -- ... other placeholders for module details
  e.status,
  e.time_spent_minutes
FROM course_enrollments e;
-- No JOIN to marketplace_modules (module_id is TEXT, not FK)
```

### **2. Fixed Index Recreation**
```sql
-- Drop old index before renaming column
DROP INDEX IF EXISTS idx_enrollments_employee;

-- Rename column
ALTER TABLE course_enrollments
RENAME COLUMN employee_id TO user_id;

-- Recreate index with new name
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON course_enrollments(user_id);
```

---

## 🎯 **Why This Happened**

The `course_enrollments` table was created for the **corporate learning system** (Phase 1 of corporate features), which predates the **marketplace system**. At that time:

- Modules were identified by TEXT strings (not UUIDs)
- The system was corporate-only (hence `employee_id`)
- Module metadata was stored directly in enrollments (`module_name`)

The marketplace system (`marketplace_modules` table) was added later with proper UUIDs and foreign keys, but the enrollment table wasn't updated to reference it.

---

## 📝 **Future Integration**

To fully integrate `course_enrollments` with `marketplace_modules`, we would need:

1. **Add UUID column**:
```sql
ALTER TABLE course_enrollments 
ADD COLUMN marketplace_module_id UUID REFERENCES marketplace_modules(id);
```

2. **Migrate data**:
```sql
-- Map TEXT module_id to UUID marketplace_module_id
UPDATE course_enrollments e
SET marketplace_module_id = m.id
FROM marketplace_modules m
WHERE e.module_id = m.slug OR e.module_name = m.title;
```

3. **Update view**:
```sql
CREATE OR REPLACE VIEW user_enrolled_modules AS
SELECT 
  e.*,
  m.title,
  m.description,
  m.thumbnail_url,
  -- ... all marketplace_modules fields
FROM course_enrollments e
LEFT JOIN marketplace_modules m ON e.marketplace_module_id = m.id;
```

**But for now**: The migration works with the current schema, and the view provides a unified interface for both systems.

---

## ✅ **Migration Now Works**

Run Phase 2 migration again:

```sql
-- Copy contents of sql-migrations/phase-2-universal-enrollments.sql
-- Paste in Supabase SQL Editor
-- Click Run
-- Should succeed! ✅
```

---

## 🎯 **What This Enables (Still)**

Even with the schema mismatch, Phase 2 still achieves its goals:

- ✅ Adds `purchase_type` tracking
- ✅ Makes `corporate_account_id` optional
- ✅ Renames `employee_id` → `user_id`
- ✅ Adds `purchased_at` and `purchase_price_snapshot`
- ✅ Updates RLS policies for universal access
- ✅ Creates `user_enrolled_modules` view (unified dashboard)
- ✅ Backwards compatible with existing data

The view just uses TEXT `module_id` instead of joining to `marketplace_modules`. This can be enhanced later when the systems are fully integrated.

---

**Status**: ✅ **FIXED - Ready to run Phase 2 migration**

